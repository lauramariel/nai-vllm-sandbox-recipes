import { describe, expect, it, vi } from "vitest";
import type { Octokit } from "@octokit/rest";
import {
  buildPullRequestContent,
  createBranch,
  createRecipeFile,
  getBranchSha,
  listRecipeSlugs,
  openPullRequest,
} from "./github";
import { recipeSchema, type Recipe } from "./schema";

const repoRef = { owner: "lauramariel", repo: "nai-vllm-sandbox-recipes" };

const recipe: Recipe = recipeSchema.parse({
  model: "meta-llama/Llama-3.3-70B-Instruct",
  nai_version: "2.8",
  engine_source: "nai",
  kv_cache_aware_routing: true,
  hardware: {
    gpu_model: "H100-80GB",
    gpu_count: 4,
    node_allocation: "single",
    instances: 1,
    vcpus_per_instance: 32,
    host_memory_per_instance_gib: 256,
  },
  submitted_by: "laura-m",
  submitted_at: "2026-09-10",
});

function fakeOctokit(overrides: Record<string, unknown> = {}): Octokit {
  return {
    rest: {
      repos: {
        getBranch: vi.fn(),
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
      },
      git: { createRef: vi.fn() },
      pulls: { create: vi.fn() },
      ...overrides,
    },
  } as unknown as Octokit;
}

describe("getBranchSha", () => {
  it("returns the branch's commit sha", async () => {
    const octokit = fakeOctokit({
      repos: {
        getBranch: vi.fn().mockResolvedValue({ data: { commit: { sha: "abc123" } } }),
      },
    });
    expect(await getBranchSha(octokit, repoRef, "main")).toBe("abc123");
    expect(octokit.rest.repos.getBranch).toHaveBeenCalledWith({ ...repoRef, branch: "main" });
  });
});

describe("listRecipeSlugs", () => {
  it("returns slugs derived from .md filenames, ignoring non-.md entries", async () => {
    const octokit = fakeOctokit({
      repos: {
        getContent: vi.fn().mockResolvedValue({
          data: [
            { type: "file", name: "llama-3-3-70b-4xh100.md" },
            { type: "file", name: "qwen2-5-32b-2xa100.md" },
            { type: "file", name: "README.md" },
            { type: "dir", name: "some-subdir" },
          ],
        }),
      },
    });
    const slugs = await listRecipeSlugs(octokit, repoRef);
    expect(slugs.sort()).toEqual(["README", "llama-3-3-70b-4xh100", "qwen2-5-32b-2xa100"].sort());
  });

  it("returns [] when /recipes/ doesn't exist yet (404)", async () => {
    const octokit = fakeOctokit({
      repos: {
        getContent: vi.fn().mockRejectedValue({ status: 404 }),
      },
    });
    expect(await listRecipeSlugs(octokit, repoRef)).toEqual([]);
  });

  it("rethrows non-404 errors", async () => {
    const octokit = fakeOctokit({
      repos: {
        getContent: vi.fn().mockRejectedValue({ status: 500 }),
      },
    });
    await expect(listRecipeSlugs(octokit, repoRef)).rejects.toMatchObject({ status: 500 });
  });
});

describe("createBranch", () => {
  it("creates a ref under refs/heads/ from the given sha", async () => {
    const octokit = fakeOctokit();
    await createBranch(octokit, repoRef, "recipe/my-slug", "abc123");
    expect(octokit.rest.git.createRef).toHaveBeenCalledWith({
      ...repoRef,
      ref: "refs/heads/recipe/my-slug",
      sha: "abc123",
    });
  });
});

describe("createRecipeFile", () => {
  it("base64-encodes the content and passes through path/branch/message", async () => {
    const octokit = fakeOctokit();
    await createRecipeFile(octokit, repoRef, {
      path: "recipes/my-slug.md",
      content: "hello",
      branch: "recipe/my-slug",
      message: "Add recipe: hello",
    });
    expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
      ...repoRef,
      path: "recipes/my-slug.md",
      message: "Add recipe: hello",
      content: Buffer.from("hello", "utf8").toString("base64"),
      branch: "recipe/my-slug",
    });
  });
});

describe("openPullRequest", () => {
  it("returns the created PR's html_url", async () => {
    const octokit = fakeOctokit({
      pulls: {
        create: vi.fn().mockResolvedValue({ data: { html_url: "https://github.com/x/y/pull/1" } }),
      },
    });
    const url = await openPullRequest(octokit, repoRef, {
      title: "t",
      head: "recipe/my-slug",
      base: "main",
      body: "b",
    });
    expect(url).toBe("https://github.com/x/y/pull/1");
  });
});

describe("buildPullRequestContent", () => {
  it("titles the PR with model and hardware", () => {
    const { title } = buildPullRequestContent(recipe, 12345);
    expect(title).toBe("Add recipe: meta-llama/Llama-3.3-70B-Instruct (4xH100-80GB)");
  });

  it("body credits the submitter and carries a submitter-id comment", () => {
    const { body } = buildPullRequestContent(recipe, 12345);
    expect(body).toMatch(/Submitted by @laura-m/);
    expect(body).toMatch(/<!-- submitter-id: 12345 -->/);
    expect(body).toMatch(/\| Model \| meta-llama\/Llama-3\.3-70B-Instruct \|/);
  });
});
