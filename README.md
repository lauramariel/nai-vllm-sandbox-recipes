# NAI vLLM Sandbox Recipes

A public web app where people share working configurations for running
Hugging Face models in the NAI vLLM Sandbox. See
[`docs/superpowers/specs/2026-09-10-nai-vllm-sandbox-recipes-design.md`](docs/superpowers/specs/2026-09-10-nai-vllm-sandbox-recipes-design.md)
for the full design and `available_options.md` for the NAI 2.8 option
reference the schema is derived from.

Next.js (App Router), no database. `lib/schema.ts` (Zod) is the single
contract shared by the submission form, the submit API, the build-time
recipe loader, and CI.

Want to add a recipe? See [`CONTRIBUTING.md`](CONTRIBUTING.md) — via the
web form, or by opening a PR with a hand-written file.

## Requirements

Node 20+ (see `.nvmrc`). If you use `nvm`, run `nvm use` in this directory.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build            # production build; fails if any /recipes/*.md is invalid
npm test                 # unit tests (Vitest)
npm run validate-recipes # schema-validate every /recipes/*.md, used in CI
```
