import Link from "next/link";
import { notFound } from "next/navigation";
import { loadRecipes } from "@/lib/recipes";
import { renderNotesHtml } from "@/lib/render-notes";
import { ENGINE_SOURCE_BADGE_COLOR, ENGINE_SOURCE_LABELS } from "@/lib/labels";
import { Badge } from "../../Badge";
import { cardClass, mutedTextClass, sectionHeadingClass } from "../../ui";
import { CopyButton } from "./CopyButton";

const dtClass = "text-gray-500 dark:text-gray-400";
const codeBlockClass =
  "overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm dark:border-gray-800 dark:bg-gray-950";

export function generateStaticParams() {
  return loadRecipes().map(({ slug }) => ({ slug }));
}

export default async function RecipeDetailPage(props: PageProps<"/recipes/[slug]">) {
  const { slug } = await props.params;
  const found = loadRecipes().find((r) => r.slug === slug);
  if (!found) notFound();

  const { recipe, notes } = found;
  const vllmArgsText = recipe.vllm_args.join("\n");
  const envVarsText = Object.entries(recipe.env_vars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const notesHtml = renderNotesHtml(notes);

  const owner = process.env.CONTENT_REPO_OWNER ?? "";
  const repo = process.env.CONTENT_REPO_NAME ?? "";
  const editUrl = `https://github.com/${owner}/${repo}/edit/main/recipes/${slug}.md`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Back to all recipes
      </Link>

      <header className={`${cardClass} space-y-2`}>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{recipe.title ?? recipe.model}</h1>
          <Badge color={ENGINE_SOURCE_BADGE_COLOR[recipe.engine_source]}>
            {ENGINE_SOURCE_LABELS[recipe.engine_source]}
          </Badge>
        </div>
        <p>
          <a
            href={`https://huggingface.co/${recipe.model}`}
            className="text-blue-600 hover:underline dark:text-blue-400"
            target="_blank"
            rel="noreferrer"
          >
            {recipe.model}
          </a>
        </p>
        <p className={mutedTextClass}>
          NAI {recipe.nai_version} · submitted by @{recipe.submitted_by} on {recipe.submitted_at}
        </p>
      </header>

      <section className={`${cardClass} space-y-3`}>
        <h2 className={sectionHeadingClass}>Engine</h2>
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

      <section className={`${cardClass} space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className={sectionHeadingClass}>vLLM args</h2>
          <CopyButton text={vllmArgsText} />
        </div>
        <pre className={codeBlockClass}>{vllmArgsText || "(none — platform defaults)"}</pre>
      </section>

      <section className={`${cardClass} space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className={sectionHeadingClass}>Env vars</h2>
          <CopyButton text={envVarsText} />
        </div>
        <pre className={codeBlockClass}>{envVarsText || "(none)"}</pre>
      </section>

      <section className={`${cardClass} space-y-3`}>
        <h2 className={sectionHeadingClass}>Hardware</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className={dtClass}>GPU model</dt>
          <dd>{recipe.hardware.gpu_model}</dd>
          <dt className={dtClass}>GPU count</dt>
          <dd>{recipe.hardware.gpu_count}</dd>
          <dt className={dtClass}>Node allocation</dt>
          <dd className="capitalize">{recipe.hardware.node_allocation}</dd>
          <dt className={dtClass}>Instances</dt>
          <dd>{recipe.hardware.instances}</dd>
          <dt className={dtClass}>vCPUs per instance</dt>
          <dd>{recipe.hardware.vcpus_per_instance}</dd>
          <dt className={dtClass}>Host memory per instance</dt>
          <dd>{recipe.hardware.host_memory_per_instance_gib} GiB</dd>
        </dl>
      </section>

      {recipe.nai_advanced && (
        <section className={`${cardClass} space-y-3`}>
          <h2 className={sectionHeadingClass}>Advanced NAI settings</h2>
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

      <section className={`${cardClass} space-y-3`}>
        <h2 className={sectionHeadingClass}>Notes</h2>
        {notes ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            // Safe: notesHtml is sanitized by lib/render-notes.ts (raw HTML
            // dropped, dangerous URLs/attributes stripped) before reaching here.
            dangerouslySetInnerHTML={{ __html: notesHtml }}
          />
        ) : (
          <p className={mutedTextClass}>No notes provided.</p>
        )}
      </section>

      <div>
        <a
          href={editUrl}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          target="_blank"
          rel="noreferrer"
        >
          Edit / suggest a change on GitHub
        </a>
      </div>
    </main>
  );
}
