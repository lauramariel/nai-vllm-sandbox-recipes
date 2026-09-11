import { z } from "zod";

// Single source of truth for what a recipe is, shared by the submission
// form, /api/submit, the build-time recipe loader, and CI validation.
// See docs/superpowers/specs/2026-09-10-nai-vllm-sandbox-recipes-design.md
// ("Recipe file format" / "Field reference" / "Cross-field validation").

export const MODEL_ID_REGEX = /^[\w.-]+\/[\w.-]+$/;
export const ENV_VAR_KEY_REGEX = /^[A-Z_][A-Z0-9_]*$/;
// NAI version numbers increment release over release (2.8, 2.9, 3.0, ...);
// kept as free text with a light shape check rather than an enum so a new
// release doesn't require a schema change just to accept its label.
export const NAI_VERSION_REGEX = /^\d+(\.\d+)+$/;
export const GITHUB_HANDLE_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const engineSourceSchema = z.enum([
  "nai",
  "community-vllm-registry",
  "other-registry",
]);
export type EngineSource = z.infer<typeof engineSourceSchema>;

export const nodeAllocationSchema = z.enum(["single", "multi"]);
export const offloadingTierSchema = z.enum(["cpu-memory"]);
export const speculativeMethodSchema = z.enum(["n-gram"]);

const hardwareSchema = z.object({
  gpu_model: z.string().min(1, "gpu_model is required"),
  gpu_count: z.number().int().positive(),
  node_allocation: nodeAllocationSchema.optional(),
  instances: z.number().int().positive().optional(),
  vcpus_per_instance: z.number().int().positive().optional(),
  host_memory_per_instance_gib: z.number().positive().optional(),
});

const kvCacheOffloadingSchema = z.object({
  enabled: z.boolean(),
  offloading_tier: offloadingTierSchema.optional(),
  memory_per_accelerator_gib: z.number().positive().optional(),
});

const speculativeDecodingSchema = z.object({
  enabled: z.boolean(),
  method: speculativeMethodSchema.optional(),
  speculation_length_tokens: z.number().int().positive().default(5),
  max_prompt_lookup_tokens: z.number().int().positive().default(4),
});

const naiAdvancedSchema = z.object({
  kv_cache_offloading: kvCacheOffloadingSchema.optional(),
  speculative_decoding: speculativeDecodingSchema.optional(),
});
export type NaiAdvanced = z.infer<typeof naiAdvancedSchema>;

// Fields the submitter actually provides. submitted_by/submitted_at are
// deliberately absent here: /api/submit injects them server-side, and
// parsing a client payload against this schema silently drops any
// client-supplied values for them (zod strips unrecognized keys by
// default), which is what "ignored" means in the design doc.
const recipeShape = {
  model: z
    .string()
    .regex(MODEL_ID_REGEX, "model must be a Hugging Face repo id, e.g. org/name"),
  title: z.string().min(1).optional(),
  nai_version: z
    .string()
    .regex(NAI_VERSION_REGEX, "nai_version must look like a version number, e.g. 2.8"),
  engine_source: engineSourceSchema,
  engine_tag: z.string().min(1).optional(),
  engine_image_url: z.string().min(1).optional(),
  kv_cache_aware_routing: z.boolean(),
  vllm_args: z.array(z.string().min(1)).default([]),
  env_vars: z
    .record(z.string(), z.string())
    .default({})
    .refine(
      (vars) => Object.keys(vars).every((key) => ENV_VAR_KEY_REGEX.test(key)),
      { message: "env_vars keys must match ^[A-Z_][A-Z0-9_]*$" },
    ),
  hardware: hardwareSchema,
  nai_advanced: naiAdvancedSchema.optional(),
};

type EngineCrossFields = {
  engine_source: EngineSource;
  engine_tag?: string;
  engine_image_url?: string;
  nai_advanced?: NaiAdvanced;
};

function refineEngineCrossFields(data: EngineCrossFields, ctx: z.RefinementCtx) {
  const { engine_source, engine_tag, engine_image_url, nai_advanced } = data;

  if (engine_source === "community-vllm-registry") {
    if (!engine_tag) {
      ctx.addIssue({
        code: "custom",
        path: ["engine_tag"],
        message: "engine_tag is required when engine_source is community-vllm-registry",
      });
    }
    if (engine_image_url) {
      ctx.addIssue({
        code: "custom",
        path: ["engine_image_url"],
        message: "engine_image_url must be absent when engine_source is community-vllm-registry",
      });
    }
  } else if (engine_source === "other-registry") {
    if (!engine_image_url) {
      ctx.addIssue({
        code: "custom",
        path: ["engine_image_url"],
        message: "engine_image_url is required when engine_source is other-registry",
      });
    }
    if (engine_tag) {
      ctx.addIssue({
        code: "custom",
        path: ["engine_tag"],
        message: "engine_tag must be absent when engine_source is other-registry",
      });
    }
  } else if (engine_source === "nai") {
    if (engine_tag) {
      ctx.addIssue({
        code: "custom",
        path: ["engine_tag"],
        message: "engine_tag must be absent when engine_source is nai",
      });
    }
    if (engine_image_url) {
      ctx.addIssue({
        code: "custom",
        path: ["engine_image_url"],
        message: "engine_image_url must be absent when engine_source is nai",
      });
    }
  }

  if (nai_advanced && engine_source !== "nai") {
    ctx.addIssue({
      code: "custom",
      path: ["nai_advanced"],
      message: "nai_advanced is only valid when engine_source is nai",
    });
  }

  const kvCacheOffloading = nai_advanced?.kv_cache_offloading;
  if (kvCacheOffloading?.enabled) {
    if (!kvCacheOffloading.offloading_tier) {
      ctx.addIssue({
        code: "custom",
        path: ["nai_advanced", "kv_cache_offloading", "offloading_tier"],
        message: "offloading_tier is required when kv_cache_offloading.enabled is true",
      });
    }
    if (kvCacheOffloading.memory_per_accelerator_gib === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["nai_advanced", "kv_cache_offloading", "memory_per_accelerator_gib"],
        message:
          "memory_per_accelerator_gib is required when kv_cache_offloading.enabled is true",
      });
    }
  }

  const speculativeDecoding = nai_advanced?.speculative_decoding;
  if (speculativeDecoding?.enabled && !speculativeDecoding.method) {
    ctx.addIssue({
      code: "custom",
      path: ["nai_advanced", "speculative_decoding", "method"],
      message: "method is required when speculative_decoding.enabled is true",
    });
  }
}

export const recipeSubmissionSchema = z
  .object(recipeShape)
  .superRefine((data, ctx) => refineEngineCrossFields(data, ctx));
export type RecipeSubmission = z.infer<typeof recipeSubmissionSchema>;

// The full, persisted recipe: submission fields plus the server-injected
// identity fields. This is what /lib/recipes.ts validates every
// /recipes/*.md file against.
export const recipeSchema = z
  .object({
    ...recipeShape,
    submitted_by: z.string().regex(GITHUB_HANDLE_REGEX, "submitted_by must be a GitHub handle"),
    submitted_at: z.string().regex(ISO_DATE_REGEX, "submitted_at must be an ISO date (YYYY-MM-DD)"),
  })
  .superRefine((data, ctx) => refineEngineCrossFields(data, ctx));
export type Recipe = z.infer<typeof recipeSchema>;
