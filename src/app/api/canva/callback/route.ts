import { exchangeCodeForToken, saveConnection } from "@/lib/canva";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("canva_oauth_state")?.value;
  const verifier = cookieStore.get("canva_pkce_verifier")?.value;
  cookieStore.delete("canva_oauth_state");
  cookieStore.delete("canva_pkce_verifier");

  if (error) {
    return NextResponse.redirect(new URL(`/settings?canva=error&message=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state || !verifier || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?canva=error&message=state_mismatch", req.url));
  }

  try {
    const tokens = await exchangeCodeForToken({
      code,
      redirectUri: process.env.CANVA_REDIRECT_URI!,
      codeVerifier: verifier,
    });
    await saveConnection(tokens);
    return NextResponse.redirect(new URL("/settings?canva=connected", req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(new URL(`/settings?canva=error&message=${encodeURIComponent(message)}`, req.url));
  }
}
