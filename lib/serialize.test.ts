import { describe, expect, it } from "vitest";
import { recipeSchema, recipeSubmissionSchema } from "./schema";
import { buildRecipe, parseRecipeFile, serializeRecipe } from "./serialize";

const validSubmission = recipeSubmissionSchema.parse({
  model: "meta-llama/Llama-3.3-70B-Instruct",
  title: "Llama 3.3 70B Instruct on 4xH100",
  nai_version: "2.8",
  engine_source: "nai",
  kv_cache_aware_routing: false,
  vllm_args: ["--dtype bfloat16", "--max-model-len 25600"],
  env_vars: { VLLM_CPU_KVCACHE_SPACE: "8" },
  hardware: {
    gpu_model: "H100-80GB",
    gpu_count: 4,
    node_allocation: "single",
    instances: 1,
    vcpus_per_instance: 32,
    host_memory_per_instance_gib: 256,
  },
  nai_advanced: {
    kv_cache_offloading: {
      enabled: true,
      offloading_tier: "cpu-memory",
      memory_per_accelerator_gib: 8,
    },
    speculative_decoding: {
      enabled: true,
      method: "n-gram",
      speculation_length_tokens: 5,
      max_prompt_lookup_tokens: 4,
    },
  },
});

const validRecipe = recipeSchema.parse({
  ...validSubmission,
  submitted_by: "laura-m",
  submitted_at: "2026-09-10",
});

describe("buildRecipe", () => {
  it("assembles a Recipe from a submission plus server fields", () => {
    const recipe = buildRecipe(validSubmission, {
      submitted_by: "laura-m",
      submitted_at: "2026-09-10",
    });
    expect(recipe).toEqual(validRecipe);
  });

  it("drops notes — it belongs in the Markdown body, not the frontmatter", () => {
    const recipe = buildRecipe(
      { ...validSubmission, notes: "some notes" },
      { submitted_by: "laura-m", submitted_at: "2026-09-10" },
    );
    expect(recipe).not.toHaveProperty("notes");
  });

  it("server fields always overwrite client-supplied values", () => {
    const submissionWithSpoofedFields = {
      ...validSubmission,
      submitted_by: "attacker",
      submitted_at: "1970-01-01",
    } as typeof validSubmission;

    const recipe = buildRecipe(submissionWithSpoofedFields, {
      submitted_by: "laura-m",
      submitted_at: "2026-09-10",
    });

    expect(recipe.submitted_by).toBe("laura-m");
    expect(recipe.submitted_at).toBe("2026-09-10");
  });
});

describe("serializeRecipe / parseRecipeFile round trip", () => {
  it("round-trips a full recipe and its notes", () => {
    const notes = "Needed --max-model-len 25600 to fit KV cache on 4x H100.";
    const md = serializeRecipe(validRecipe, notes);
    const { recipe, notes: parsedNotes } = parseRecipeFile(md);

    expect(recipe).toEqual(validRecipe);
    expect(parsedNotes).toBe(notes);
  });

  it("round-trips a recipe with only required fields set", () => {
    const minimalSubmission = recipeSubmissionSchema.parse({
      model: "org/model",
      nai_version: "2.8",
      engine_source: "community-vllm-registry",
      engine_tag: "v0.28.0",
      kv_cache_aware_routing: true,
      hardware: {
        gpu_model: "A100-40GB",
        gpu_count: 1,
        node_allocation: "single",
        instances: 1,
        vcpus_per_instance: 8,
        host_memory_per_instance_gib: 16,
      },
    });
    const recipe = buildRecipe(minimalSubmission, {
      submitted_by: "laura-m",
      submitted_at: "2026-09-10",
    });

    const md = serializeRecipe(recipe, "Worked out of the box.");
    const { recipe: parsedRecipe, notes } = parseRecipeFile(md);

    expect(parsedRecipe).toEqual(recipe);
    expect(notes).toBe("Worked out of the box.");
    // Optional fields should be entirely absent from the YAML, not null.
    expect(md).not.toMatch(/^title:/m);
    expect(md).not.toMatch(/^engine_image_url:/m);
    expect(md).not.toMatch(/^nai_advanced:/m);
  });
});

describe("parseRecipeFile against a handwritten fixture", () => {
  const fixture = `---
model: org/other-model
title: Other Model on 2xA100
submitted_by: someone-else
submitted_at: "2026-01-15"
nai_version: "2.8"
engine_source: other-registry
engine_image_url: registry.example.com/vllm:custom
kv_cache_aware_routing: true
vllm_args:
  - --dtype bfloat16
env_vars:
  VLLM_CPU_KVCACHE_SPACE: "8"
hardware:
  gpu_model: A100-40GB
  gpu_count: 2
  node_allocation: single
  instances: 1
  vcpus_per_instance: 8
  host_memory_per_instance_gib: 16
---

## Notes

Some notes about this recipe.
`;

  it("parses into the expected recipe object", () => {
    const { recipe, notes } = parseRecipeFile(fixture);
    expect(recipe).toEqual({
      model: "org/other-model",
      title: "Other Model on 2xA100",
      submitted_by: "someone-else",
      submitted_at: "2026-01-15",
      nai_version: "2.8",
      engine_source: "other-registry",
      engine_image_url: "registry.example.com/vllm:custom",
      kv_cache_aware_routing: true,
      vllm_args: ["--dtype bfloat16"],
      env_vars: { VLLM_CPU_KVCACHE_SPACE: "8" },
      hardware: {
        gpu_model: "A100-40GB",
        gpu_count: 2,
        node_allocation: "single",
        instances: 1,
        vcpus_per_instance: 8,
        host_memory_per_instance_gib: 16,
      },
    });
    expect(notes).toBe("Some notes about this recipe.");
  });

  it("throws when frontmatter fails schema validation", () => {
    const invalidFixture = fixture.replace("gpu_count: 2", "gpu_count: 0");
    expect(() => parseRecipeFile(invalidFixture)).toThrow();
  });

  it("coerces an unquoted date and unquoted version number (YAML auto-typing)", () => {
    const unquotedFixture = fixture
      .replace('submitted_at: "2026-01-15"', "submitted_at: 2026-01-15")
      .replace('nai_version: "2.8"', "nai_version: 2.8");
    const { recipe } = parseRecipeFile(unquotedFixture);
    expect(recipe.submitted_at).toBe("2026-01-15");
    expect(recipe.nai_version).toBe("2.8");
  });
});
