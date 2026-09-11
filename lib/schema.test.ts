import { describe, expect, it } from "vitest";
import { recipeSchema, recipeSubmissionSchema } from "./schema";

const validSubmission = {
  model: "meta-llama/Llama-3.3-70B-Instruct",
  title: "Llama 3.3 70B Instruct on 4xH100",
  nai_version: "2.8",
  engine_source: "nai" as const,
  kv_cache_aware_routing: false,
  vllm_args: ["--dtype bfloat16", "--max-model-len 25600"],
  env_vars: { VLLM_CPU_KVCACHE_SPACE: "8" },
  hardware: {
    gpu_model: "H100-80GB",
    gpu_count: 4,
    node_allocation: "single" as const,
    instances: 1,
    vcpus_per_instance: 32,
    host_memory_per_instance_gib: 256,
  },
  nai_advanced: {
    kv_cache_offloading: {
      enabled: true,
      offloading_tier: "cpu-memory" as const,
      memory_per_accelerator_gib: 8,
    },
    speculative_decoding: {
      enabled: true,
      method: "n-gram" as const,
      speculation_length_tokens: 5,
      max_prompt_lookup_tokens: 4,
    },
  },
};

describe("recipeSubmissionSchema", () => {
  it("round-trips a valid submission", () => {
    const result = recipeSubmissionSchema.safeParse(validSubmission);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe(validSubmission.model);
      expect(result.data.hardware.gpu_count).toBe(4);
      expect(result.data.nai_advanced?.speculative_decoding?.method).toBe("n-gram");
    }
  });

  it("defaults vllm_args and env_vars when omitted", () => {
    const { vllm_args, env_vars, ...rest } = validSubmission;
    const result = recipeSubmissionSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vllm_args).toEqual([]);
      expect(result.data.env_vars).toEqual({});
    }
  });

  it("strips client-supplied submitted_by / submitted_at", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      submitted_by: "attacker",
      submitted_at: "1970-01-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("submitted_by");
      expect(result.data).not.toHaveProperty("submitted_at");
    }
  });

  it("rejects a malformed model id", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      model: "not-a-valid-model-id",
    });
    expect(result.success).toBe(false);
  });

  it("rejects gpu_count: 0", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      hardware: { ...validSubmission.hardware, gpu_count: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a bad env_vars key", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      env_vars: { "not-shouty": "8" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects engine_tag when engine_source is nai", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      engine_tag: "v0.28.0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects community-vllm-registry missing engine_tag", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      engine_source: "community-vllm-registry",
    });
    expect(result.success).toBe(false);
  });

  it("rejects other-registry missing engine_image_url", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      engine_source: "other-registry",
    });
    expect(result.success).toBe(false);
  });

  it("rejects community-vllm-registry with an engine_image_url set", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      engine_source: "community-vllm-registry",
      engine_tag: "v0.28.0",
      engine_image_url: "registry.example.com/vllm:latest",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nai_advanced on a non-nai engine_source", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      engine_source: "community-vllm-registry",
      engine_tag: "v0.28.0",
    });
    expect(result.success).toBe(false);
  });

  it("requires offloading_tier and memory_per_accelerator_gib when kv_cache_offloading.enabled", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: {
        kv_cache_offloading: { enabled: true },
      },
    });
    expect(result.success).toBe(false);
  });

  it("allows kv_cache_offloading.enabled: false without sub-fields", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: {
        kv_cache_offloading: { enabled: false },
      },
    });
    expect(result.success).toBe(true);
  });

  it("requires method when speculative_decoding.enabled", () => {
    const result = recipeSubmissionSchema.safeParse({
      ...validSubmission,
      nai_advanced: {
        speculative_decoding: { enabled: true },
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("recipeSchema", () => {
  it("requires submitted_by and submitted_at", () => {
    const result = recipeSchema.safeParse(validSubmission);
    expect(result.success).toBe(false);
  });

  it("accepts a full persisted recipe", () => {
    const result = recipeSchema.safeParse({
      ...validSubmission,
      submitted_by: "laura-m",
      submitted_at: "2026-09-10",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed submitted_at", () => {
    const result = recipeSchema.safeParse({
      ...validSubmission,
      submitted_by: "laura-m",
      submitted_at: "Sept 10 2026",
    });
    expect(result.success).toBe(false);
  });

  it("coerces a JS Date for submitted_at (YAML auto-types unquoted dates)", () => {
    const result = recipeSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      submitted_by: "laura-m",
      submitted_at: new Date("2026-09-10T00:00:00.000Z"),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.submitted_at).toBe("2026-09-10");
  });

  it("coerces a number for nai_version (YAML auto-types unquoted 2.8)", () => {
    const result = recipeSchema.safeParse({
      ...validSubmission,
      nai_advanced: undefined,
      nai_version: 2.8,
      submitted_by: "laura-m",
      submitted_at: "2026-09-10",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.nai_version).toBe("2.8");
  });
});
