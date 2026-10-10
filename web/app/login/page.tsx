"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import { errorDeApi } from "../../lib/i18n/apiErrors";
import LanguageSwitcher from "../../lib/i18n/LanguageSwitcher";

const API = "http://127.0.0.1:8000";

/* Una sola pantalla con dos modos. Se entra en "registro" porque quien llega
   desde la landing es, casi siempre, un usuario nuevo; "entrar" es el enlace de
   abajo. */
type Modo = "registro" | "entrar";

const MIN_PASSWORD = 8;

/* La landing manda a /login (crear cuenta) o a /login?modo=entrar (ya tengo
   cuenta). Sin parametro se abre en registro: quien llega es casi siempre nuevo. */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Acceso />
    </Suspense>
  );
}

function Acceso() {
  const params = useSearchParams();
  const [modo, setModo] = useState<Modo>(
    params.get("modo") === "entrar" ? "entrar" : "registro",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const esRegistro = modo === "registro";

  function cambiarModo() {
    setModo(esRegistro ? "entrar" : "registro");
    setError("");
  }

  async function iniciarSesion(): Promise<boolean> {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      /* El backend devuelve un codigo (auth_bad_credentials) y el texto en
         español. Se traduce el codigo para que el mensaje siga el idioma. */
      const cuerpo = await response.json().catch(() => null);
      setError(errorDeApi(cuerpo, t, t("login.wrongCredentials")));
      return false;
    }

    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    /* El backend no pone minimo a la contrasena: se pide aqui. */
    if (esRegistro && password.length < MIN_PASSWORD) {
      setError(t("login.passwordTooShort"));
      return;
    }

    setEnviando(true);
    try {
      if (esRegistro) {
        const registro = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!registro.ok) {
          const cuerpo = await registro.json().catch(() => null);
          setError(errorDeApi(cuerpo, t, t("login.genericError")));
          return;
        }
      }

      /* Tras registrarse se entra solo: nadie deberia tener que escribir sus
         datos dos veces. */
      if (await iniciarSesion()) {
        router.push("/dashboard");
      }
    } catch {
      /* Backend apagado o sin conexion. */
      setError(t("login.networkError"));
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "w-full h-[50px] rounded-xl bg-white/5 border border-white/15 px-4 text-[15.5px] text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-[#2FD8C8] focus:bg-[#2FD8C8]/5 focus:ring-4 focus:ring-[#2FD8C8]/20";

  return (
    <main className="login-shell relative flex min-h-screen items-center justify-center md:justify-end bg-black overflow-hidden px-5 py-8 md:pr-[8vw]">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <Image
        src="/astronaut-login.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        className="object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent from-40% to-[#05060B]/45" />

      <section className="relative z-10 w-full max-w-[416px] rounded-[22px] border border-white/12 bg-gradient-to-b from-[#161826]/85 to-[#0B0C14]/90 px-5 py-6 sm:px-8 sm:pt-9 sm:pb-7 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9),0_0_80px_-30px_rgba(47,216,200,0.25)] backdrop-blur-xl">
        <h1 className="text-[32px] leading-[1.08] font-bold tracking-tight text-white">
          {esRegistro ? t("login.titleSignup") : t("login.titleLogin")}
        </h1>
        <p className="mt-2.5 mb-6 text-[15px] leading-relaxed text-zinc-400">
          {esRegistro ? t("login.subtitleSignup") : t("login.subtitleLogin")}
        </p>

        <button
          type="button"
          onClick={() => setError(t("login.googleSoon"))}
          className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-white text-[15px] font-semibold text-[#1b1c22] transition hover:bg-zinc-200"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {esRegistro ? t("login.google") : t("login.googleLogin")}
        </button>

        <div className="my-[22px] flex items-center gap-3.5 text-[12.5px] text-zinc-500">
          <span className="h-px flex-1 bg-white/12" />
          {t("login.or")}
          <span className="h-px flex-1 bg-white/12" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="mb-[7px] block text-[12.5px] font-semibold text-zinc-300">
              {t("login.email")}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder={t("login.emailPh")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={campo}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="login-password" className="mb-[7px] block text-[12.5px] font-semibold text-zinc-300">
                {t("login.password")}
              </label>
              {!esRegistro && (
                <a href="#" className="text-[12.5px] text-zinc-400 transition hover:text-white">
                  {t("login.forgot")}
                </a>
              )}
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={verPassword ? "text" : "password"}
                autoComplete={esRegistro ? "new-password" : "current-password"}
                placeholder={t("login.passwordPh")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${campo} pr-[50px]`}
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                aria-label={verPassword ? t("login.hidePassword") : t("login.showPassword")}
                className="absolute right-1.5 top-1.5 flex h-[38px] w-[38px] items-center justify-center rounded-[9px] text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                  {!verPassword && <path d="M4 4l16 16" />}
                </svg>
              </button>
            </div>
            {esRegistro && (
              <p className="mt-[7px] text-xs text-zinc-500">{t("login.passwordHint")}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-1.5 flex h-[52px] w-full items-center justify-center rounded-xl bg-[#2FD8C8] text-base font-bold text-[#04211E] shadow-[0_10px_30px_-10px_rgba(47,216,200,0.55)] transition hover:bg-[#5BE6D8] disabled:cursor-wait disabled:opacity-70"
          >
            {esRegistro ? t("login.submitSignup") : t("login.submit")}
          </button>
        </form>

        {esRegistro && (
          <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">{t("login.terms")}</p>
        )}

        <div className="mt-6 border-t border-white/10 pt-5 text-center text-[14.5px] text-zinc-400">
          {esRegistro ? t("login.haveAccount") : t("login.newHere")}{" "}
          <button
            type="button"
            onClick={cambiarModo}
            className="font-semibold text-[#7DF0DE] transition hover:text-[#B5F7EC] hover:underline"
          >
            {esRegistro ? t("login.signInLink") : t("login.createAccount")}
          </button>
        </div>
      </section>
    </main>
  );
}
