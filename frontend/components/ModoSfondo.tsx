"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Ogni modalità ha il suo colore (alone di sfondo, retini delle testate): Duello rosa, Ranked viola,
// Sfide celeste, Album verde, Negozio oro. Il colore sta in `--accent`, scelto dal `data-modo` del body.
const MODI: [string, string][] = [
  ["/duello", "duello"],
  ["/scala", "duello"],
  ["/ranked", "ranked"],
  ["/sfide", "sfide"],
  ["/album", "album"],
  ["/negozio", "negozio"],
  ["/veloce", "veloce"],
  ["/sfida", "veloce"],
  ["/stanza", "amici"],
];

export default function ModoSfondo() {
  const path = usePathname();
  useEffect(() => {
    const m = MODI.find(([p]) => path.startsWith(p))?.[1];
    if (m) document.body.dataset.modo = m;
    else delete document.body.dataset.modo;
  }, [path]);
  return null;
}
