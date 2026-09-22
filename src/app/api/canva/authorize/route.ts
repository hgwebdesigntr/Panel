import { auth } from "@/auth";
import { buildAuthorizeUrl, createPkcePair } from "@/lib/canva";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifier, challenge } = createPkcePair();
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = process.env.CANVA_REDIRECT_URI!;

  const cookieStore = await cookies();
  cookieStore.set("canva_pkce_verifier", verifier, { httpOnly: true, secure: true, maxAge: 600, path: "/" });
  cookieStore.set("canva_oauth_state", state, { httpOnly: true, secure: true, maxAge: 600, path: "/" });

  const url = buildAuthorizeUrl({ redirectUri, state, codeChallenge: challenge });
  return NextResponse.redirect(url);
}
