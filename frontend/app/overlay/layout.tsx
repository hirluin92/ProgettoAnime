import type { ReactNode } from "react";

// Pagina per OBS: lo sfondo trasparente e l'assenza di barre, sfondi e banner valgono già dal primo
// disegno (CSS nel layout, non in un effetto dopo il caricamento): in OBS non compare nessun lampo scuro.
const CSS = `
html, body { background: transparent !important; }
body::before, .aurora, .site-chrome, [data-testid="cookie-banner"] { display: none !important; }
body { padding-bottom: 0 !important; }
`;

export default function OverlayLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{CSS}</style>
      {children}
    </>
  );
}
