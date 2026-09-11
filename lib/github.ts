import { Octokit } from "@octokit/rest";
import type { Recipe } from "./schema";

export function createGithubClient(token: string): Octokit {
  return new Octokit({ auth: token });
}

export interface RepoRef {
  owner: string;
  repo: string;
}

function isNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "status" in err && err.status === 404;
}

export async function getBranchSha(
  octokit: Octokit,
  repoRef: RepoRef,
  branch: string,
): Promise<string> {
  const { data } = await octokit.rest.repos.getBranch({ ...repoRef, branch });
  return data.commit.sha;
}

// Slugs of every recipe already in /recipes/, used for collision checking
// (see lib/slug.ts resolveSlugCollision). Returns [] if /recipes/ doesn't
// exist yet (e.g. before the very first submission merges).
export async function listRecipeSlugs(octokit: Octokit, repoRef: RepoRef): Promise<string[]> {
  try {
    const { data } = await octokit.rest.repos.getContent({ ...repoRef, path: "recipes" });
    if (!Array.isArray(data)) return [];
    return data
      .filter((entry) => entry.type === "file" && entry.name.endsWith(".md"))
      .map((entry) => entry.name.replace(/\.md$/, ""));
  } catch (err) {
    if (isNotFoundError(err)) return [];
    throw err;
  }
}

export async function createBranch(
  octokit: Octokit,
  repoRef: RepoRef,
  branchName: string,
  fromSha: string,
): Promise<void> {
  await octokit.rest.git.createRef({
    ...repoRef,
    ref: `refs/heads/${branchName}`,
    sha: fromSha,
  });
}

export async function createRecipeFile(
  octokit: Octokit,
  repoRef: RepoRef,
  opts: { path: string; content: string; branch: string; message: string },
): Promise<void> {
  await octokit.rest.repos.createOrUpdateFileContents({
    ...repoRef,
    path: opts.path,
    message: opts.message,
    content: Buffer.from(opts.content, "utf8").toString("base64"),
    branch: opts.branch,
  });
}

export interface OpenPullRequestParams {
  title: string;
  head: string;
  base: string;
  body: string;
}

export async function openPullRequest(
  octokit: Octokit,
  repoRef: RepoRef,
  params: OpenPullRequestParams,
): Promise<string> {
  const { data } = await octokit.rest.pulls.create({ ...repoRef, ...params });
  return data.html_url;
}

// PR title/body per design doc "Submit" step 8d: title names the model and
// hardware, body has a skim-able summary table, credits the submitter, and
// carries an HTML-comment submitter id for traceability independent of the
// (mutable) @handle text.
export function buildPullRequestContent(
  recipe: Recipe,
  submitterId: number,
): { title: string; body: string } {
  const title = `Add recipe: ${recipe.model} (${recipe.hardware.gpu_count}x${recipe.hardware.gpu_model})`;

  const rows: [string, string][] = [
    ["Model", recipe.model],
    ["Engine source", recipe.engine_source],
    ["GPU", `${recipe.hardware.gpu_count}x ${recipe.hardware.gpu_model}`],
    ["NAI version", recipe.nai_version],
    ["KV cache aware routing", String(recipe.kv_cache_aware_routing)],
  ];
  const table = [
    "| Field | Value |",
    "| --- | --- |",
    ...rows.map(([field, value]) => `| ${field} | ${value} |`),
  ].join("\n");

  const body = [table, "", `Submitted by @${recipe.submitted_by}`, "", `<!-- submitter-id: ${submitterId} -->`].join(
    "\n",
  );

  return { title, body };
}
