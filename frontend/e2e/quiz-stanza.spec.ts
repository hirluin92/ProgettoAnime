import { expect, test, type Page } from "@playwright/test";
import { attendiViaQuiz, createRoom, impostaCursore, joinRoom } from "./helpers";

async function soluzione(page: Page, code: string) {
  const r = await page.request.get(`http://localhost:8000/api/dev/quiz-soluzione/${code}`);
  return (await r.json()) as { id: number; nome: string };
}

async function rispondi(page: Page, nome: string) {
  const cerca = page.getByTestId("quiz-cerca");
  await cerca.fill(nome);
  await page.getByTestId("anime-voce").getByText(nome, { exact: true }).first().click();
}

test("quiz tra amici: due giocatori rispondono, blocco dopo l'errore, classifica finale", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const { host, code } = await createRoom(browser, "Anna");
  const ospite = await joinRoom(browser, code, "Bruno");

  await host.page.getByLabel("Modalità").selectOption("quiz");
  // scegliendo il quiz si apre la finestra delle impostazioni
  await expect(host.page.getByTestId("quiz-impostazioni-finestra")).toBeVisible();
  await impostaCursore(host.page, "quiz-round", 3);
  await host.page.getByTestId("quiz-impostazioni-fatto").click();
  await expect(host.page.getByTestId("quiz-riepilogo")).toContainText("3 round");
  await host.page.getByRole("button", { name: "Avvia" }).click();
  await expect(host.page.getByTestId("quiz-stanza")).toBeVisible();
  await expect(ospite.page.getByTestId("quiz-stanza")).toBeVisible();

  for (let giro = 1; giro <= 3; giro++) {
    await expect(host.page.getByTestId("quiz-stanza")).toContainText(`Domanda ${giro} di 3`, {
      timeout: 20_000,
    });
    await attendiViaQuiz(host.page, ospite.page);
    const sol = await soluzione(host.page, code);
    if (giro === 1) {
      // una risposta sbagliata: blocco di qualche secondo, poi si può riprovare
      const sbagliata = (await (
        await host.page.request.get("http://localhost:8000/api/quiz/anime/elenco")
      ).json()) as { id: number; nome: string }[];
      const altro = sbagliata.find((v) => v.id !== sol.id && !v.nome.includes(sol.nome));
      if (altro && !(await host.page.getByTestId("quiz-cerca").isDisabled())) {
        const kind = await host.page.getByTestId("quiz-stanza").textContent();
        // solo se la domanda è su un anime (non su un personaggio) si prova l'errore
        if (!kind?.includes("Chi è")) {
          await rispondi(ospite.page, altro.nome);
          await expect(ospite.page.getByText(/Riprova tra/)).toBeVisible();
        }
      }
    }
    await rispondi(host.page, sol.nome);
    await expect(host.page.getByTestId("quiz-giusto")).toContainText("Giusto");
    // l'ospite aspetta la fine del blocco, poi risponde: la domanda si chiude e si vede la soluzione
    await ospite.page.waitForTimeout(giro === 1 ? 4500 : 0);
    await rispondi(ospite.page, sol.nome);
    await expect(host.page.getByTestId("quiz-soluzione")).toBeVisible({ timeout: 10_000 });
    await expect(host.page.getByTestId("quiz-soluzione")).toContainText(sol.nome);
  }

  await expect(host.page.getByTestId("quiz-podio")).toBeVisible({ timeout: 20_000 });
  await expect(host.page.getByTestId("quiz-classifica")).toContainText("Anna");
  await host.page.getByTestId("quiz-lobby").click();
  await expect(host.page.getByRole("button", { name: "Avvia" })).toBeVisible();
});

test("quiz tra amici: funziona con più di 2 giocatori (4 in classifica)", async ({ browser }) => {
  test.setTimeout(90_000);
  const { host, code } = await createRoom(browser, "Anna");
  const altri = [
    await joinRoom(browser, code, "Bruno"),
    await joinRoom(browser, code, "Carla"),
    await joinRoom(browser, code, "Dario"),
  ];
  await host.page.getByLabel("Modalità").selectOption("quiz");
  await host.page.getByTestId("quiz-impostazioni-fatto").click();
  await host.page.getByRole("button", { name: "Avvia" }).click();
  for (const p of [host, ...altri]) {
    await expect(p.page.getByTestId("quiz-classifica").locator("li")).toHaveCount(4);
  }
  // risponde giusto solo Carla: i punti compaiono per lei in tutte le classifiche
  await attendiViaQuiz(host.page, altri[1].page);
  const sol = await soluzione(host.page, code);
  await rispondi(altri[1].page, sol.nome);
  await expect(host.page.getByTestId("quiz-classifica").locator("li").first()).toContainText(
    "Carla",
  );
});

test("home: «Crea una stanza per il quiz musicale» apre la lobby già in modalità quiz sulle sigle", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Il tuo nome").fill("Anna");
  await page.getByTestId("crea-quiz").click();
  await expect(page.getByTestId("quiz-impostazioni-finestra")).toBeVisible();
  await page.getByTestId("quiz-impostazioni-fatto").click();
  await expect(page.getByTestId("quiz-riepilogo")).toContainText("Sigle");
});
