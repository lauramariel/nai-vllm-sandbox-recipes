import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cardClass, mutedTextClass } from "../ui";
import { SignInButton, SignOutButton } from "./AuthButtons";
import { SubmitForm } from "./SubmitForm";

function contributingUrl(): string {
  const owner = process.env.CONTENT_REPO_OWNER ?? "";
  const repo = process.env.CONTENT_REPO_NAME ?? "";
  return `https://github.com/${owner}/${repo}/blob/main/CONTRIBUTING.md`;
}

function ManualPrNote() {
  return (
    <p className={mutedTextClass}>
      Prefer to skip the form? You can open a PR by hand instead — see{" "}
      <a
        href={contributingUrl()}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 hover:underline dark:text-blue-400"
      >
        CONTRIBUTING.md
      </a>
      .
    </p>
  );
}

export default async function SubmitPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8">
        <h1 className="text-2xl font-bold tracking-tight">Submit a recipe</h1>
        <ManualPrNote />
        <div className={`${cardClass} space-y-4`}>
          <p>Sign in with GitHub to submit a recipe (identity only — no write access is requested).</p>
          <SignInButton />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Submit a recipe</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className={mutedTextClass}>
            Signed in as <strong className="text-gray-900 dark:text-gray-100">@{session.login}</strong>
          </span>
          <SignOutButton />
        </div>
      </div>
      <ManualPrNote />
      <SubmitForm login={session.login} />
    </main>
  );
}
