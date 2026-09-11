"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium cursor-pointer hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
