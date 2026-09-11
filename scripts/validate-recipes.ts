import { loadRecipes } from "../lib/recipes";

// Thin CLI wrapper around lib/recipes.ts's loader. Run with no args to
// validate the real /recipes/ dir (what next build and CI care about); an
// optional directory argument exists so this is testable against fixtures.
const dir = process.argv[2];

try {
  const recipes = loadRecipes(dir);
  console.log(`validate-recipes: ${recipes.length} recipe(s) OK`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
