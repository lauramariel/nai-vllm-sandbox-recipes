// Lets the form accept pasted, multi-line text for vllm_args and env_vars
// instead of one input row per entry.

export function parseVllmArgsText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

// One KEY=value per line. Splits on the first "=" only, so values
// containing "=" (base64, query strings) survive intact. Lines with no
// "=" or an empty key are silently skipped — nothing meaningful to
// extract from them, and the schema's key-regex check still catches any
// key that *was* extracted but is malformed.
export function parseEnvVarsText(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "") continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (key === "") continue;

    result[key] = value;
  }
  return result;
}
