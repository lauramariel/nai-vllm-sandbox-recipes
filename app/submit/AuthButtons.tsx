"use client";

import { signIn, signOut } from "next-auth/react";

// Tailwind's preflight reset strips default button chrome (border,
// background, cursor), so an unstyled <button> renders as plain,
// non-obviously-clickable text. Minimal styling here for that reason —
// the real form UI (Phase 10) replaces this stub entirely.
const buttonClassName =
  "rounded-md border border-gray-300 px-4 py-2 font-medium cursor-pointer hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800";

export function SignInButton() {
  return (
    <button type="button" onClick={() => signIn("github")} className={buttonClassName}>
      Sign in with GitHub
    </button>
  );
}

export function SignOutButton() {
  return (
    <button type="button" onClick={() => signOut()} className={buttonClassName}>
      Sign out
    </button>
  );
}
