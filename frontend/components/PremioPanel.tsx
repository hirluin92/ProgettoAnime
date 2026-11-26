"use client";

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
            className="display text-grad text-5xl font-black leading-none"
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
            className="rounded-2xl border border-amber-300/60 bg-amber-300/15 px-4 py-2 text-center"
            data-testid="premio-livello"
          >
            <div className="text-xs font-extrabold uppercase tracking-widest text-amber-200">
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
        {premio.nuove_carte > 0 && (
          <li className="chip text-cyan-200">
            {it.profilo.nuoveCarte.replace("{n}", String(premio.nuove_carte))}
          </li>
        )}
        {premio.obiettivi_completati.map((o) => (
          <li key={o.id} className="chip text-emerald-200">
            ✓ {o.nome} +20 XP
          </li>
        ))}
      </ul>
    </section>
  );
}
