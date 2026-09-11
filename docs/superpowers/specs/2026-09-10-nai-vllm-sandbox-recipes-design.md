# NAI vLLM Sandbox Recipes — Design

**Date:** 2026-09-10
**Status:** Approved for implementation planning

## Summary

A public web application, inspired by recipes.vllm.ai, where people share
working configurations for running Hugging Face models in the **NAI vLLM
Sandbox**. A submitter signs in with GitHub (for identity only), fills out a
structured form describing the model, the vLLM engine source, the arguments,
the environment variables, the hardware, and any advanced NAI settings they
used, and writes a free-form notes section. On submit, a backend service
serializes the submission to a structured Markdown file and opens a pull
request against the project repo from a shared **bot account**, crediting the
submitter's verified GitHub handle. A maintainer reviews and merges the PR;
merge to `main` triggers a static rebuild and the recipe goes live. Visitors
browse a statically generated, client-side searchable and filterable index.

There is **no database**. The application holds exactly one secret (the bot
token). A single Zod schema is the contract shared by the form, the submit
API, the build-time loader, and CI.

## Goals

- Let anyone contribute a working NAI vLLM Sandbox recipe with minimal
  friction — no GitHub write permissions, no PR mechanics.
- Keep every recipe reviewable as a normal pull request with a readable diff.
- Make recipes easy to find (search + filter) and easy to reuse (copyable
  config blocks).
- Stay resilient to NAI product changes by modeling NAI-specific options as
  optional structured blocks rather than a rigid reveal-tree.

## Non-goals (v1)

- No automated verification that a recipe actually runs.
- No verification that the Hugging Face model URL resolves (reviewer's job;
  optional soft check later).
- No "export as NAI config" / one-click paste-into-sandbox action.
- No in-app moderation queue or approval UI — review happens in the PR.
- No comments, ratings, or user profiles.

## Key decisions

| Area | Decision |
| --- | --- |
| Ingestion | Hybrid: form -> GitHub API -> structured content file -> bot-opened PR -> static rebuild |
| PR identity | One bot token opens all PRs; submitter's GitHub handle credited in the PR body |
| Auth | GitHub OAuth for **identity only** (`read:user`); verified handle used for attribution and blocking |
| Stack | Next.js (App Router) on Vercel; one repo for site code + recipe content |
| Form structure | Engine sources + args/env/hardware modeled as structured fields; NAI-specific toggles as an optional `nai_advanced` block |
| Content format | Markdown file with YAML frontmatter (structured config) + Markdown body (notes) |
| Browse | Statically generated pages; client-side search + filters (small dataset) |
| Persistence | None. No database. One secret: the bot token, in Vercel env only. |

## Architecture

One Next.js App Router application on Vercel, one GitHub repo containing both
the site code and the recipe content.

```
/app
  /page.tsx                     # browse index (client-side search + filters)
  /recipes/[slug]/page.tsx      # recipe detail (statically generated)
  /submit/page.tsx              # submission form (requires GitHub login)
  /api/auth/[...nextauth]/route.ts   # GitHub OAuth (Auth.js, GitHub provider, JWT session, no DB)
  /api/submit/route.ts          # validates payload, creates branch+file+PR via bot token
/recipes/*.md                   # content: YAML frontmatter + Markdown notes
/config/blocklist.json          # blocked GitHub handles consulted by /api/submit
/lib
  /schema.ts                    # single Zod schema = source of truth for a recipe
  /recipes.ts                   # load + parse + validate all /recipes/*.md at build time
  /serialize.ts                 # recipe object <-> Markdown (frontmatter + notes)
  /slug.ts                      # slug derivation + collision suffixing
  /github.ts                    # bot PR creation (Octokit)
  /ratelimit.ts                 # per-session + per-IP counters
/scripts/validate-recipes.ts    # CI check: every recipe file matches the schema
/.github/workflows/validate.yml # runs validate-recipes on every PR
```

### Data flow

1. Visitor browses statically built pages generated from `/recipes/*.md` at
   build time.
