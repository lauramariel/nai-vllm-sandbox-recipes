import Link from "next/link";
import { notFound } from "next/navigation";
import { loadRecipes } from "@/lib/recipes";
import { renderNotesHtml } from "@/lib/render-notes";
import { ENGINE_SOURCE_LABELS } from "@/lib/labels";
import { CopyButton } from "./CopyButton";

const dtClass = "text-gray-500";

export function generateStaticParams() {
  return loadRecipes().map(({ slug }) => ({ slug }));
}

export default async function RecipeDetailPage(props: PageProps<"/recipes/[slug]">) {
  const { slug } = await props.params;
  const found = loadRecipes().find((r) => r.slug === slug);
  if (!found) notFound();

  const { recipe, notes } = found;
  const vllmArgsText = recipe.vllm_args.join(" ");
  const envVarsText = Object.entries(recipe.env_vars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const notesHtml = renderNotesHtml(notes);

  const owner = process.env.CONTENT_REPO_OWNER ?? "";
  const repo = process.env.CONTENT_REPO_NAME ?? "";
  const editUrl = `https://github.com/${owner}/${repo}/edit/main/recipes/${slug}.md`;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <Link href="/" className="text-sm underline">
        ← Back to all recipes
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{recipe.title ?? recipe.model}</h1>
        <p>
          <a
            href={`https://huggingface.co/${recipe.model}`}
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            {recipe.model}
          </a>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          NAI {recipe.nai_version} · submitted by @{recipe.submitted_by} on {recipe.submitted_at}
        </p>
      </header>

      <section>
        <h2 className="font-semibold mb-2">Engine</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className={dtClass}>Source</dt>
          <dd>{ENGINE_SOURCE_LABELS[recipe.engine_source]}</dd>
          {recipe.engine_tag && (
            <>
              <dt className={dtClass}>Engine tag</dt>
              <dd>{recipe.engine_tag}</dd>
            </>
          )}
          {recipe.engine_image_url && (
            <>
              <dt className={dtClass}>Engine image URL</dt>
              <dd className="break-all">{recipe.engine_image_url}</dd>
            </>
          )}
          <dt className={dtClass}>KV cache aware routing</dt>
          <dd>{recipe.kv_cache_aware_routing ? "Yes" : "No"}</dd>
        </dl>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">vLLM args</h2>
          <CopyButton text={vllmArgsText} />
        </div>
        <pre className="overflow-auto rounded-md border border-gray-300 bg-gray-50 p-3 text-sm dark:border-gray-600 dark:bg-gray-900">
          {vllmArgsText || "(none — platform defaults)"}
        </pre>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Env vars</h2>
          <CopyButton text={envVarsText} />
        </div>
        <pre className="overflow-auto rounded-md border border-gray-300 bg-gray-50 p-3 text-sm dark:border-gray-600 dark:bg-gray-900">
          {envVarsText || "(none)"}
        </pre>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Hardware</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className={dtClass}>GPU model</dt>
          <dd>{recipe.hardware.gpu_model}</dd>
          <dt className={dtClass}>GPU count</dt>
          <dd>{recipe.hardware.gpu_count}</dd>
          <dt className={dtClass}>Node allocation</dt>
          <dd>{recipe.hardware.node_allocation}</dd>
          <dt className={dtClass}>Instances</dt>
          <dd>{recipe.hardware.instances}</dd>
          <dt className={dtClass}>vCPUs per instance</dt>
          <dd>{recipe.hardware.vcpus_per_instance}</dd>
          <dt className={dtClass}>Host memory per instance</dt>
          <dd>{recipe.hardware.host_memory_per_instance_gib} GiB</dd>
        </dl>
      </section>

      {recipe.nai_advanced && (
        <section>
          <h2 className="font-semibold mb-2">Advanced NAI settings</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {recipe.nai_advanced.kv_cache_offloading && (
              <>
                <dt className={dtClass}>KV cache offloading</dt>
                <dd>
                  {recipe.nai_advanced.kv_cache_offloading.enabled
                    ? `Enabled — ${recipe.nai_advanced.kv_cache_offloading.offloading_tier}, ${recipe.nai_advanced.kv_cache_offloading.memory_per_accelerator_gib} GiB/accelerator`
                    : "Disabled"}
                </dd>
              </>
            )}
            {recipe.nai_advanced.speculative_decoding && (
              <>
                <dt className={dtClass}>Speculative decoding</dt>
                <dd>
                  {recipe.nai_advanced.speculative_decoding.enabled
                    ? `Enabled — ${recipe.nai_advanced.speculative_decoding.method}, speculation length ${recipe.nai_advanced.speculative_decoding.speculation_length_tokens}, max prompt lookup ${recipe.nai_advanced.speculative_decoding.max_prompt_lookup_tokens}`
                    : "Disabled"}
                </dd>
              </>
            )}
          </dl>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Notes</h2>
        {notes ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            // Safe: notesHtml is sanitized by lib/render-notes.ts (raw HTML
            // dropped, dangerous URLs/attributes stripped) before reaching here.
            dangerouslySetInnerHTML={{ __html: notesHtml }}
          />
        ) : (
          <p className="text-sm text-gray-500">No notes provided.</p>
        )}
      </section>

      <div>
        <a href={editUrl} className="text-sm underline" target="_blank" rel="noreferrer">
          Edit / suggest a change on GitHub
        </a>
      </div>
    </main>
  );
}
