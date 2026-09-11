import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildRecipeIndex, loadRecipes } from "./recipes";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

describe("loadRecipes", () => {
  it("throws and names the offending file when a recipe is invalid", () => {
    const dir = path.join(FIXTURES_DIR, "mixed-recipes");
    expect(() => loadRecipes(dir)).toThrow(/bad-recipe\.md/);
  });

  it("does not mention the valid file in the error", () => {
    const dir = path.join(FIXTURES_DIR, "mixed-recipes");
    try {
      loadRecipes(dir);
      throw new Error("expected loadRecipes to throw");
    } catch (err) {
      expect(String(err)).not.toMatch(/good-recipe\.md/);
    }
  });

  it("returns an empty array for a directory that does not exist", () => {
    expect(loadRecipes(path.join(FIXTURES_DIR, "does-not-exist"))).toEqual([]);
  });

  it("loads every real recipe in /recipes cleanly", () => {
    // /recipes/ holds real, merged submissions and grows over time (see
    // recipes/README.md), so this doesn't assert a specific count/content
    // — just that whatever's there loads without throwing.
    const recipes = loadRecipes();
    for (const { slug, recipe } of recipes) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(recipe.model).toBeTruthy();
    }
  });

  it("ignores recipes/README.md rather than treating it as a recipe", () => {
    const dir = path.join(FIXTURES_DIR, "dir-with-readme");
    expect(() => loadRecipes(dir)).not.toThrow();
    expect(loadRecipes(dir)).toEqual([]);
  });

  it("loads every seed fixture recipe cleanly", () => {
    const recipes = loadRecipes(path.join(FIXTURES_DIR, "seed-recipes"));
    expect(recipes.length).toBeGreaterThanOrEqual(2);
    for (const { slug, recipe } of recipes) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(recipe.model).toBeTruthy();
    }
  });
});

describe("buildRecipeIndex", () => {
  it("derives index entries from the seed fixture recipes", () => {
    const index = buildRecipeIndex(loadRecipes(path.join(FIXTURES_DIR, "seed-recipes")));
    const llama = index.find((entry) => entry.slug === "llama-3-3-70b-instruct-4xh100-80gb");
    expect(llama).toBeDefined();
    expect(llama).toMatchObject({
      model: "meta-llama/Llama-3.3-70B-Instruct",
      nai_version: "2.8",
      engine_source: "nai",
      gpu_model: "H100-80GB",
      gpu_count: 4,
      uses_speculative_decoding: true,
      uses_kv_offloading: true,
      submitted_by: "laura-m",
    });

    const qwen = index.find((entry) => entry.slug === "qwen2-5-32b-instruct-2xa100-80gb");
    expect(qwen).toMatchObject({
      engine_source: "community-vllm-registry",
      uses_speculative_decoding: false,
      uses_kv_offloading: false,
    });
  });

  it("falls back to model as title when title is absent", () => {
    const index = buildRecipeIndex([
      {
        slug: "s",
        notes: "",
        recipe: {
          model: "org/name",
          nai_version: "2.8",
          engine_source: "nai",
          kv_cache_aware_routing: false,
          vllm_args: [],
          env_vars: {},
          hardware: {
            gpu_model: "H100-80GB",
            gpu_count: 1,
            node_allocation: "single",
            instances: 1,
            vcpus_per_instance: 8,
            host_memory_per_instance_gib: 16,
          },
          submitted_by: "someone",
          submitted_at: "2026-01-01",
        },
      },
    ]);
    expect(index[0].title).toBe("org/name");
  });
});
