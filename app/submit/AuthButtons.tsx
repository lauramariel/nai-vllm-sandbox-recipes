"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return (
    <button type="button" onClick={() => signIn("github")}>
      Sign in with GitHub
    </button>
  );
}

export function SignOutButton() {
  return (
    <button type="button" onClick={() => signOut()}>
      Sign out
    </button>
  );
}
