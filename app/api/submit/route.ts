import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isBlocked } from "@/lib/blocklist";
import { checkRateLimit } from "@/lib/ratelimit";
import { recipeSubmissionSchema } from "@/lib/schema";
import { buildRecipe, serializeRecipe } from "@/lib/serialize";
import { deriveSlug, resolveSlugCollision } from "@/lib/slug";
import {
  buildPullRequestContent,
  createBranch,
  createGithubClient,
  createRecipeFile,
  getBranchSha,
  listRecipeSlugs,
  openPullRequest,
  type RepoRef,
} from "@/lib/github";

// Content repo = this repo; see design doc's resolved open items.
const DEFAULT_BRANCH = "main";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Rate limit exceeded. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

// See design doc "Submit (POST /api/submit)" for the numbered flow this
// follows step for step: 401 -> 403 -> 429 -> 422 -> inject server fields
// -> slug/collision -> serialize -> branch/file/PR via the bot token ->
// { prUrl }. Branch creation is the first GitHub write; if anything after
// it fails, we log the orphan branch for manual cleanup and return 502
// rather than leave a half-open PR.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (isBlocked(session.login)) {
    return NextResponse.json({ error: "This account cannot submit recipes" }, { status: 403 });
  }

  // Checked sequentially, not both unconditionally: a request already
  // rejected for exceeding the session limit shouldn't also spend an
  // increment of the IP bucket.
  const sessionLimit = checkRateLimit(`session:${session.login}`);
  if (!sessionLimit.allowed) {
    return rateLimitResponse(sessionLimit.retryAfterSeconds ?? 0);
  }
  const ipLimit = checkRateLimit(`ip:${getClientIp(request)}`);
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds ?? 0);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 422 });
  }

  const parsed = recipeSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid recipe", issues: parsed.error.issues }, { status: 422 });
  }

  const submittedAt = new Date().toISOString().slice(0, 10);
  const recipe = buildRecipe(parsed.data, { submitted_by: session.login, submitted_at: submittedAt });

  const repoRef: RepoRef = {
    owner: process.env.CONTENT_REPO_OWNER ?? "",
    repo: process.env.CONTENT_REPO_NAME ?? "",
  };
  const octokit = createGithubClient(process.env.BOT_GITHUB_TOKEN ?? "");

  const existingSlugs = await listRecipeSlugs(octokit, repoRef);
  const slug = resolveSlugCollision(deriveSlug(recipe.model, recipe.hardware), existingSlugs);
  const branchName = `recipe/${slug}`;
  const fileContent = serializeRecipe(recipe, parsed.data.notes);

  let branchCreated = false;
  try {
    const baseSha = await getBranchSha(octokit, repoRef, DEFAULT_BRANCH);

    await createBranch(octokit, repoRef, branchName, baseSha);
    branchCreated = true;

    await createRecipeFile(octokit, repoRef, {
      path: `recipes/${slug}.md`,
      content: fileContent,
      branch: branchName,
      message: `Add recipe: ${recipe.model}`,
    });

    const { title, body } = buildPullRequestContent(recipe, session.githubId);
    const prUrl = await openPullRequest(octokit, repoRef, {
      title,
      head: branchName,
      base: DEFAULT_BRANCH,
      body,
    });

    return NextResponse.json({ prUrl });
  } catch (err) {
    if (branchCreated) {
      console.error(
        `/api/submit: failed after creating branch "${branchName}" — orphan branch needs manual cleanup`,
        err,
      );
    } else {
      console.error("/api/submit: failed before creating a branch", err);
    }
    return NextResponse.json({ error: "Failed to open pull request. Please try again." }, { status: 502 });
  }
}
