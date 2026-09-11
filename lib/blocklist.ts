import fs from "node:fs";
import path from "node:path";

const DEFAULT_BLOCKLIST_PATH = path.join(process.cwd(), "config", "blocklist.json");

function loadBlocklist(filePath: string): Set<string> {
  const raw = fs.readFileSync(filePath, "utf8");
  const handles: unknown = JSON.parse(raw);
  if (!Array.isArray(handles) || !handles.every((h) => typeof h === "string")) {
    throw new Error(`${filePath} must contain a JSON array of GitHub handles`);
  }
  return new Set(handles.map((h) => h.toLowerCase()));
}

// GitHub handles are case-insensitive, so blocklist membership is checked
// case-insensitively too. Re-reads the file on every call rather than
// caching: it's small, and a maintainer editing the blocklist shouldn't
// require a redeploy to take effect.
export function isBlocked(login: string, filePath: string = DEFAULT_BLOCKLIST_PATH): boolean {
  return loadBlocklist(filePath).has(login.toLowerCase());
}
