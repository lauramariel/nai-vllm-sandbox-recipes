import matter from "gray-matter";
import { recipeSchema, type Recipe, type RecipeSubmission } from "./schema";

const NOTES_HEADING = "## Notes";

// Assembles the full persisted Recipe from a validated submission plus the
// fields /api/submit controls. serverFields is spread last, so even if a
// wider object slipped past RecipeSubmission's type, submitted_by /
// submitted_at here always win over anything client-supplied.
export function buildRecipe(
  submission: RecipeSubmission,
  serverFields: { submitted_by: string; submitted_at: string },
): Recipe {
  return recipeSchema.parse({ ...submission, ...serverFields });
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

function frontmatterFromRecipe(recipe: Recipe): Record<string, unknown> {
  const fm: Record<string, unknown> = { model: recipe.model };
  if (recipe.title !== undefined) fm.title = recipe.title;
  fm.submitted_by = recipe.submitted_by;
  fm.submitted_at = recipe.submitted_at;
  fm.nai_version = recipe.nai_version;
  fm.engine_source = recipe.engine_source;
  if (recipe.engine_tag !== undefined) fm.engine_tag = recipe.engine_tag;
  if (recipe.engine_image_url !== undefined) fm.engine_image_url = recipe.engine_image_url;
  fm.kv_cache_aware_routing = recipe.kv_cache_aware_routing;
  fm.vllm_args = recipe.vllm_args;
  fm.env_vars = recipe.env_vars;
  fm.hardware = omitUndefined(recipe.hardware);

  if (recipe.nai_advanced !== undefined) {
    const naiAdvanced: Record<string, unknown> = {};
    if (recipe.nai_advanced.kv_cache_offloading !== undefined) {
      naiAdvanced.kv_cache_offloading = omitUndefined(
        recipe.nai_advanced.kv_cache_offloading,
      );
    }
    if (recipe.nai_advanced.speculative_decoding !== undefined) {
      naiAdvanced.speculative_decoding = omitUndefined(
        recipe.nai_advanced.speculative_decoding,
      );
    }
    fm.nai_advanced = naiAdvanced;
  }

  return fm;
}

// recipe -> full .md file content: YAML frontmatter + "## Notes" body.
export function serializeRecipe(recipe: Recipe, notes: string): string {
  const body = `\n${NOTES_HEADING}\n\n${notes.trim()}\n`;
  return matter.stringify(body, frontmatterFromRecipe(recipe));
}

function extractNotes(body: string): string {
  return body
    .trim()
    .replace(/^##\s+Notes\s*\n+/i, "")
    .trim();
}

// .md file content -> { recipe, notes }. Throws (via recipeSchema.parse)
// if the frontmatter doesn't match the schema — callers (the build-time
// loader, CI) are expected to catch this and name the offending file.
export function parseRecipeFile(fileContent: string): { recipe: Recipe; notes: string } {
  const { data, content } = matter(fileContent);
  const recipe = recipeSchema.parse(data);
  const notes = extractNotes(content);
  return { recipe, notes };
}