2. Submitter signs in with GitHub — identity only. A signed, `httpOnly`
   session cookie holds `{ login, id, avatar_url }`. No write scope is ever
   requested from the user.
3. The form POSTs structured JSON to `/api/submit`.
4. `/api/submit` re-validates against the Zod schema, injects server-set
   fields, computes a slug, serializes to a `.md` file, and — using the bot
   token — creates a branch, commits the file, and opens a PR crediting
   `@submitter-handle`.
5. A maintainer reviews and merges the PR. Merge to `main` triggers a Vercel
   production rebuild; the recipe goes live.

### Key properties

- Exactly one secret (the bot token) in Vercel env, used only in
  `/api/submit`, never shipped to the client, never written into a recipe
  file.
- No database anywhere.
- The Zod schema in `/lib/schema.ts` is the single contract shared by the
  form, the submit API, the build-time loader, and CI.

## Recipe file format

Each recipe is `/recipes/<slug>.md`: YAML frontmatter for structured config,
Markdown body for notes.

```yaml
---
# --- Identity (fields marked (server) are injected by /api/submit and are
#     not user-editable; a client-supplied value is ignored) ---
model: meta-llama/Llama-3.3-70B-Instruct     # Hugging Face repo id "org/name"
title: Llama 3.3 70B Instruct on 4xH100      # optional display name
submitted_by: laura-m                         # (server) verified GitHub handle from session
submitted_at: 2026-09-10                      # (server) ISO date
nai_version: "2.8"                            # NAI sandbox version the recipe ran on

# --- Engine ---
engine_source: nai                           # nai | community-vllm-registry | other-registry
engine_tag: v0.28.0                           # required iff engine_source == community-vllm-registry; forbidden otherwise
engine_image_url: ~                           # required iff engine_source == other-registry; forbidden otherwise
kv_cache_aware_routing: false                 # applies to all three engine sources

# --- What made it run ---
vllm_args:                                    # ordered list of raw CLI arg strings
  - --dtype bfloat16
  - --max-model-len 25600
env_vars:                                     # map; keys must match ^[A-Z_][A-Z0-9_]*$
  VLLM_CPU_KVCACHE_SPACE: "8"

# --- Hardware ---
hardware:
  gpu_model: H100-80GB                        # required
  gpu_count: 4                                # required, positive integer
  node_allocation: single                     # required: single | multi
  instances: 1                                # required, positive integer
  vcpus_per_instance: 32                      # required, positive integer
  host_memory_per_instance_gib: 256           # required, positive number

# --- Advanced NAI settings (optional; valid only when engine_source == nai) ---
nai_advanced:
  kv_cache_offloading:
    enabled: true
    offloading_tier: cpu-memory               # enum; only value in NAI 2.8
    memory_per_accelerator_gib: 8
  speculative_decoding:
    enabled: true
    method: n-gram                            # enum; only value in NAI 2.8
    speculation_length_tokens: 5
    max_prompt_lookup_tokens: 4
---

## Notes

Free Markdown. What was tricky, why these flags were needed, throughput
observed, gotchas.
```

### Field reference

- **`model`** (required) — Hugging Face repo id, `^[\w.-]+/[\w.-]+$`. The
  form accepts either a full `https://huggingface.co/org/name` URL or the
  bare `org/name` and normalizes to `org/name`.
- **`title`** (optional) — display name; falls back to `model` if absent.
- **`submitted_by`, `submitted_at`** (server-set) — always overwritten by
  `/api/submit` from the session and current date; any client value is
  discarded.
- **`nai_version`** (required) — free-ish string, e.g. `"2.8"`.
- **`engine_source`** (required) — `nai` | `community-vllm-registry` |
  `other-registry`.
  - `community-vllm-registry` uses `docker.io/vllm/vllm-openai` and requires
    **`engine_tag`** (e.g. `v0.28.0`).
  - `other-registry` requires **`engine_image_url`**.
  - `nai` requires neither; both `engine_tag` and `engine_image_url` are
    forbidden (the engine version is captured by `nai_version`).
