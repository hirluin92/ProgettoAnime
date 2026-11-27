import { expect, test } from "@playwright/test";

test("il Duello: regole, draft di 8 carte, 6 turni contro la CPU e risultato", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/duello");
  await expect(page.getByTestId("duello-regole")).toBeVisible();
  await page.getByTestId("duello-capito").click();

  // draft: una carta per mano, con un cambio mano
  await expect(page.getByTestId("duello-draft")).toBeVisible();
  await page.getByTestId("duello-rilancia").click();
  for (let i = 0; i < 8; i++) {
    await expect(page.getByTestId("duello-conta")).toContainText(`${i + 1} di 8`);
    await page.getByTestId("duello-offerta").first().click();
  }
  await page.getByRole("button", { name: "Facile" }).click();
  await page.getByTestId("duello-inizia").click();

  await expect(page.getByTestId("duello-gioco")).toBeVisible();
  for (let t = 1; t <= 6; t++) {
    await expect(page.getByTestId("duello-turno")).toContainText(`Turno ${t} di 6`);
    // gioca la carta più economica che si può permettere nella prima corsia libera
    const mano = page.getByTestId("duello-mano");
    const n = await mano.count();
    for (let i = 0; i < n; i++) {
      const c = mano.nth(i);
      if (await c.evaluate((el) => el.className.includes("opacity-45"))) continue;
      await c.click();
      const bottone = page.getByTestId("gioca-1");
      if (await bottone.isEnabled()) {
        await bottone.click();
        break;
      }
      await c.click();
    }
    await page.getByTestId("duello-conferma").click();
  }
  await expect(page.getByTestId("duello-esito")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("duello-esito")).toContainText(/Hai vinto|Hai perso|Pareggio/);
  await page.getByTestId("duello-rigioca").click();
  await expect(page.getByTestId("duello-draft")).toBeVisible();
});

test("rompicapo del giorno: mazzo uguale per tutti, partita, stelle e classifica", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/duello");
  await page.getByTestId("duello-capito").click();
  await expect(page.getByTestId("duello-costo")).toHaveCount(0); // nessuna carta scelta ancora
  await page.getByTestId("duello-offerta").first().click();
  await expect(page.getByTestId("duello-costo")).toContainText("energia che avrai in 6 turni: 21");
  await page.getByTestId("link-giorno").click();
  await expect(page.getByTestId("duello-giorno")).toBeVisible();
  await page.getByTestId("giorno-nome").fill(`Prova${Date.now() % 100000}`);
  await page.getByTestId("giorno-via").click();
  for (let t = 1; t <= 6; t++) {
    await expect(page.getByTestId("duello-turno")).toContainText(`Turno ${t} di 6`);
    await page.getByTestId("duello-conferma").click();
  }
  await expect(page.getByTestId("duello-esito")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("giorno-classifica")).toContainText("1.");
});
