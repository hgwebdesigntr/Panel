"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, AlertCircle } from "lucide-react";
const ReCAPTCHA = dynamic(() => import("react-google-recaptcha"), { ssr: false });

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function LoginPage() {
  const router = useRouter();
  const recaptchaRef = useRef<{ getValue: () => string | null; reset: () => void }>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let captcha = "";
    if (SITE_KEY) {
      captcha = recaptchaRef.current?.getValue() || "";
      if (!captcha) {
        setError("Lütfen robot olmadığınızı doğrulayın.");
        return;
      }
    }

    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      rememberMe: rememberMe ? "on" : "off",
      captcha,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      setError("E-posta veya şifre hatalı.");
      recaptchaRef.current?.reset();
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500 shadow-xl shadow-indigo-500/30 mb-4">
            <LayoutDashboard size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">İşletme Paneli</h1>
          <p className="text-slate-400 text-sm mt-1">Hesabınıza giriş yapın</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-posta"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
              autoComplete="email"
              className="bg-white/90"
            />
            <Input
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="bg-white/90"
            />

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-4 h-4 border-2 border-white/30 rounded peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-all" />
                {rememberMe && (
                  <svg className="absolute inset-0 w-4 h-4 text-white p-0.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-slate-300">Beni hatırla</span>
            </label>

            {SITE_KEY && (
              <div className="flex justify-center">
                <ReCAPTCHA ref={recaptchaRef} sitekey={SITE_KEY} theme="dark" />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-semibold mt-2" loading={loading}>
              Giriş Yap
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