- **`kv_cache_aware_routing`** (required boolean) — available for all three
  engine sources.
- **`vllm_args`** (optional, default `[]`) — ordered list of raw CLI arg
  strings; each non-empty. Order is preserved. An empty list means the
  recipe relied on platform-provided defaults.
- **`env_vars`** (optional, default `{}`) — string->string map; keys match
  `^[A-Z_][A-Z0-9_]*$`; values coerced to strings.
- **`hardware`** — all fields required: `gpu_model` (non-empty string),
  `gpu_count` (positive integer), `node_allocation` (`single` | `multi`),
  `instances` (positive integer), `vcpus_per_instance` (positive
  integer), `host_memory_per_instance_gib` (positive number). Compute
  configuration (node allocation, instances, vCPUs, memory) applies
  regardless of `engine_source` — see `available_options.md`.
- **`nai_advanced`** (optional object) — only permitted when
  `engine_source == nai`.
  - `kv_cache_offloading`: `enabled` (bool). When `enabled`,
    `offloading_tier` (enum, `cpu-memory` only in 2.8) and
    `memory_per_accelerator_gib` (positive number) apply.
  - `speculative_decoding`: `enabled` (bool). When `enabled`, `method`
    (enum, `n-gram` only in 2.8), `speculation_length_tokens` (positive
    integer, default 5), `max_prompt_lookup_tokens` (positive integer,
    default 4).

### Cross-field validation (Zod refinements)

- `engine_source == community-vllm-registry` => `engine_tag` required;
  `engine_image_url` must be absent.
- `engine_source == other-registry` => `engine_image_url` required;
  `engine_tag` must be absent.
- `engine_source == nai` => both `engine_tag` and `engine_image_url` must be
  absent.
- `nai_advanced` present => `engine_source == nai`, else reject.
- Within `nai_advanced`, tier/length/method fields are only meaningful when
  their parent `enabled` is true; when `enabled` is false the sub-fields are
  ignored on render.
- `model` matches `^[\w.-]+/[\w.-]+$`.
- `gpu_count`, `instances`, `vcpus_per_instance`,
  `*_tokens` are positive integers; `host_memory_per_instance_gib` and
  `memory_per_accelerator_gib` are positive numbers.
- `env_vars` keys match `^[A-Z_][A-Z0-9_]*$`; each `vllm_args` entry is a
  non-empty string.
- `submitted_by` / `submitted_at` supplied by the client are ignored and
  overwritten server-side.

### Slug / filename

Derived by `/api/submit` from the model name plus a hardware disambiguator,
e.g. `meta-llama/Llama-3.3-70B-Instruct` on `4x H100-80GB` ->
`llama-3.3-70b-instruct-4xh100-80gb`. Lowercased, non-alphanumerics collapsed
to `-`. On collision with an existing `/recipes/` file, append `-2`, `-3`,
etc. The filename is `<slug>.md`.

## Submission flow

### Login (identity only)

- `/submit` is gated behind authentication.
- Auth.js with the GitHub provider, `read:user` scope only, JWT session
  strategy, no database adapter.
- On login, `{ login, id, avatar_url }` is stored in a signed session
  cookie (`httpOnly`, `secure`, `sameSite=lax`, Auth.js secret).
- No GitHub write scope is ever requested from the user. A leaked user
  session cannot modify the repo.

### The form (`/app/submit/page.tsx`)

Client component, driven by the Zod schema:

1. Model URL / repo id; optional title; `nai_version`.
2. Engine-source picker. Selecting `community-vllm-registry` reveals
   `engine_tag`; `other-registry` reveals `engine_image_url`; `nai` reveals
   neither.
3. `kv_cache_aware_routing` toggle.
4. **vLLM args**: multi-line textarea, one arg per line, so a block can be
   pasted in at once (order preserved). **Env vars**: multi-line textarea,
   one `KEY=value` per line.
5. Hardware: all fields required — `gpu_model`, `gpu_count`,
   `node_allocation`, `instances`, `vcpus_per_instance`,
   `host_memory_per_instance_gib`.
