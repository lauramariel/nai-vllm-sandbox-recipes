import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignInButton, SignOutButton } from "./AuthButtons";

// Phase 7 stub: sign-in state only. The real form (Phase 10) replaces this.
export default async function SubmitPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main>
        <h1>Submit a recipe</h1>
        <p>Sign in with GitHub to submit a recipe (identity only — no write access is requested).</p>
        <SignInButton />
      </main>
    );
  }

  return (
    <main>
      <h1>Submit a recipe</h1>
      <p>
        Signed in as <strong>@{session.login}</strong>.
      </p>
      <SignOutButton />
    </main>
  );
}
