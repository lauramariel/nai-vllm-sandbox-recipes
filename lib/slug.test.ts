import { describe, expect, it } from "vitest";
import { deriveSlug, resolveSlugCollision, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and collapses non-alphanumeric runs to a single dash", () => {
    expect(slugify("Llama-3.3-70B-Instruct-4xH100-80GB")).toBe(
      "llama-3-3-70b-instruct-4xh100-80gb",
    );
  });

  it("trims leading/trailing dashes produced by the collapse", () => {
    expect(slugify("--Weird--Name!!")).toBe("weird-name");
  });
});

describe("deriveSlug", () => {
  it("derives a slug from the design doc's worked example", () => {
    // Design doc's own example text is "llama-3.3-70b-instruct-4xh100-80gb"
    // (a literal dot), which conflicts with its own stated rule that all
    // non-alphanumerics collapse to "-". This follows the stated rule.
    expect(
      deriveSlug("meta-llama/Llama-3.3-70B-Instruct", {
        gpu_count: 4,
        gpu_model: "H100-80GB",
      }),
    ).toBe("llama-3-3-70b-instruct-4xh100-80gb");
  });

  it("drops the org prefix, keeping only the model name", () => {
    const slug = deriveSlug("org-name/Model-Name", {
      gpu_count: 2,
      gpu_model: "A100",
    });
    expect(slug.startsWith("org-name")).toBe(false);
    expect(slug).toBe("model-name-2xa100");
  });
});

describe("resolveSlugCollision", () => {
  it("returns the base slug when there is no collision", () => {
    expect(resolveSlugCollision("llama-3-3-4xh100", ["some-other-slug"])).toBe(
      "llama-3-3-4xh100",
    );
  });

  it("appends -2 on a single collision", () => {
    expect(resolveSlugCollision("llama-3-3-4xh100", ["llama-3-3-4xh100"])).toBe(
      "llama-3-3-4xh100-2",
    );
  });

  it("finds the next free suffix across multiple collisions", () => {
    expect(
      resolveSlugCollision("llama-3-3-4xh100", [
        "llama-3-3-4xh100",
        "llama-3-3-4xh100-2",
        "llama-3-3-4xh100-3",
      ]),
    ).toBe("llama-3-3-4xh100-4");
  });
});
