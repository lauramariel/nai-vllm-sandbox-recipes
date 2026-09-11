"use client";

import { signIn, signOut } from "next-auth/react";
import { GitHubLogo } from "../GitHubLogo";
import { buttonSecondaryClass } from "../ui";

// GitHub's own dark brand color, not the site's purple — the standard
// convention for "Sign in with GitHub" buttons, so it reads as a GitHub
// action rather than a site action.
const githubButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#24292e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer hover:bg-[#1b1f23] focus:outline-none focus:ring-2 focus:ring-gray-500/50";

export function SignInButton() {
  return (
    <button type="button" onClick={() => signIn("github")} className={githubButtonClass}>
      <GitHubLogo />
      Sign in with GitHub
    </button>
  );
}

export function SignOutButton() {
  return (
    <button type="button" onClick={() => signOut()} className={`${buttonSecondaryClass} text-xs`}>
      Sign out
    </button>
  );
}
