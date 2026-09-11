const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

interface Bucket {
  count: number;
  windowStart: number;
}

// Per-key sliding-window-by-reset counters. /api/submit (Phase 9) calls
// this once per session key and once per IP key, rejecting if either is
// exceeded. In-memory is acceptable for v1 (design doc "Rate limiting") —
// counters reset on redeploy/cold start, and don't share state across
// serverless instances; Vercel KV is the drop-in if that durability is
// wanted later.
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (bucket.count < MAX_REQUESTS_PER_WINDOW) {
    bucket.count += 1;
    return { allowed: true };
  }

  const retryAfterSeconds = Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000);
  return { allowed: false, retryAfterSeconds };
}
