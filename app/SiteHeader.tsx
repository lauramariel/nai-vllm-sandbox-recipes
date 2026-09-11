import Link from "next/link";
import { GitHubLogo } from "./GitHubLogo";
import { buttonPrimaryClass } from "./ui";

export function SiteHeader() {
  const owner = process.env.CONTENT_REPO_OWNER ?? "";
  const repo = process.env.CONTENT_REPO_NAME ?? "";
  const repoUrl = `https://github.com/${owner}/${repo}`;

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          NAI vLLM Sandbox Recipes
        </Link>
        <div className="flex items-center gap-4">
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
            className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <GitHubLogo className="h-6 w-6" />
          </a>
          <Link href="/submit" className={buttonPrimaryClass}>
            Submit a recipe
          </Link>
        </div>
      </div>
    </header>
  );
}
