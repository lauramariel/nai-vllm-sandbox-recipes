import type { EngineSource } from "./schema";

export const ENGINE_SOURCE_LABELS: Record<EngineSource, string> = {
  nai: "NAI",
  "community-vllm-registry": "Community vLLM registry",
  "other-registry": "Other registry",
};

export const ENGINE_SOURCE_BADGE_COLOR: Record<EngineSource, "indigo" | "emerald" | "amber"> = {
  nai: "indigo",
  "community-vllm-registry": "emerald",
  "other-registry": "amber",
};
