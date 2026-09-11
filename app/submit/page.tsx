import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignInButton, SignOutButton } from "./AuthButtons";
import { SubmitForm } from "./SubmitForm";

export default async function SubmitPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Submit a recipe</h1>
        <p>Sign in with GitHub to submit a recipe (identity only — no write access is requested).</p>
        <SignInButton />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Submit a recipe</h1>
        <div className="flex items-center gap-3 text-sm">
          <span>
            Signed in as <strong>@{session.login}</strong>
          </span>
          <SignOutButton />
        </div>
      </div>
      <SubmitForm login={session.login} />
    </main>
  );
}
