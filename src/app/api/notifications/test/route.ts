import { auth } from "@/auth";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE === "true" || parseInt(process.env.SMTP_PORT || "465") === 465,
    user: process.env.SMTP_USER,
    passLength: process.env.SMTP_PASS?.length ?? 0,
  };

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    await transport.verify();

    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: "Vercel SMTP Test",
      html: "<p>Vercel'den gönderildi. SMTP çalışıyor.</p>",
    });

    return NextResponse.json({ ok: true, config, response: info.response });
  } catch (e: unknown) {
    const err = e as Error & { code?: string; command?: string };
    return NextResponse.json({
      ok: false,
      config,
      error: err.message,
      code: err.code,
      command: err.command,
    });
  }
}
