import { describe, expect, it } from "vitest";
import { parseEnvVarsText, parseVllmArgsText } from "./parse-form-text";

describe("parseVllmArgsText", () => {
  it("splits one arg per line, preserving inline values", () => {
    expect(parseVllmArgsText("--dtype bfloat16\n--max-model-len 25600")).toEqual([
      "--dtype bfloat16",
      "--max-model-len 25600",
    ]);
  });

  it("trims lines and drops blank ones", () => {
    expect(parseVllmArgsText("  --dtype bfloat16  \n\n\n--foo\n")).toEqual([
      "--dtype bfloat16",
      "--foo",
    ]);
  });

  it("returns [] for empty input", () => {
    expect(parseVllmArgsText("")).toEqual([]);
    expect(parseVllmArgsText("   \n  \n")).toEqual([]);
  });
});

describe("parseEnvVarsText", () => {
  it("parses KEY=value lines into a record", () => {
    expect(parseEnvVarsText("VLLM_CPU_KVCACHE_SPACE=8\nFOO=bar")).toEqual({
      VLLM_CPU_KVCACHE_SPACE: "8",
      FOO: "bar",
    });
  });

  it("splits on the first = only, so values containing = survive intact", () => {
    expect(parseEnvVarsText("QUERY=a=b=c")).toEqual({ QUERY: "a=b=c" });
  });

  it("trims whitespace around key and value", () => {
    expect(parseEnvVarsText("  FOO  =  bar  ")).toEqual({ FOO: "bar" });
  });

  it("skips blank lines and lines with no =", () => {
    expect(parseEnvVarsText("FOO=bar\n\nnotanenvvar\nBAZ=qux")).toEqual({
      FOO: "bar",
      BAZ: "qux",
    });
  });

  it("returns {} for empty input", () => {
    expect(parseEnvVarsText("")).toEqual({});
  });
});
