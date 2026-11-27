import { expect, test } from "@playwright/test";
import { esatto, impostaCursore } from "./helpers";

interface Voce {
  id: number;
  nome: string;
}

test("sfide: Animedle del giorno, due tentativi, vittoria e crediti", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/profilo");
  await page.getByLabel("Come ti chiami?").fill(`Quiz${Date.now() % 100000}`);
  await page.getByRole("button", { name: "Crea il profilo" }).click();
  await expect(page.getByTestId("profilo")).toBeVisible();

  await page.goto("/sfide");
  await expect(page.getByTestId("sfida-animedle-stato")).toContainText("Da fare");

  // la soluzione si legge dall'endpoint di sviluppo (non chiude la sfida di nessuno)
  const sol = (await (
    await page.request.get("http://localhost:8000/api/dev/quiz-giorno/animedle")
  ).json()) as { id: number; titolo: string; titolo_en: string };
  const elenco = (await (
    await page.request.get("http://localhost:8000/api/quiz/anime/elenco")
  ).json()) as Voce[];
  const nomeSol = sol.titolo_en || sol.titolo;
  const sbagliato = elenco.find((v) => v.id !== sol.id)!;

  await page.getByTestId("sfida-animedle").click();
  await expect(page.getByTestId("animedle")).toBeVisible();
  const cerca = page.getByTestId("animedle-cerca");

  const prova = async (nome: string) => {
    await cerca.fill(nome);
    await page.getByTestId("anime-voce").getByText(esatto(nome)).first().click();
  };
  await prova(sbagliato.nome);
  await expect(page.getByTestId("animedle-riga")).toHaveCount(1);
  await expect(page.getByTestId("animedle-tentativi")).toContainText("1/8");

  await prova(nomeSol);
  await expect(page.getByTestId("animedle-fine")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("animedle-crediti")).toContainText("40 sigilli");

  // tornati alle sfide la carta risulta vinta
  await page.goto("/sfide");
  await expect(page.getByTestId("sfida-animedle-stato")).toContainText("Vinta");
});

test("sfide: Animedle in allenamento con partita nuova", async ({ page }) => {
  await page.goto("/sfide/animedle?libero=1");
  await expect(page.getByTestId("animedle")).toBeVisible();
  await page.getByTestId("animedle-cerca").fill("naruto");
  await page.getByTestId("anime-voce").first().click();
  await expect(page.getByTestId("animedle-riga")).toHaveCount(1);
  await page.getByTestId("animedle-nuovo").click();
  await expect(page.getByTestId("animedle-riga")).toHaveCount(0);
});

for (const gioco of ["scorcio", "personaggio", "sigla"] as const) {
  test(`sfide: ${gioco} del giorno, un errore, vittoria e crediti`, async ({ page }) => {
    test.setTimeout(90_000);
    // registra i nodi di guadagno creati dalla pagina (per controllare il volume dell'audio)
    await page.addInitScript(() => {
      const w = window as unknown as { __gains: GainNode[] };
      w.__gains = [];
      const orig = AudioContext.prototype.createGain;
      AudioContext.prototype.createGain = function (this: AudioContext) {
        const g = orig.call(this);
        w.__gains.push(g);
        return g;
      };
    });
    await page.goto("/profilo");
    await page.getByLabel("Come ti chiami?").fill(`Zoom${gioco[0]}${Date.now() % 100000}`);
    await page.getByRole("button", { name: "Crea il profilo" }).click();
    await expect(page.getByTestId("profilo")).toBeVisible();

    const sol = (await (
      await page.request.get(`http://localhost:8000/api/dev/quiz-giorno/${gioco}`)
    ).json()) as { id: number; nome: string };
    const elenco = (await (
      await page.request.get(
        gioco === "personaggio"
          ? "http://localhost:8000/api/quiz/personaggi/elenco"
          : "http://localhost:8000/api/quiz/anime/elenco",
      )
    ).json()) as Voce[];
    // un nome diverso che non contenga quello giusto (così la lista non li mescola)
    const sbagliato = elenco.find((v) => v.id !== sol.id && !v.nome.includes(sol.nome))!;

    await page.goto(`/sfide/${gioco}`);
    await expect(page.getByTestId(`quiz-${gioco}`)).toBeVisible();
    const cerca = page.getByTestId("zoom-cerca");
    const prova = async (nome: string) => {
      await cerca.fill(nome);
      await page.getByTestId("anime-voce").getByText(esatto(nome)).first().click();
    };
    const immagine = page.getByTestId("zoom-immagine");
    const zoomIniziale = gioco === "sigla" ? 0 : Number(await immagine.getAttribute("data-zoom"));
    if (gioco === "sigla") {
      await expect(page.getByTestId("ascolto")).toBeVisible();
      // il volume si regola e l'audio lo segue (e viene ricordato)
      await impostaCursore(page, "ascolto-volume", 30);
      await expect(page.getByTestId("ascolto")).toHaveAttribute("data-volume-applicato", "0.3");
      // si preme play: l'audio parte davvero e il volume è applicato al nodo di guadagno
      await page.getByTestId("ascolto-play").click();
      await expect
        .poll(() => page.evaluate(() => document.querySelector("audio")!.currentTime))
        .toBeGreaterThan(0.2);
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { __gains: GainNode[] }).__gains?.[0]?.gain.value,
          ),
        )
        .toBeCloseTo(0.3, 1);
      await impostaCursore(page, "ascolto-volume", 60);
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { __gains: GainNode[] }).__gains?.[0]?.gain.value,
          ),
        )
        .toBeCloseTo(0.6, 1);
      expect(await page.evaluate(() => localStorage.getItem("arena.volume"))).toBe("0.6");
    }
    // si può saltare un turno: conta come tentativo e sblocca di più
    await page.getByTestId("zoom-salta").click();
    await expect(page.getByTestId("zoom-errori")).toContainText("Saltato");
    await expect(page.getByTestId("zoom-tentativi")).toContainText("1/6");
    await prova(sbagliato.nome);
    await expect(page.getByTestId("zoom-errori")).toContainText(sbagliato.nome);
    if (gioco !== "sigla")
      await expect
        .poll(async () => Number(await immagine.getAttribute("data-zoom")))
        .toBeLessThan(zoomIniziale);

    await prova(sol.nome);
    await expect(page.getByTestId("zoom-fine")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("zoom-crediti")).toContainText("28 sigilli");
  });
}

test("sfide: Animedle sblocca gli indizi dopo qualche errore", async ({ page }) => {
  test.setTimeout(60_000);
  const sol = (await (
    await page.request.get("http://localhost:8000/api/dev/quiz-giorno/animedle")
  ).json()) as { id: number };
  const elenco = (await (
    await page.request.get("http://localhost:8000/api/quiz/anime/elenco")
  ).json()) as Voce[];
  const sbagliati = elenco.filter((v) => v.id !== sol.id).slice(0, 3);

  await page.goto("/sfide/animedle");
  await expect(page.getByTestId("animedle")).toBeVisible();
  await expect(page.getByTestId("animedle-indizi")).toContainText("Prossimo indizio dopo 3");
  for (const v of sbagliati) {
    await page.getByTestId("animedle-cerca").fill(v.nome);
    await page.getByTestId("anime-voce").getByText(esatto(v.nome)).first().click();
  }
  await expect(page.getByTestId("animedle-indizi")).toContainText("Il titolo inizia con");
  await expect(page.getByTestId("animedle-indizi")).toContainText("Prossimo indizio dopo 2");
});
