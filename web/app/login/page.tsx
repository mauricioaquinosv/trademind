"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import LanguageSwitcher from "../../lib/i18n/LanguageSwitcher";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const response = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      setError(t("login.wrongCredentials"));
      return;
    }

    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    router.push("/dashboard");
  }

  return (
    <main className="login-shell relative flex min-h-screen items-center justify-end bg-black overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <Image
        src="/astronaut-login.jpg"
        alt="TradeMind"
        fill
        priority
        className="object-cover object-top"
      />

      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 w-full max-w-sm mr-8 sm:mr-16 md:mr-24 lg:mr-32 flex flex-col gap-4">
        <div className="rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-white/10 p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-1">{t("login.welcome")}</h1>
          <p className="text-sm text-zinc-400 mb-6">{t("login.subtitle")}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder={t("login.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder={t("login.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end -mt-2">
              <a href="#" className="text-xs text-zinc-400 hover:text-white transition">
                {t("login.forgot")}
              </a>
            </div>

            <button
              type="submit"
              className="mt-1 w-full rounded-lg bg-white py-3 font-semibold text-black transition hover:bg-zinc-200"
            >
              {t("login.submit")}
            </button>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </form>

          <div className="mt-6">
            <p className="text-center text-xs text-zinc-500 mb-3">{t("login.quickLogin")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-medium text-black hover:bg-zinc-200 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-medium text-black hover:bg-zinc-200 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.63.91-1.487 0-2.53-1.32-3.5-2.66-1.97-2.72-3.5-7.66-1.45-11.05.97-1.61 2.72-2.65 4.6-2.68 1.42-.03 2.76.96 3.63.96.87 0 2.5-1.18 4.22-1.01.72.03 2.72.29 4.01 2.18-.1.06-2.4 1.4-2.38 4.19.03 3.33 2.94 4.44 2.98 4.46-.02.09-.44 1.5-1.55 2.99z" />
                </svg>
                Apple
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-white/10 p-5 shadow-2xl text-center">
          <p className="text-sm text-zinc-300 mb-3">
            {t("login.newHere")}{" "}
            <a href="#" className="text-white font-medium hover:underline">
              {t("login.createAccount")}
            </a>
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="#"
              aria-label="Facebook"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99h-2.54V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="Twitter"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.83-5.97 6.83H1.66l7.73-8.84L1.25 2.25h6.83l4.72 6.24 5.44-6.24zm-1.16 17.52h1.83L7.1 4.13H5.13l11.95 15.64z" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="LinkedIn"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.34 18v-8.4H5.67V18h2.67zM7 8.48a1.55 1.55 0 100-3.1 1.55 1.55 0 000 3.1zM18.34 18v-4.6c0-2.46-1.31-3.6-3.06-3.6a2.64 2.64 0 00-2.39 1.32h-.04V9.6H10.3c.03.7 0 8.4 0 8.4h2.67v-4.69c0-.25.02-.5.1-.68.2-.5.67-1.03 1.46-1.03 1.03 0 1.44.78 1.44 1.93V18h2.67z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
