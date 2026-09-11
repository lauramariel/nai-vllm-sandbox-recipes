import Link from "next/link";
import { buttonPrimaryClass } from "./ui";

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          NAI vLLM Sandbox Recipes
        </Link>
        <Link href="/submit" className={buttonPrimaryClass}>
          Submit a recipe
        </Link>
      </div>
    </header>
  );
}
