import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const TSX_BIN = path.join(process.cwd(), "node_modules", ".bin", "tsx");
const SCRIPT = path.join(process.cwd(), "scripts", "validate-recipes.ts");

function runValidate(dir: string) {
  return spawnSync(TSX_BIN, [SCRIPT, dir], { encoding: "utf8" });
}

describe("validate-recipes script", () => {
  it(
    "exits 0 for a directory of valid recipes",
    () => {
      const dir = path.join(process.cwd(), "lib/__fixtures__/seed-recipes");
      const result = runValidate(dir);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/OK/);
    },
    15000,
  );

  it(
    "exits non-zero and names the offending file for a bad recipe",
    () => {
      const dir = path.join(process.cwd(), "lib/__fixtures__/mixed-recipes");
      const result = runValidate(dir);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/bad-recipe\.md/);
      expect(result.stderr).not.toMatch(/good-recipe\.md/);
    },
    15000,
  );

  it(
    "exits 0 for the real /recipes dir (empty until a real submission merges)",
    () => {
      const result = runValidate(path.join(process.cwd(), "recipes"));
      expect(result.status).toBe(0);
    },
    15000,
  );
});
