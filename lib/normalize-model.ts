// The form accepts either a bare "org/name" repo id or a full Hugging
// Face URL and normalizes to "org/name" — see design doc, `model` field
// reference.
const HF_URL_PREFIX = /^https?:\/\/(www\.)?huggingface\.co\//i;

export function normalizeModelInput(raw: string): string {
  return raw.trim().replace(HF_URL_PREFIX, "").replace(/\/+$/, "");
}
