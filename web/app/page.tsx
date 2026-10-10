import Landing from "./components/Landing";

/**
 * LANDING PUBLICA ("/").
 *
 * Todo vive en components/Landing.tsx (diseno, textos y animaciones). Esta ruta
 * solo la monta: el idioma lo lee layout.tsx de la cookie y se lo pasa a
 * LocaleProvider, asi que la primera pintura ya sale en el idioma correcto.
 */
export default function LandingPage() {
  return <Landing />;
}
