import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/blocklist", () => ({
  isBlocked: vi.fn(() => false),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
}));

const githubMocks = vi.hoisted(() => ({
  getBranch: vi.fn(),
  getContent: vi.fn(),
  createOrUpdateFileContents: vi.fn(),
  createRef: vi.fn(),
  pullsCreate: vi.fn(),
}));

vi.mock("@/lib/github", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/github")>();
  return {
    ...actual,
    createGithubClient: vi.fn(() => ({
      rest: {
        repos: {
          getBranch: githubMocks.getBranch,
          getContent: githubMocks.getContent,
          createOrUpdateFileContents: githubMocks.createOrUpdateFileContents,
        },
        git: { createRef: githubMocks.createRef },
        pulls: { create: githubMocks.pullsCreate },
      },
    })),
  };
});

import { getServerSession } from "next-auth";
import { isBlocked } from "@/lib/blocklist";
import { checkRateLimit } from "@/lib/ratelimit";
import { deriveSlug } from "@/lib/slug";
import { POST } from "./route";

const validSession = {
  login: "laura-m",
  githubId: 12345,
  avatar_url: "https://example.com/a.png",
  user: {},
  expires: "2099-01-01",
};

const validPayload = {
  model: "meta-llama/Llama-3.3-70B-Instruct",
  nai_version: "2.8",
  engine_source: "nai",
  kv_cache_aware_routing: true,
  hardware: { gpu_model: "H100-80GB", gpu_count: 4 },
  notes: "Worked great on the first try.",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue(validSession as never);
  vi.mocked(isBlocked).mockReturnValue(false);
  vi.mocked(checkRateLimit).mockReturnValue({ allowed: true });
  githubMocks.getBranch.mockResolvedValue({ data: { commit: { sha: "base-sha" } } });
  githubMocks.getContent.mockResolvedValue({ data: [] });
  githubMocks.createRef.mockResolvedValue({});
  githubMocks.createOrUpdateFileContents.mockResolvedValue({});
  githubMocks.pullsCreate.mockResolvedValue({
    data: { html_url: "https://github.com/lauramariel/nai-vllm-sandbox-recipes/pull/1" },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/submit", () => {
  it("happy path: creates branch, file, and PR in order; returns prUrl", async () => {
    const response = await POST(makeRequest(validPayload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ prUrl: "https://github.com/lauramariel/nai-vllm-sandbox-recipes/pull/1" });

    expect(githubMocks.getBranch.mock.invocationCallOrder[0]).toBeLessThan(
      githubMocks.createRef.mock.invocationCallOrder[0],
    );
    expect(githubMocks.createRef.mock.invocationCallOrder[0]).toBeLessThan(
      githubMocks.createOrUpdateFileContents.mock.invocationCallOrder[0],
    );
    expect(githubMocks.createOrUpdateFileContents.mock.invocationCallOrder[0]).toBeLessThan(
      githubMocks.pullsCreate.mock.invocationCallOrder[0],
    );

    const prCall = githubMocks.pullsCreate.mock.calls[0][0];
    expect(prCall.body).toMatch(/Submitted by @laura-m/);
    expect(prCall.body).toMatch(/<!-- submitter-id: 12345 -->/);
  });

  it("returns 401 with no session, and makes no GitHub calls", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await POST(makeRequest(validPayload));
    expect(response.status).toBe(401);
    expect(githubMocks.createRef).not.toHaveBeenCalled();
  });

  it("returns 403 for a blocked handle", async () => {
    vi.mocked(isBlocked).mockReturnValue(true);
    const response = await POST(makeRequest(validPayload));
    expect(response.status).toBe(403);
    expect(githubMocks.createRef).not.toHaveBeenCalled();
  });

  it("returns 422 for an invalid body", async () => {
    const { hardware: _hardware, ...invalidPayload } = validPayload;
    const response = await POST(makeRequest(invalidPayload));
    expect(response.status).toBe(422);
    expect(githubMocks.createRef).not.toHaveBeenCalled();
  });

  it("appends a numeric suffix on slug collision", async () => {
    const baseSlug = deriveSlug(validPayload.model, validPayload.hardware);
    githubMocks.getContent.mockResolvedValue({ data: [{ type: "file", name: `${baseSlug}.md` }] });

    await POST(makeRequest(validPayload));

    expect(githubMocks.createRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: `refs/heads/recipe/${baseSlug}-2` }),
    );
    expect(githubMocks.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ path: `recipes/${baseSlug}-2.md` }),
    );
  });

  it("returns 502 and logs the orphan branch when a step after branch creation fails", async () => {
    githubMocks.createOrUpdateFileContents.mockRejectedValue(new Error("boom"));

    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(502);
    expect(githubMocks.createRef).toHaveBeenCalled();
    expect(githubMocks.pullsCreate).not.toHaveBeenCalled();

    const baseSlug = deriveSlug(validPayload.model, validPayload.hardware);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(`recipe/${baseSlug}`),
      expect.any(Error),
    );
  });

  it("returns 429 with a Retry-After header when the rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, retryAfterSeconds: 42 });

    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(githubMocks.createRef).not.toHaveBeenCalled();
  });
});
