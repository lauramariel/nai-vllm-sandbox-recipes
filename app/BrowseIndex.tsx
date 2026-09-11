"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RecipeIndexEntry } from "@/lib/recipes";
import { ENGINE_SOURCE_BADGE_COLOR, ENGINE_SOURCE_LABELS } from "@/lib/labels";
import { Badge } from "./Badge";
import { buttonSecondaryClass, cardClass, inputClass, labelClass, mutedTextClass } from "./ui";

function uniqueSorted<T>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

export function BrowseIndex({ recipes }: { recipes: RecipeIndexEntry[] }) {
  const [search, setSearch] = useState("");
  const [engineSource, setEngineSource] = useState<string>("");
  const [naiVersion, setNaiVersion] = useState<string>("");
  const [gpuModel, setGpuModel] = useState<string>("");
  const [gpuCount, setGpuCount] = useState<string>("");
  const [nodeAllocation, setNodeAllocation] = useState<string>("");
  const [specDecodingOnly, setSpecDecodingOnly] = useState(false);
  const [kvOffloadingOnly, setKvOffloadingOnly] = useState(false);
  const [kvRoutingOnly, setKvRoutingOnly] = useState(false);

  const naiVersions = useMemo(() => uniqueSorted(recipes.map((r) => r.nai_version)), [recipes]);
  const gpuModels = useMemo(() => uniqueSorted(recipes.map((r) => r.gpu_model)), [recipes]);
  const gpuCounts = useMemo(() => uniqueSorted(recipes.map((r) => r.gpu_count)), [recipes]);

  const filtersActive =
    search !== "" ||
    engineSource !== "" ||
    naiVersion !== "" ||
    gpuModel !== "" ||
    gpuCount !== "" ||
    nodeAllocation !== "" ||
    specDecodingOnly ||
    kvOffloadingOnly ||
    kvRoutingOnly;

  function resetFilters() {
    setSearch("");
    setEngineSource("");
    setNaiVersion("");
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
      if (naiVersion !== "" && r.nai_version !== naiVersion) return false;
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
    naiVersion,
    gpuModel,
    gpuCount,
    nodeAllocation,
    specDecodingOnly,
    kvOffloadingOnly,
    kvRoutingOnly,
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse recipes</h1>
        <p className={mutedTextClass}>
          {recipes.length} recipe{recipes.length === 1 ? "" : "s"} shared by the community.
        </p>
      </div>

      <div className={`${cardClass} space-y-4`}>
        <input
          type="search"
          className={inputClass}
          placeholder="Search by model, org, or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search recipes"
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
            <label className={labelClass} htmlFor="filter-nai-version">
              NAI version
            </label>
            <select
              id="filter-nai-version"
              className={inputClass}
              value={naiVersion}
              onChange={(e) => setNaiVersion(e.target.value)}
            >
              <option value="">All</option>
              {naiVersions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
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

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
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
            Uses KV cache offloading
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
            className={`${buttonSecondaryClass} ml-auto`}
          >
            Reset filters
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`${cardClass} space-y-2 text-center`}>
          {recipes.length === 0 ? (
            <p className={mutedTextClass}>No recipes yet.</p>
          ) : (
            <p className={mutedTextClass}>
              No recipes match your filters.{" "}
              <button type="button" onClick={resetFilters} className="text-blue-600 underline dark:text-blue-400">
                Reset filters
              </button>
            </p>
          )}
          <Link href="/submit" className="text-sm font-medium text-blue-600 underline dark:text-blue-400">
            Submit a recipe
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/recipes/${r.slug}`}
                className={`${cardClass} flex flex-wrap items-center gap-3 transition-colors hover:border-blue-400 dark:hover:border-blue-600`}
              >
                <span className="font-medium">{r.title}</span>
                <span className={mutedTextClass}>
                  {r.gpu_count}x {r.gpu_model}
                </span>
                <Badge color={ENGINE_SOURCE_BADGE_COLOR[r.engine_source]}>
                  {ENGINE_SOURCE_LABELS[r.engine_source]}
                </Badge>
                <span className={`${mutedTextClass} ml-auto`}>
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
