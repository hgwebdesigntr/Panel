import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
        rememberMe: { label: "Beni Hatırla", type: "checkbox" },
        captcha: { label: "reCAPTCHA", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        // reCAPTCHA doğrulama (key varsa)
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        if (secretKey) {
          if (!credentials.captcha) return null;
          const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${secretKey}&response=${credentials.captcha}`,
          });
          const verifyData = await verifyRes.json() as { success: boolean };
          if (!verifyData.success) return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          rememberMe: credentials.rememberMe === "on",
        };
      },
    }),
  ],
});
