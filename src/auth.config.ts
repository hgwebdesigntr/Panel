import type { NextAuthConfig } from "next-auth";

const REMEMBER_MAX = 30 * 24 * 60 * 60; // 30 gün
const SHORT_MAX = 8 * 60 * 60;           // 8 saat

export default {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: REMEMBER_MAX },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? true;
        token.customExpiry = Math.floor(Date.now() / 1000) + (rememberMe ? REMEMBER_MAX : SHORT_MAX);
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).customExpiry = token.customExpiry;
      return session;
    },
    authorized({ auth }) {
      if (!auth?.user) return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const expiry = (auth as any).customExpiry as number | undefined;
      if (expiry && Math.floor(Date.now() / 1000) > expiry) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
