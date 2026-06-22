import "next-auth";

declare module "next-auth" {
  interface User {
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    customExpiry?: number;
  }
}
