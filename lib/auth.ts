import type { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import type { GithubProfile } from "next-auth/providers/github";

// Identity only — see design doc "Login (identity only)": read:user scope,
// JWT session, no database adapter. A leaked user session can never write
// to the repo; only the bot token (used server-side in /api/submit) can.
export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      authorization: { params: { scope: "read:user" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const githubProfile = profile as GithubProfile;
        token.login = githubProfile.login;
        token.githubId = githubProfile.id;
        token.avatar_url = githubProfile.avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      session.login = token.login as string;
      session.githubId = token.githubId as number;
      session.avatar_url = token.avatar_url as string;
      return session;
    },
  },
};
