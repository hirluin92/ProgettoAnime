import type { MetadataRoute } from "next";
import { PAGINE, SITO } from "@/lib/seo";

// Solo le pagine pubbliche: niente stanze, replay, overlay, profilo o pagine di sviluppo.
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGINE.map((p) => ({
    url: `${SITO}${p.path === "/" ? "" : p.path}`,
    changeFrequency: p.quotidiana ? "daily" : "weekly",
    priority: p.priorita,
  }));
}
