"use client";

import Moneta from "@/components/Moneta";
import Icon from "@/components/Icon";
import { motion } from "framer-motion";
import it from "@/i18n/it.json";
import type { Premio } from "@/lib/profile";

export default function PremioPanel({ premio }: { premio: Premio }) {
  const salito = premio.livello_dopo > premio.livello_prima;
  return (
    <section className="panel space-y-3 p-5" data-testid="premio">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="eyebrow">{it.profilo.premio}</span>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="onoma text-5xl"
            data-testid="premio-xp"
          >
            +{premio.xp} XP
          </motion.div>
        </div>
        {salito && (
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="border-2 border-black bg-[#ffd21f] px-4 py-2 text-center text-black shadow-[3px_3px_0_#000]"
            data-testid="premio-livello"
          >
            <div className="text-xs font-black uppercase tracking-widest">
              {it.profilo.nuovoLivello}
            </div>
            <div className="display text-3xl font-black">
              {premio.livello_dopo} · {premio.titolo}
            </div>
          </motion.div>
        )}
      </div>
      <ul className="flex flex-wrap gap-2 text-sm">
        <li className="chip">
          {it.profilo.stagione}: +{premio.punti_stagione}
        </li>
        {!!premio.crediti && (
          <li className="chip border-black bg-[#ffd21f] text-black" data-testid="premio-crediti">
            <Moneta gira className="size-[1.3em]" />+{premio.crediti} {it.profilo.crediti}
          </li>
        )}
        {premio.elo_prima != null && premio.elo_dopo != null && (
          <li className="chip text-amber-200" data-testid="premio-elo">
            ELO {premio.elo_dopo} ({premio.elo_dopo - premio.elo_prima >= 0 ? "+" : ""}
            {premio.elo_dopo - premio.elo_prima})
          </li>
        )}
        {premio.nuove_carte > 0 && (
          <li className="chip text-cyan-200">
            {it.profilo.nuoveCarte.replace("{n}", String(premio.nuove_carte))}
          </li>
        )}
        {premio.obiettivi_completati.map((o) => (
          <li key={o.id} className="chip text-emerald-200">
            <Icon name="check" /> {o.nome} +20 XP
          </li>
        ))}
      </ul>
    </section>
  );
}
