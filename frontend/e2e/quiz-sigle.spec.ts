import { expect, test, type Page } from "@playwright/test";
import { createRoom, impostaCursore, joinRoom } from "./helpers";

interface Sol {
  id: number;
  nome: string;
  brano?: string;
  artista?: string;
}

async function soluzione(page: Page, code: string) {
  const r = await page.request.get(`http://localhost:8000/api/dev/quiz-soluzione/${code}`);
  return (await r.json()) as Sol;
}

async function rispondi(page: Page, nome: string) {
  await page.getByTestId("quiz-cerca").fill(nome);
  await page.getByTestId("anime-voce").getByText(nome, { exact: true }).first().click();
}

test("quiz sulle sigle: titolo e artista danno punti parziali, l'anime il pieno, serie di risposte", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const { host, code } = await createRoom(browser, "Anna");
  const ospite = await joinRoom(browser, code, "Bruno");

  await host.page.getByLabel("Modalità").selectOption("quiz");
  await host.page.getByTestId("quiz-tipo-sigla").click();
  await impostaCursore(host.page, "quiz-round", 3);
  await host.page.getByTestId("quiz-impostazioni-fatto").click();
  await host.page.getByRole("button", { name: "Avvia" }).click();
  await expect(host.page.getByTestId("quiz-componenti")).toBeVisible();

  for (let giro = 1; giro <= 3; giro++) {
    await expect(host.page.getByTestId("quiz-stanza")).toContainText(`Domanda ${giro} di 3`, {
      timeout: 20_000,
    });
    const sol = await soluzione(host.page, code);
    if (giro === 1) {
      // prima solo il titolo del brano, poi l'artista: punti ridotti e la domanda resta aperta
      await rispondi(host.page, sol.brano!);
      await expect(host.page.getByTestId("quiz-msg")).toContainText("Brano giusto");
      await rispondi(host.page, sol.artista!);
      await expect(host.page.getByTestId("quiz-msg")).toContainText("Artista giusto");
      await expect(host.page.getByTestId("quiz-componenti")).toContainText("Brano");
    }
    await rispondi(host.page, sol.nome);
    await expect(host.page.getByTestId("quiz-giusto")).toContainText("Giusto");
    await rispondi(ospite.page, sol.nome);
    await expect(host.page.getByTestId("quiz-soluzione")).toBeVisible({ timeout: 10_000 });
    if (giro === 2) {
      // due domande indovinate di fila: la serie compare in classifica
      await expect(host.page.getByTestId("quiz-serie").first()).toContainText("×2");
    }
  }
  await expect(host.page.getByTestId("quiz-podio")).toBeVisible({ timeout: 20_000 });
});

test("quiz sulle sigle: impostazioni di partita (solo artista, anteprima corta, una volta sola)", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const { host, code } = await createRoom(browser, "Anna");
  const ospite = await joinRoom(browser, code, "Bruno");

  await host.page.getByLabel("Modalità").selectOption("quiz");
  await host.page.getByTestId("quiz-tipo-sigla").click();
  await impostaCursore(host.page, "quiz-round", 3);
  await impostaCursore(host.page, "quiz-clip", 5);
  await host.page.getByTestId("quiz-loop-una").click();
  await host.page.getByTestId("quiz-chiede-artista").click();
  // il tempo si scrive in minuti e secondi
  await host.page.getByTestId("quiz-tempo-input").fill("0:45");
  await host.page.getByTestId("quiz-tempo-input").blur();
  await host.page.getByTestId("quiz-impostazioni-fatto").click();
  await expect(host.page.getByTestId("quiz-riepilogo")).toContainText("0:45");
  await expect(host.page.getByTestId("quiz-riepilogo")).toContainText("Artista");
  await host.page.getByRole("button", { name: "Avvia" }).click();

  // si risponde solo con l'artista, a punteggio pieno; il loop parte spento
  await expect(host.page.getByTestId("quiz-componenti")).toBeVisible();
  await expect(host.page.getByTestId("quiz-componenti").locator("li")).toHaveCount(1);
  await expect(host.page.getByTestId("quiz-componenti")).toContainText("Artista");
  await expect(host.page.getByTestId("ascolto-loop")).toContainText("spento");
  await expect(host.page.getByTestId("ascolto")).toContainText("primi 1 secondi");
  const sol = await soluzione(host.page, code);
  await rispondi(host.page, sol.artista!);
  await expect(host.page.getByTestId("quiz-giusto")).toContainText("Giusto");
  await rispondi(ospite.page, sol.artista!);
  await expect(host.page.getByTestId("quiz-soluzione")).toBeVisible({ timeout: 10_000 });
});
