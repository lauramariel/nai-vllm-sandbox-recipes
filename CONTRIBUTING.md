# Contributing a recipe

There are two ways to add a recipe. Both end up as a pull request against
this repo and go through the same review.

## Option 1: the web form (recommended)

Sign in with GitHub at [`/submit`](https://nai-vllm-sandbox-recipes.vercel.app/submit)
and fill out the form. It validates as you type, shows a live preview of
the file it will create, and opens the PR for you — crediting your GitHub
handle automatically from your session.

## Option 2: open a PR by hand

If you'd rather skip the form, you can write the recipe file yourself:

1. Fork this repo.
2. Create `recipes/<slug>.md` — lowercase, hyphenated, roughly
   `<model-name>-<gpu_count>x<gpu_model>` (see existing files under
   `/recipes/` for examples).
3. Fill in YAML frontmatter + a `## Notes` section, following the template
   below.
4. Open a PR. CI (`.github/workflows/validate.yml`) runs the same schema
   validation the form uses — a malformed file fails the check before a
   maintainer even looks at it.

**One difference from the form:** the form injects `submitted_by` and
`submitted_at` automatically from your verified GitHub session, so they
can't be spoofed. A hand-written PR sets these fields itself, so there's
no automatic guarantee `submitted_by` matches the PR's actual author —
reviewers check that as part of merging, same as they'd check the rest of
the recipe's accuracy.

### Template

Every field below is required unless commented out or noted optional.
The full authoritative reference is `lib/schema.ts` (and the design doc
at `docs/superpowers/specs/2026-09-10-nai-vllm-sandbox-recipes-design.md`
if you want the reasoning behind it) — this template is just a
self-consistent starting point you can copy and edit.

```yaml
---
model: org/model-name
title: My Model on 4x H100         # optional; falls back to `model` if omitted
submitted_by: your-github-handle
submitted_at: "2026-01-01"          # ISO date — keep it quoted, or YAML parses it as a timestamp, not a string
nai_version: "2.8"                  # keep it quoted, or YAML parses 2.8 as a number
engine_source: nai                  # nai | community-vllm-registry | other-registry
# engine_tag: v0.28.0                        # required (and only valid) if engine_source: community-vllm-registry
# engine_image_url: registry.example.com/img # required (and only valid) if engine_source: other-registry
kv_cache_aware_routing: false
vllm_args:
  - --dtype bfloat16
  - --max-model-len 25600
env_vars:
  VLLM_CPU_KVCACHE_SPACE: "8"
hardware:
  gpu_model: H100-80GB
  gpu_count: 4
  node_allocation: single           # single | multi
  instances: 1
  vcpus_per_instance: 32
  host_memory_per_instance_gib: 256
# nai_advanced:                     # optional; only valid when engine_source: nai
#   kv_cache_offloading:
#     enabled: true
#     offloading_tier: cpu-memory    # only value in NAI 2.8
#     memory_per_accelerator_gib: 8
#   speculative_decoding:
#     enabled: true
#     method: n-gram                 # only value in NAI 2.8
#     speculation_length_tokens: 5
#     max_prompt_lookup_tokens: 4
---

## Notes

What was tricky, why these flags were needed, throughput observed,
gotchas — whatever would help the next person running this model.
```

Before opening the PR, you can check your file locally:

```bash
npm run validate-recipes
```
