"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RecipeIndexEntry } from "@/lib/recipes";
import { ENGINE_SOURCE_LABELS } from "@/lib/labels";

const inputClass =
  "rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-600 dark:bg-gray-900";
const labelClass = "block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400";

function uniqueSorted<T>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

export function BrowseIndex({ recipes }: { recipes: RecipeIndexEntry[] }) {
  const [search, setSearch] = useState("");
  const [engineSource, setEngineSource] = useState<string>("");
  const [gpuModel, setGpuModel] = useState<string>("");
  const [gpuCount, setGpuCount] = useState<string>("");
  const [nodeAllocation, setNodeAllocation] = useState<string>("");
  const [specDecodingOnly, setSpecDecodingOnly] = useState(false);
  const [kvOffloadingOnly, setKvOffloadingOnly] = useState(false);
  const [kvRoutingOnly, setKvRoutingOnly] = useState(false);

  const gpuModels = useMemo(() => uniqueSorted(recipes.map((r) => r.gpu_model)), [recipes]);
  const gpuCounts = useMemo(() => uniqueSorted(recipes.map((r) => r.gpu_count)), [recipes]);

  const filtersActive =
    search !== "" ||
    engineSource !== "" ||
    gpuModel !== "" ||
    gpuCount !== "" ||
    nodeAllocation !== "" ||
    specDecodingOnly ||
    kvOffloadingOnly ||
    kvRoutingOnly;

  function resetFilters() {
    setSearch("");
    setEngineSource("");
    setGpuModel("");
    setGpuCount("");
    setNodeAllocation("");
    setSpecDecodingOnly(false);
    setKvOffloadingOnly(false);
    setKvRoutingOnly(false);
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return recipes.filter((r) => {
      if (needle !== "") {
        const org = r.model.split("/")[0] ?? "";
        const haystack = `${r.model} ${org} ${r.title}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (engineSource !== "" && r.engine_source !== engineSource) return false;
      if (gpuModel !== "" && r.gpu_model !== gpuModel) return false;
      if (gpuCount !== "" && String(r.gpu_count) !== gpuCount) return false;
      if (nodeAllocation !== "" && r.node_allocation !== nodeAllocation) return false;
      if (specDecodingOnly && !r.uses_speculative_decoding) return false;
      if (kvOffloadingOnly && !r.uses_kv_offloading) return false;
      if (kvRoutingOnly && !r.kv_cache_aware_routing) return false;
      return true;
    });
  }, [
    recipes,
    search,
    engineSource,
    gpuModel,
    gpuCount,
    nodeAllocation,
    specDecodingOnly,
    kvOffloadingOnly,
    kvRoutingOnly,
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">NAI vLLM Sandbox Recipes</h1>
        <Link
          href="/submit"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          Submit a recipe
        </Link>
      </div>

      <div className="space-y-3">
        <input
          type="search"
          className={`${inputClass} w-full`}
          placeholder="Search by model, org, or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search recipes"
        />

        <div className="flex flex-wrap gap-4">
          <div>
            <label className={labelClass} htmlFor="filter-engine-source">
              Engine source
            </label>
            <select
              id="filter-engine-source"
              className={inputClass}
              value={engineSource}
              onChange={(e) => setEngineSource(e.target.value)}
            >
              <option value="">All</option>
              <option value="nai">NAI</option>
              <option value="community-vllm-registry">Community vLLM registry</option>
              <option value="other-registry">Other registry</option>
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="filter-gpu-model">
              GPU model
            </label>
            <select
              id="filter-gpu-model"
              className={inputClass}
              value={gpuModel}
              onChange={(e) => setGpuModel(e.target.value)}
            >
              <option value="">All</option>
              {gpuModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="filter-gpu-count">
              GPU count
            </label>
            <select
              id="filter-gpu-count"
              className={inputClass}
              value={gpuCount}
              onChange={(e) => setGpuCount(e.target.value)}
            >
              <option value="">All</option>
              {gpuCounts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="filter-node-allocation">
              Node allocation
            </label>
            <select
              id="filter-node-allocation"
              className={inputClass}
              value={nodeAllocation}
              onChange={(e) => setNodeAllocation(e.target.value)}
            >
              <option value="">All</option>
              <option value="single">Single</option>
              <option value="multi">Multi</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={specDecodingOnly}
              onChange={(e) => setSpecDecodingOnly(e.target.checked)}
            />
            Uses speculative decoding
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={kvOffloadingOnly}
              onChange={(e) => setKvOffloadingOnly(e.target.checked)}
            />
            Uses KV offloading
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={kvRoutingOnly}
              onChange={(e) => setKvRoutingOnly(e.target.checked)}
            />
            KV cache aware routing
          </label>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!filtersActive}
            className="ml-auto rounded-md border border-gray-300 px-3 py-1 text-sm font-medium cursor-pointer hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Reset filters
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-gray-300 p-6 text-center text-sm text-gray-600 dark:border-gray-600 dark:text-gray-400">
          {recipes.length === 0 ? (
            <p>No recipes yet.</p>
          ) : (
            <p>
              No recipes match your filters.{" "}
              <button type="button" onClick={resetFilters} className="underline cursor-pointer">
                Reset filters
              </button>
            </p>
          )}
          <Link href="/submit" className="underline">
            Submit a recipe
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {filtered.map((r) => (
            <li key={r.slug} className="py-3">
              <Link href={`/recipes/${r.slug}`} className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{r.title}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {r.gpu_count}x {r.gpu_model}
                </span>
                <span className="rounded-full border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-600">
                  {ENGINE_SOURCE_LABELS[r.engine_source]}
                </span>
                <span className="text-sm text-gray-500">
                  @{r.submitted_by} · {r.submitted_at}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
