import { expect, test } from "@playwright/test";

test("la Scala a duelli: draft, primo gradino e premio oppure fine della corsa", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/scala");
  await page.getByTestId("duello-capito").click();
  for (let i = 0; i < 8; i++) await page.getByTestId("duello-offerta").first().click();
  await page.getByTestId("duello-inizia").click();

  await expect(page.getByTestId("scala-hub")).toBeVisible();
  await expect(page.getByTestId("scala-gradino")).toContainText("Gradino 1 di 12");
  await page.getByTestId("scala-combatti").click();

  for (let t = 1; t <= 6; t++) {
    await expect(page.getByTestId("duello-turno")).toContainText(`Turno ${t} di 6`);
    // gioca la carta più economica che si può permettere nella prima corsia libera
    const mano = page.getByTestId("duello-mano");
    for (let i = 0; i < (await mano.count()); i++) {
      const c = mano.nth(i);
      if (await c.evaluate((el) => el.className.includes("opacity-45"))) continue;
      await c.click();
      const g = page.getByTestId("gioca-1");
      if (await g.isEnabled()) {
        await g.click();
        break;
      }
      await c.click();
    }
    await page.getByTestId("duello-conferma").click();
  }
  await expect(page.getByTestId("scala-esito")).toBeVisible({ timeout: 30_000 });

  // vinto: si sceglie il rinforzo e si arriva al gradino 2; perso: la corsa finisce
  const offerta = page.getByTestId("scala-offerta-2");
  if (await offerta.isVisible()) {
    await offerta.click();
    await expect(page.getByTestId("scala-gradino")).toContainText("Gradino 2 di 12");
    await expect(page.getByTestId("scala-combatti")).toBeVisible();
  } else {
    await expect(page.getByTestId("scala-esito")).toContainText("La corsa è finita");
    await expect(page.getByTestId("duello-rigioca")).toBeVisible();
  }
});
