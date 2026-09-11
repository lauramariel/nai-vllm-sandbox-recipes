// Module augmentation: the session/JWT carry the verified GitHub identity
// ({ login, id, avatar_url }) per the design doc, not next-auth's default
// name/email/image shape.
//
// The `import type {}` below is required, not decorative: without a
// top-level import/export, TS treats this file as a script and the
// `declare module "next-auth"` blocks below as brand-new ambient module
// declarations rather than augmentations of the real package — which
// silently shadows every real export (AuthOptions, getServerSession, the
// default export) with just the fields added here.
import type {} from "next-auth";
import type {} from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    login: string;
    githubId: number;
    avatar_url: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    login?: string;
    githubId?: number;
    avatar_url?: string;
  }
}
