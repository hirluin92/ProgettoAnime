"use client";

import PackArt, { TEMI_PACCHETTO } from "@/components/negozio/PackArt";

/**
 * La bustina come oggetto 3D (solo CSS, vedi «BUSTINA 3D» in app/profondita.css):
 * fronte disegnato, retro, strati di spessore, luce di volume, riflesso che segue il puntatore,
 * ombra a terra. In vetrina dondola piano; `ferma` la tiene di fronte (apertura: lì si strappa).
 */
export default function Bustina3D({
  tipo,
  nome,
  carte,
  ferma,
  indice = 0,
  className = "",
}: {
  tipo: string;
  nome: string;
  carte?: number;
  ferma?: boolean;
  indice?: number;
  className?: string;
}) {
  const t = TEMI_PACCHETTO[tipo] ?? TEMI_PACCHETTO.base;
  const muovi = (e: React.PointerEvent<HTMLDivElement>) => {
    if (ferma) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const st = e.currentTarget.style;
    st.setProperty("--ry", `${((x - 0.5) * 34).toFixed(1)}deg`);
    st.setProperty("--rx", `${((0.5 - y) * 14).toFixed(1)}deg`);
    st.setProperty("--mx", x.toFixed(2));
  };
  const lascia = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = e.currentTarget.style;
    st.setProperty("--ry", "0deg");
    st.setProperty("--rx", "0deg");
    st.setProperty("--mx", "0.2");
  };
  return (
    <div
      className={`bustina ${className}`}
      data-ferma={ferma ? "" : undefined}
      style={{ ["--bordo" as string]: t.b, ["--i" as string]: indice }}
      onPointerMove={muovi}
      onPointerLeave={lascia}
      onPointerCancel={lascia}
    >
      <i className="bustina-ombra" aria-hidden="true" />
      <div className="bustina-giro">
        <div className="bustina-corpo">
          <div className="bustina-faccia bustina-retro" aria-hidden="true" />
          {[5, 4, 3, 2, 1].map((k) => (
            <i
              key={k}
              className="bustina-strato"
              aria-hidden="true"
              style={{ transform: `translateZ(${-k * 2.2}px)` }}
            />
          ))}
          <div className="bustina-faccia">
            <PackArt tipo={tipo} nome={nome} carte={carte} className="size-full" />
            <i className="bustina-volume" aria-hidden="true" />
            <i className="bustina-riflesso" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
