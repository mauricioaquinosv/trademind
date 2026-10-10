"use client";

/**
 * CABECERA DEL FLUJO DE SUSCRIPCION.
 *
 * El logo y el selector de idioma, iguales en todas las pantallas del flujo.
 * Antes estaba escrito en cada plantilla del HTML de referencia: cuatro veces
 * lo mismo, y las cuatro se desincronizaron al primer retoque de estilo.
 *
 * El logo se importa del componente de la landing en vez de copiar su SVG: si
 * un dia cambia el logo, cambia en los dos sitios o en ninguno.
 */

import Link from "next/link";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import LanguageSwitcher from "../../lib/i18n/LanguageSwitcher";
import { Logo } from "./Landing";

export default function CabeceraFlujo() {
  const { t } = useI18n();

  return (
    <header className="fl-cab">
      <Link href="/" className="fl-brand">
        <Logo size={30} />
        <span className="disp">TradeMind</span>
      </Link>
      <LanguageSwitcher />
    </header>
  );
}