import { expect, test } from "@playwright/test";

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

  // la soluzione si legge dall'API senza profilo (non chiude la sfida di nessuno)
  const sol = (await (
    await page.request.post("http://localhost:8000/api/quiz/animedle/arrenditi", { data: {} })
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
    await page.getByTestId("anime-voce").getByText(nome, { exact: true }).first().click();
  };
  await prova(sbagliato.nome);
  await expect(page.getByTestId("animedle-riga")).toHaveCount(1);
  await expect(page.getByTestId("animedle-tentativi")).toContainText("1/8");

  await prova(nomeSol);
  await expect(page.getByTestId("animedle-fine")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("animedle-crediti")).toContainText("40 crediti");

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
    await page.goto("/profilo");
    await page.getByLabel("Come ti chiami?").fill(`Zoom${gioco[0]}${Date.now() % 100000}`);
    await page.getByRole("button", { name: "Crea il profilo" }).click();
    await expect(page.getByTestId("profilo")).toBeVisible();

    const sol = (await (
      await page.request.post(`http://localhost:8000/api/quiz/zoom/${gioco}/arrenditi`, {
        data: {},
      })
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
      await page.getByTestId("anime-voce").getByText(nome, { exact: true }).first().click();
    };
    const immagine = page.getByTestId("zoom-immagine");
    const zoomIniziale = gioco === "sigla" ? 0 : Number(await immagine.getAttribute("data-zoom"));
    if (gioco === "sigla") await expect(page.getByTestId("ascolto")).toBeVisible();
    await prova(sbagliato.nome);
    await expect(page.getByTestId("zoom-errori")).toContainText(sbagliato.nome);
    if (gioco !== "sigla")
      await expect
        .poll(async () => Number(await immagine.getAttribute("data-zoom")))
        .toBeLessThan(zoomIniziale);

    await prova(sol.nome);
    await expect(page.getByTestId("zoom-fine")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("zoom-crediti")).toContainText("34 crediti");
  });
}
