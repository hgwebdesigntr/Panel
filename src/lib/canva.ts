import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

const AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const API_BASE = "https://api.canva.com/rest/v1";

export const CANVA_SCOPES = [
  "brandtemplate:content:read",
  "brandtemplate:meta:read",
  "design:content:write",
  "design:meta:read",
  "asset:write",
].join(" ");

function base64url(input: Buffer) {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createPkcePair() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function buildAuthorizeUrl({
  redirectUri,
  state,
  codeChallenge,
}: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CANVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: CANVA_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

function basicAuthHeader() {
  const raw = `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export async function exchangeCodeForToken({
  code,
  redirectUri,
  codeVerifier,
}: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    throw new Error(`Canva token değişimi başarısız (${res.status}): ${await res.text()}`);
  }

  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

async function refreshToken(refresh_token: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
  });

  if (!res.ok) {
    throw new Error(`Canva token yenileme başarısız (${res.status}): ${await res.text()}`);
  }

  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

export async function saveConnection(tokens: { access_token: string; refresh_token: string; expires_in: number }) {
  await prisma.canvaConnection.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
}

export async function getValidAccessToken(): Promise<string> {
  const conn = await prisma.canvaConnection.findUnique({ where: { id: "default" } });
  if (!conn) {
    throw new Error("Canva hesabı bağlı değil. Panelden Canva'ya bağlanman gerekiyor.");
  }

  // 2 dakikalık pay bırakarak erken yenile.
  if (conn.expiresAt.getTime() > Date.now() + 120_000) {
    return conn.accessToken;
  }

  const tokens = await refreshToken(conn.refreshToken);
  await saveConnection(tokens);
  return tokens.access_token;
}

export async function isCanvaConnected() {
  const conn = await prisma.canvaConnection.findUnique({ where: { id: "default" } });
  return Boolean(conn);
}

async function canvaFetch(path: string, init: RequestInit = {}) {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Canva API hata (${path}, ${res.status}): ${await res.text()}`);
  }
  return res.json();
}

type AutofillField =
  | { type: "text"; text: string }
  | { type: "image"; asset_id: string };

interface JobResult {
  status: string;
  [key: string]: unknown;
}

export async function runAutofill(brandTemplateId: string, data: Record<string, AutofillField>) {
  const created = (await canvaFetch("/autofills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brand_template_id: brandTemplateId, data }),
  })) as { job: { id: string; status: string } };

  return pollJob(created.job.id, `/autofills/${created.job.id}`, (r) => (r as { job: JobResult }).job);
}

export async function exportDesignAsPdf(designId: string) {
  const created = (await canvaFetch("/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: designId, format: { type: "pdf" } }),
  })) as { job: { id: string; status: string } };

  return pollJob(created.job.id, `/exports/${created.job.id}`, (r) => (r as { job: JobResult }).job);
}

async function pollJob(
  jobId: string,
  path: string,
  extract: (r: unknown) => JobResult,
  { intervalMs = 1500, maxAttempts = 30 } = {}
): Promise<JobResult> {
  for (let i = 0; i < maxAttempts; i += 1) {
    const result = await canvaFetch(path);
    const job = extract(result);
    if (job.status === "success") return job;
    if (job.status === "failed") throw new Error(`Canva işi başarısız oldu (${jobId}): ${JSON.stringify(job)}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Canva işi zaman aşımına uğradı (${jobId})`);
}

export async function uploadAssetFromUrl(imageUrl: string, name: string) {
  const imageRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const token = await getValidAccessToken();

  const created = await fetch(`${API_BASE}/asset-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: Buffer.from(name).toString("base64") }),
    },
    body: buffer,
  });
  if (!created.ok) {
    throw new Error(`Canva asset yükleme başarısız (${created.status}): ${await created.text()}`);
  }
  const job = (await created.json()) as { job: { id: string; status: string } };

  const done = await pollJob(job.job.id, `/asset-uploads/${job.job.id}`, (r) => (r as { job: JobResult }).job);
  return (done.asset as { id: string }).id;
}