6. Collapsed "Advanced NAI settings" section, enabled only when
   `engine_source == nai`: KV cache offloading (enabled, tier,
   memory per accelerator), speculative decoding (enabled, method,
   speculation length, max prompt lookup).
7. Notes: Markdown textarea.
8. Live client-side Zod validation; submit disabled until the payload is
   valid. A preview pane renders the generated `.md` file.

### Submit (`POST /api/submit`)

1. Reject with 401 if there is no valid session.
2. Reject with 403 if `session.login` is in `/config/blocklist.json`.
3. Enforce rate limits (see below); 429 on exceed.
4. Re-validate the request body against the same Zod schema server-side.
   422 with field errors on failure. The client form is a convenience, not
   a trust boundary.
5. Inject `submitted_by` from the session and `submitted_at` = today.
6. Compute the slug; fetch `/recipes/` contents via the GitHub API to check
   for collision; add a numeric suffix if needed.
7. Serialize the recipe object to frontmatter + `## Notes` body via
   `/lib/serialize.ts`.
8. With the bot token (Octokit):
   a. Get the `main` branch head SHA.
   b. Create branch `recipe/<slug>`.
   c. Create file `recipes/<slug>.md` on that branch.
   d. Open a PR: title `Add recipe: <model> (<gpu_count>x<gpu_model>)`;
      body containing a summary table, `Submitted by @<login>`, and an
      HTML comment `<!-- submitter-id: <id> -->` for traceability.
9. Respond `{ prUrl }`. The form shows "Submitted -> <PR link>".

If step 8b succeeds but a later step fails, the API logs the orphan branch
name (`recipe/<slug>`) for manual cleanup and returns 502 without leaving a
half-open PR.

### Rate limiting

Per-session and per-IP counters in `/lib/ratelimit.ts` — default 5
submissions per hour. In-memory is acceptable for v1; Vercel KV is the
drop-in if durability across instances is wanted later. Sustained abuse is
handled downstream: maintainers close bad PRs, and a handle can be added to
`/config/blocklist.json`.

## Browse, search, detail

### Build-time load (`/lib/recipes.ts`)

Read every `/recipes/*.md`, parse frontmatter, validate each against the
schema, and **fail the build** on any invalid file (naming the file and the
error). Produce:

- a typed `Recipe[]` for detail pages, and
- a small derived index JSON: `model`, `title`, `engine_source`,
  `gpu_model`, `gpu_count`, `node_allocation`, `kv_cache_aware_routing`,
  `uses_speculative_decoding`, `uses_kv_offloading`, `submitted_by`,
  `submitted_at`, `slug`.

### Index page (`/`, static)

Renders the full list from the index JSON; all filtering is client-side
(dataset is dozens to low hundreds of recipes).

- Text search: substring, case-insensitive, over model id / org / title.
- Filters: engine source, GPU model, GPU count, single vs multi-node, uses
  speculative decoding, uses KV offloading, KV cache aware routing.
- Each row: model, GPU summary, engine-source badge, contributor, date.
- Empty state links to `/submit`.

### Detail page (`/recipes/[slug]`)

`generateStaticParams` over every slug.

- Header: model (linked to Hugging Face), title, `nai_version`, contributor
  + date.
- Engine section: source, `engine_tag` / `engine_image_url` if present,
  `kv_cache_aware_routing`.
- Config blocks with copy buttons: one for vLLM args (one per line,
  matching the submission form's textarea), one for env vars (`KEY=value`
  lines).
- Hardware table.
- Advanced NAI settings, if present.
- Rendered Markdown notes (sanitized pipeline, no raw HTML).
- "Edit / suggest change" link to the file on GitHub.

## Build & CI

- **`/scripts/validate-recipes.ts`** parses and schema-validates every
  recipe file, prints per-file errors, and exits non-zero on any failure.
- **`.github/workflows/validate.yml`** runs that script on every PR, so a
  malformed submission PR fails checks before a maintainer looks at it.
