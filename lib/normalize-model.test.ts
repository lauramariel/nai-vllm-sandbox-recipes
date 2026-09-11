import { describe, expect, it } from "vitest";
import { normalizeModelInput } from "./normalize-model";

describe("normalizeModelInput", () => {
  it("passes a bare org/name through unchanged", () => {
    expect(normalizeModelInput("meta-llama/Llama-3.3-70B-Instruct")).toBe(
      "meta-llama/Llama-3.3-70B-Instruct",
    );
  });

  it("strips a full Hugging Face URL", () => {
    expect(normalizeModelInput("https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct")).toBe(
      "meta-llama/Llama-3.3-70B-Instruct",
    );
  });

  it("strips a www. and http:// variant", () => {
    expect(normalizeModelInput("http://www.huggingface.co/org/name")).toBe("org/name");
  });

  it("strips a trailing slash left over from a URL", () => {
    expect(normalizeModelInput("https://huggingface.co/org/name/")).toBe("org/name");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeModelInput("  org/name  ")).toBe("org/name");
  });
});
