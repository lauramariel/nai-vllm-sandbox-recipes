import path from "node:path";
import { describe, expect, it } from "vitest";
import { isBlocked } from "./blocklist";

const FIXTURE = path.join(__dirname, "__fixtures__", "blocklists", "with-handles.json");

describe("isBlocked", () => {
  it("returns true for a handle on the blocklist", () => {
    expect(isBlocked("bad-actor", FIXTURE)).toBe(true);
  });

  it("matches case-insensitively (GitHub handles are case-insensitive)", () => {
    expect(isBlocked("BAD-ACTOR", FIXTURE)).toBe(true);
    expect(isBlocked("another-bad-actor", FIXTURE)).toBe(true);
  });

  it("returns false for a handle not on the blocklist", () => {
    expect(isBlocked("laura-m", FIXTURE)).toBe(false);
  });

  it("returns false for every handle against the real (empty) blocklist", () => {
    expect(isBlocked("anyone")).toBe(false);
  });
});
