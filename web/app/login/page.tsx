"use client";

/**
 * PANTALLA DE ACCESO: entrar y registrarse en la misma pantalla.
 *
 * QUE SE CAMBIO Y QUE NO
 *
 * Solo el aspecto. Antes llevaba una foto de un astronauta que venia del login
 * antiguo y que no encajaba con la landing nueva: eran dos productos pegados.
 * Ahora tiene el fondo de la landing —la rejilla turquesa que sigue al raton y
 * los mismos brillos— y el panel con el mismo borde y la misma sombra.
 *
 * NO SE TOCA NADA DE LA LOGICA: el registro, el inicio de sesion, el paso
 * automatico tras registrarse, el boton de ver contrasena, los errores y el
 * idioma son los mismos que estaban. El CSS esta en app/login.css.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import { errorDeApi } from "../../lib/i18n/apiErrors";
import LanguageSwitcher from "../../lib/i18n/LanguageSwitcher";
import { montarRejilla } from "../components/landingFx";
import { Logo } from "../components/Landing";

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
  const raiz = useRef<HTMLDivElement>(null);

  /* La rejilla que sigue al raton. Se monta DESPUES de pintar, y se desmonta
     al salir, como el resto de efectos de la landing. Sin esto, cambiar de
     idioma dejaba el <div id="tm-grid"> colgando en la pagina anterior. */
  useEffect(() => {
    if (!raiz.current) return;
    return montarRejilla(raiz.current);
  }, []);

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

  return (
    /* El fondo es el de la landing. El <div id="tm-grid"> lo anade
       montarRejilla() arriba; estos brillos son los mismos de losSq. */
    <div className="lg" ref={raiz}>
      <div className="lg-glow a" />
      <div className="lg-glow b" />
      <div className="lg-glow c" />

      <Link href="/" className="lg-brand">
        <Logo size={30} />
        <span className="disp">TradeMind</span>
      </Link>

      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-24">
        <section className="lg-card">
          <h1 className="lg-title">
            {esRegistro ? t("login.titleSignup") : t("login.titleLogin")}
          </h1>
          <p className="lg-sub">
            {esRegistro ? t("login.subtitleSignup") : t("login.subtitleLogin")}
          </p>

          <button type="button" className="lg-google" onClick={() => setError(t("login.googleSoon"))}>
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.57 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {esRegistro ? t("login.google") : t("login.googleLogin")}
          </button>

          <div className="lg-sep">{t("login.or")}</div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="lg-label">
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
                className="lg-input"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="login-password" className="lg-label">
                  {t("login.password")}
                </label>
                {!esRegistro && (
                  <a href="#" className="lg-hint" style={{ margin: 0 }}>
                    {t("login.forgot")}
                  </a>
                )}
              </div>
              <div className="lg-input-wrap">
                <input
                  id="login-password"
                  type={verPassword ? "text" : "password"}
                  autoComplete={esRegistro ? "new-password" : "current-password"}
                  placeholder={t("login.passwordPh")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="lg-input"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  aria-label={verPassword ? t("login.hidePassword") : t("login.showPassword")}
                  className="lg-eye"
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                    {!verPassword && <path d="M4 4l16 16" />}
                  </svg>
                </button>
              </div>
              {esRegistro && <p className="lg-hint">{t("login.passwordHint")}</p>}
            </div>

            {error && (
              <p role="alert" className="lg-error">
                {error}
              </p>
            )}

            <button type="submit" disabled={enviando} className="lg-submit">
              {esRegistro ? t("login.submitSignup") : t("login.submit")}
            </button>
          </form>

          {esRegistro && <p className="lg-hint" style={{ marginTop: 14, textAlign: "center" }}>{t("login.terms")}</p>}

          <div className="lg-alt">
            {esRegistro ? t("login.haveAccount") : t("login.newHere")}{" "}
            <button type="button" onClick={cambiarModo}>
              {esRegistro ? t("login.signInLink") : t("login.createAccount")}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}