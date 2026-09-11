"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { recipeSubmissionSchema } from "@/lib/schema";
import { buildRecipe, serializeRecipe } from "@/lib/serialize";
import { normalizeModelInput } from "@/lib/normalize-model";
import { parseEnvVarsText, parseVllmArgsText } from "@/lib/parse-form-text";

interface FormValues {
  model: string;
  title: string;
  nai_version: string;
  engine_source: "nai" | "community-vllm-registry" | "other-registry";
  engine_tag: string;
  engine_image_url: string;
  kv_cache_aware_routing: boolean;
  vllm_args_text: string;
  env_vars_text: string;
  hardware: {
    gpu_model: string;
    gpu_count: string;
    node_allocation: "" | "single" | "multi";
    instances: string;
    vcpus_per_instance: string;
    host_memory_per_instance_gib: string;
  };
  kv_cache_offloading_enabled: boolean;
  kv_cache_offloading_memory_per_accelerator_gib: string;
  speculative_decoding_enabled: boolean;
  speculative_decoding_speculation_length_tokens: string;
  speculative_decoding_max_prompt_lookup_tokens: string;
  notes: string;
}

const defaultValues: FormValues = {
  model: "",
  title: "",
  nai_version: "",
  engine_source: "nai",
  engine_tag: "",
  engine_image_url: "",
  kv_cache_aware_routing: false,
  vllm_args_text: "",
  env_vars_text: "",
  hardware: {
    gpu_model: "",
    gpu_count: "",
    node_allocation: "",
    instances: "",
    vcpus_per_instance: "",
    host_memory_per_instance_gib: "",
  },
  kv_cache_offloading_enabled: false,
  kv_cache_offloading_memory_per_accelerator_gib: "",
  speculative_decoding_enabled: false,
  speculative_decoding_speculation_length_tokens: "",
  speculative_decoding_max_prompt_lookup_tokens: "",
  notes: "",
};

function numberOrUndefined(raw: string): number | undefined {
  return raw.trim() === "" ? undefined : Number(raw);
}

