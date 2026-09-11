"use client";

import { signIn, signOut } from "next-auth/react";
import { buttonPrimaryClass, buttonSecondaryClass } from "../ui";

export function SignInButton() {
  return (
    <button type="button" onClick={() => signIn("github")} className={buttonPrimaryClass}>
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
