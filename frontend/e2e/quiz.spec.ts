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