// FormValues (all-string numeric fields, repeatable rows) -> the shape
// recipeSubmissionSchema expects. Kept separate from the schema itself so
// form-only concerns (empty string vs. undefined, HF URL normalization,
// which nai_advanced sub-blocks to include) don't leak into the shared
// contract.
function toPayload(values: FormValues): unknown {
  const payload: Record<string, unknown> = {
    model: normalizeModelInput(values.model),
    nai_version: values.nai_version.trim(),
    engine_source: values.engine_source,
    kv_cache_aware_routing: values.kv_cache_aware_routing,
    vllm_args: parseVllmArgsText(values.vllm_args_text),
    env_vars: parseEnvVarsText(values.env_vars_text),
    hardware: {
      gpu_model: values.hardware.gpu_model.trim(),
      gpu_count: numberOrUndefined(values.hardware.gpu_count),
      node_allocation: values.hardware.node_allocation || undefined,
      instances: numberOrUndefined(values.hardware.instances),
      vcpus_per_instance: numberOrUndefined(values.hardware.vcpus_per_instance),
      host_memory_per_instance_gib: numberOrUndefined(values.hardware.host_memory_per_instance_gib),
    },
    notes: values.notes,
  };

  if (values.title.trim() !== "") payload.title = values.title.trim();

  if (values.engine_source === "community-vllm-registry") {
    payload.engine_tag = values.engine_tag.trim();
  } else if (values.engine_source === "other-registry") {
    payload.engine_image_url = values.engine_image_url.trim();
  }

  if (values.engine_source === "nai") {
    const naiAdvanced: Record<string, unknown> = {};
    if (values.kv_cache_offloading_enabled) {
      naiAdvanced.kv_cache_offloading = {
        enabled: true,
        offloading_tier: "cpu-memory",
        memory_per_accelerator_gib: numberOrUndefined(
          values.kv_cache_offloading_memory_per_accelerator_gib,
        ),
      };
    }
    if (values.speculative_decoding_enabled) {
      naiAdvanced.speculative_decoding = {
        enabled: true,
        method: "n-gram",
        speculation_length_tokens: numberOrUndefined(
          values.speculative_decoding_speculation_length_tokens,
        ),
        max_prompt_lookup_tokens: numberOrUndefined(
          values.speculative_decoding_max_prompt_lookup_tokens,
        ),
      };
    }
    if (Object.keys(naiAdvanced).length > 0) payload.nai_advanced = naiAdvanced;
  }

  return payload;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-600 dark:bg-gray-900";
const labelClass = "block text-sm font-medium mb-1";
const primaryButtonClass =
  "rounded-md bg-blue-600 px-4 py-2 font-medium text-white cursor-pointer hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

export function SubmitForm({ login }: { login: string }) {
  const { register, control, handleSubmit } = useForm<FormValues>({ defaultValues });
  const values = useWatch({ control });

  const [submitState, setSubmitState] = useState<
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "success"; prUrl: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const payload = useMemo(() => toPayload(values as FormValues), [values]);
  const parsed = useMemo(() => recipeSubmissionSchema.safeParse(payload), [payload]);

  const previewMd = useMemo(() => {
    if (!parsed.success) return null;
    const recipe = buildRecipe(parsed.data, {
      submitted_by: login,
      submitted_at: new Date().toISOString().slice(0, 10),
    });
    return serializeRecipe(recipe, parsed.data.notes);
  }, [parsed, login]);

  async function onSubmit() {
    if (!parsed.success) return;
    setSubmitState({ status: "submitting" });
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json();
      if (res.ok) {
        setSubmitState({ status: "success", prUrl: body.prUrl });
      } else {
        const retryAfter = res.headers.get("Retry-After");
        setSubmitState({
          status: "error",
          message: retryAfter ? `${body.error} (retry after ${retryAfter}s)` : body.error,
        });
      }
    } catch {
      setSubmitState({ status: "error", message: "Network error. Please try again." });
    }
  }

  const engineSource = values.engine_source ?? "nai";

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 1. Model / title / nai_version */}
        <section className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="model">
              Model (Hugging Face repo id or URL)
            </label>
            <input
              id="model"
              className={inputClass}
              placeholder="org/name or https://huggingface.co/org/name"
              {...register("model")}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="title">
              Title (optional)
            </label>
            <input id="title" className={inputClass} {...register("title")} />
          </div>
          <div>
            <label className={labelClass} htmlFor="nai_version">
              NAI version
            </label>
            <input id="nai_version" className={inputClass} placeholder="2.8" {...register("nai_version")} />
          </div>
        </section>

        {/* 2. Engine source */}
        <section className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="engine_source">
              Engine source
            </label>
            <select id="engine_source" className={inputClass} {...register("engine_source")}>
              <option value="nai">NAI</option>
              <option value="community-vllm-registry">Community vLLM registry</option>
              <option value="other-registry">Other registry</option>
            </select>
          </div>
          {engineSource === "community-vllm-registry" && (
            <div>
              <label className={labelClass} htmlFor="engine_tag">
                Engine tag
              </label>
              <input id="engine_tag" className={inputClass} placeholder="v0.28.0" {...register("engine_tag")} />
            </div>
          )}
          {engineSource === "other-registry" && (
            <div>
              <label className={labelClass} htmlFor="engine_image_url">
                Engine image URL
              </label>
              <input id="engine_image_url" className={inputClass} {...register("engine_image_url")} />
            </div>
          )}
        </section>

        {/* 3. KV cache aware routing */}
        <section>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("kv_cache_aware_routing")} />
            KV cache aware routing
          </label>
        </section>

        {/* 4. vLLM args / env vars — paste multiple lines at once */}
        <section className="space-y-2">
          <label className={labelClass} htmlFor="vllm_args_text">
            vLLM args (one per line)
          </label>
          <textarea
            id="vllm_args_text"
            rows={4}
            className={`${inputClass} font-mono`}
            placeholder={"--dtype bfloat16\n--max-model-len 25600"}
            {...register("vllm_args_text")}
          />
        </section>

        <section className="space-y-2">
          <label className={labelClass} htmlFor="env_vars_text">
            Env vars (KEY=value, one per line)
          </label>
          <textarea
            id="env_vars_text"
            rows={4}
            className={`${inputClass} font-mono`}
            placeholder={"VLLM_CPU_KVCACHE_SPACE=8\nTIKTOKEN_ENCODINGS_BASE=/path/to/your/encodings"}
            {...register("env_vars_text")}
          />
        </section>

        {/* 5. Hardware */}
        <section className="space-y-3">
          <h2 className="font-semibold">Hardware</h2>
          <div>
            <label className={labelClass} htmlFor="gpu_model">
              GPU model
            </label>
            <input id="gpu_model" className={inputClass} placeholder="H100-80GB" {...register("hardware.gpu_model")} />
          </div>
          <div>
            <label className={labelClass} htmlFor="gpu_count">
              GPU count
            </label>
            <input id="gpu_count" className={inputClass} {...register("hardware.gpu_count")} />
          </div>
          <div>
            <label className={labelClass} htmlFor="node_allocation">
              Node allocation
            </label>
            <select id="node_allocation" className={inputClass} {...register("hardware.node_allocation")}>
              <option value="">—</option>
              <option value="single">Single</option>
              <option value="multi">Multi</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="instances">
              Instances
            </label>
            <input id="instances" className={inputClass} {...register("hardware.instances")} />
          </div>
          <div>
            <label className={labelClass} htmlFor="vcpus_per_instance">
              vCPUs per instance
            </label>
            <input id="vcpus_per_instance" className={inputClass} {...register("hardware.vcpus_per_instance")} />
          </div>
          <div>
            <label className={labelClass} htmlFor="host_memory_per_instance_gib">
              Host memory per instance, GiB
            </label>
            <input
              id="host_memory_per_instance_gib"
              className={inputClass}
              {...register("hardware.host_memory_per_instance_gib")}
            />
          </div>
        </section>

        {/* 6. Advanced NAI settings — only meaningful when engine_source == nai */}
        <fieldset disabled={engineSource !== "nai"} className="space-y-3 rounded-md border border-gray-300 p-3 disabled:opacity-50 dark:border-gray-600">
          <legend className="font-semibold px-1">Advanced NAI settings</legend>

          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("kv_cache_offloading_enabled")} />
            Enable KV cache offloading
          </label>
          {values.kv_cache_offloading_enabled && (
            <div>
              <label className={labelClass} htmlFor="memory_per_accelerator_gib">
                Memory per accelerator, GiB
              </label>
              <input
                id="memory_per_accelerator_gib"
                className={inputClass}
                {...register("kv_cache_offloading_memory_per_accelerator_gib")}
              />
            </div>
          )}

          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("speculative_decoding_enabled")} />
            Enable speculative decoding
          </label>
          {values.speculative_decoding_enabled && (
            <div className="space-y-3">
              <div>
                <label className={labelClass} htmlFor="speculation_length_tokens">
                  Speculation length, tokens (default 5)
                </label>
                <input
                  id="speculation_length_tokens"
                  className={inputClass}
                  {...register("speculative_decoding_speculation_length_tokens")}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="max_prompt_lookup_tokens">
                  Max prompt lookup, tokens (default 4)
                </label>
                <input
                  id="max_prompt_lookup_tokens"
                  className={inputClass}
                  {...register("speculative_decoding_max_prompt_lookup_tokens")}
                />
              </div>
            </div>
          )}
        </fieldset>

        {/* 7. Notes */}
        <section>
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" rows={6} className={inputClass} {...register("notes")} />
        </section>

        {/* 8. Validation + submit */}
        {!parsed.success && (
          <ul className="list-inside list-disc text-sm text-red-600 dark:text-red-400">
            {parsed.error.issues.slice(0, 8).map((issue, i) => (
              <li key={i}>
                {issue.path.join(".")}: {issue.message}
              </li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          disabled={!parsed.success || submitState.status === "submitting"}
          className={primaryButtonClass}
        >
          {submitState.status === "submitting" ? "Submitting…" : "Submit recipe"}
        </button>

        {submitState.status === "success" && (
          <p className="text-green-700 dark:text-green-400">
            Submitted →{" "}
            <a className="underline" href={submitState.prUrl} target="_blank" rel="noreferrer">
              {submitState.prUrl}
            </a>
          </p>
        )}
        {submitState.status === "error" && (
          <p className="text-red-600 dark:text-red-400">{submitState.message}</p>
        )}
      </form>

      {/* Preview pane */}
      <div>
        <h2 className="font-semibold mb-2">Preview</h2>
        {previewMd ? (
          <pre className="overflow-auto rounded-md border border-gray-300 bg-gray-50 p-3 text-sm dark:border-gray-600 dark:bg-gray-900">
            {previewMd}
          </pre>
        ) : (
          <p className="text-sm text-gray-500">Fix the validation errors to see a preview.</p>
        )}
      </div>
    </div>
  );
}