- The same validation runs inside `next build`, so a broken file can never
  reach production even if merged manually.
- Merge to `main` -> Vercel production rebuild -> recipe live. No other
  deploy steps.
- Nice-to-have (later, not v1): a PR comment bot that echoes the parsed
  recipe as a table for easier review.

## Error handling & edge cases

| Failure | Handling |
| --- | --- |
| GitHub API down / token invalid / rate-limited | `/api/submit` returns 502 with a clear message; the form keeps the user's input and offers retry; branch creation is the first write, so a later failure leaves at most an orphan branch (logged), never a half-open PR |
| Slug collision | API appends `-2`, `-3`, ... after checking `/recipes/` contents |
| Duplicate submission (same model + hardware) | Allowed; dedup judgment happens in PR review. Detail pages may show "other recipes for this model" |
| Invalid recipe file merged manually | `next build` fails validation, so the bad file never serves; CI catches it earlier on the PR |
| Malformed / hostile Markdown notes | Rendered through a sanitizing Markdown pipeline with raw HTML disabled |
| Hugging Face URL wrong / 404 | Not verified at submit time (avoids coupling to HF availability); reviewer's responsibility. Optional soft check later |
| OAuth callback error / user denies consent | Redirect back to `/submit` with a dismissible "sign-in needed to submit" banner; browsing is unaffected |
| Blocked handle attempts to submit | 403 from `/api/submit` after the blocklist check |
| Rate limit exceeded | 429 with a retry-after hint; form preserves input |

## Security

- Bot token (fine-grained PAT or GitHub App installation token) lives only
  in Vercel env, used only in `/api/submit`, never sent to the client,
  never written into a recipe file. Minimum scope: create branches, create
  files, open PRs on the single content repo.
- User OAuth requests `read:user` only — no write scope.
- Session cookie: signed with the Auth.js secret, `httpOnly`, `secure`,
  `sameSite=lax`.
- `/api/submit` verifies the session and re-runs full Zod validation
  server-side on every request.
- Markdown rendering disables raw HTML and sanitizes output.
- No secrets, PII, or tokens are ever persisted — there is no store to
  persist them to.

## Testing

- **Schema unit tests** (Vitest): a valid fixture round-trips; each
  refinement rejects its bad case — `engine_tag` on `nai`, `engine_tag`
  missing on `community-vllm-registry`, `engine_image_url` missing on
  `other-registry`, `nai_advanced` on a non-`nai` source, bad env-var key,
  `gpu_count: 0`, malformed `model` id.
- **Serializer tests** (`/lib/serialize.ts`): recipe object -> `.md` ->
  parse back -> deep-equal; server-set fields overwrite client-supplied
  values.
- **Submit API tests**: mocked Octokit + session.
  - Happy path: branch, file, and PR calls happen in order; PR body
    contains `@handle` and the `submitter-id` comment.
  - No session -> 401. Blocked handle -> 403. Invalid body -> 422.
  - Slug collision -> suffixed filename.
  - GitHub failure after branch creation -> 502, input preserved, orphan
    branch logged.
  - Rate limit exceeded -> 429.
- **Recipe loader test** (`/lib/recipes.ts`): a fixture directory with one
  good and one bad file -> loader throws, naming the bad file.
- **`validate-recipes` script test**: exits non-zero and names offending
  files.
- **Form component tests**: engine-source switch reveals/hides the correct
  fields; the advanced section is disabled unless `engine_source == nai`;
  submit is disabled while the payload is invalid.
- **e2e** (Playwright, optional for v1): load index, apply a filter, open a
  detail page, copy a config block.

## Open items for implementation planning

- Choose bot credential type: fine-grained PAT vs GitHub App installation
  token (App is cleaner for scope and rotation; PAT is faster to stand up).
- Confirm the content repo name and default branch.
- Decide the Markdown renderer (e.g. `remark`/`rehype` with
  `rehype-sanitize`).
- Confirm `nai_version` is free text vs a constrained enum.
