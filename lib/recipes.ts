import fs from "node:fs";
import path from "node:path";
import { parseRecipeFile } from "./serialize";
import type { Recipe } from "./schema";

const DEFAULT_RECIPES_DIR = path.join(process.cwd(), "recipes");

export interface LoadedRecipe {
  slug: string;
  recipe: Recipe;
  notes: string;
}

// Fields shown on the browse index — small enough to ship client-side and
// filter/search over in the browser. See design doc "Build-time load".
export interface RecipeIndexEntry {
  slug: string;
  model: string;
  title: string;
  nai_version: string;
  engine_source: Recipe["engine_source"];
  gpu_model: string;
  gpu_count: number;
  node_allocation: Recipe["hardware"]["node_allocation"];
  kv_cache_aware_routing: boolean;
  uses_speculative_decoding: boolean;
  uses_kv_offloading: boolean;
  submitted_by: string;
  submitted_at: string;
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

// Reads and validates every /recipes/*.md. Throws, naming every invalid
// file in one error, if any fail schema validation — callers (next build,
// scripts/validate-recipes.ts) let this propagate so a bad file can never
// reach production.
export function loadRecipes(dir: string = DEFAULT_RECIPES_DIR): LoadedRecipe[] {
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md") && file.toLowerCase() !== "readme.md")
    .sort();

  const loaded: LoadedRecipe[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    try {
      const { recipe, notes } = parseRecipeFile(raw);
      loaded.push({ slug: slugFromFilename(file), recipe, notes });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${file}:\n${message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid recipe file(s):\n\n${errors.join("\n\n")}`);
  }

  return loaded;
}

export function buildRecipeIndex(recipes: LoadedRecipe[]): RecipeIndexEntry[] {
  return recipes.map(({ slug, recipe }) => ({
    slug,
    model: recipe.model,
    title: recipe.title ?? recipe.model,
    nai_version: recipe.nai_version,
    engine_source: recipe.engine_source,
    gpu_model: recipe.hardware.gpu_model,
    gpu_count: recipe.hardware.gpu_count,
    node_allocation: recipe.hardware.node_allocation,
    kv_cache_aware_routing: recipe.kv_cache_aware_routing,
    uses_speculative_decoding: recipe.nai_advanced?.speculative_decoding?.enabled ?? false,
    uses_kv_offloading: recipe.nai_advanced?.kv_cache_offloading?.enabled ?? false,
    submitted_by: recipe.submitted_by,
    submitted_at: recipe.submitted_at,
  }));
}
