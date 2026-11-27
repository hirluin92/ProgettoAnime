import type { MetadataRoute } from "next";
import { SITO } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // pagine private, temporanee o di servizio: non vanno nei risultati di ricerca
        disallow: [
          "/stanza/",
          "/overlay/",
          "/partita/",
          "/dev/",
          "/profilo",
          "/ranked/gioca",
          "/sfida",
        ],
      },
    ],
    sitemap: `${SITO}/sitemap.xml`,
    host: SITO,
  };
}
