import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./ratelimit";

describe("checkRateLimit", () => {
  it("allows up to 5 requests in a window", () => {
    const key = "session:allows-5";
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, now).allowed).toBe(true);
    }
  });

  it("rejects the 6th request in the same window", () => {
    const key = "session:rejects-6th";
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, now);
    }
    const result = checkRateLimit(key, now);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("allows requests again once the window has passed", () => {
    const key = "session:window-reset";
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, start);
    }
    expect(checkRateLimit(key, start).allowed).toBe(false);

    const afterWindow = start + 60 * 60 * 1000 + 1;
    expect(checkRateLimit(key, afterWindow).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const now = Date.now();
    const keyA = "ip:1.2.3.4";
    const keyB = "ip:5.6.7.8";
    for (let i = 0; i < 5; i++) {
      checkRateLimit(keyA, now);
    }
    expect(checkRateLimit(keyA, now).allowed).toBe(false);
    expect(checkRateLimit(keyB, now).allowed).toBe(true);
  });

  it("retryAfterSeconds counts down toward the window boundary", () => {
    const key = "session:retry-after";
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, start);
    }
    const almostExpired = start + 60 * 60 * 1000 - 5000;
    const result = checkRateLimit(key, almostExpired);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(5);
  });
});
