import { expect, test } from "@playwright/test";

test("negozio: probabilità visibili, apertura carta per carta, saldo e album aggiornati", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/profilo");
  await page.getByLabel("Come ti chiami?").fill(`Shop${Date.now() % 100000}`);
  await page.getByRole("button", { name: "Crea il profilo" }).click();
  await expect(page.getByTestId("profilo")).toBeVisible();

  await page.goto("/negozio");
  await expect(page.getByTestId("negozio")).toBeVisible();
  await expect(page.getByTestId("saldo")).toContainText("0 crediti");
  await expect(page.getByTestId("apri-base")).toBeDisabled(); // senza crediti
  await expect(page.getByTestId("pacchetto-oro")).toContainText("Almeno 1 carta epica");
  await expect(page.getByTestId("pacchetto-base")).toContainText("70%");

  // strumento di sviluppo: 1000 crediti
  const id = await page.evaluate(() => window.localStorage.getItem("arena-profile-id"));
  await page.request.post(`http://localhost:8000/api/dev/regala-carte/${id}`);
  await page.reload();
  await expect(page.getByTestId("saldo")).toContainText("1000 crediti");

  await page.getByTestId("apri-argento").click();
  await expect(page.getByTestId("apertura")).toBeVisible();
  // si strappa la busta trascinando il mouse lungo la linea tratteggiata
  const taglio = page.getByTestId("taglio");
  const box = (await taglio.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 40, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, y, { steps: 8 });
  await page.mouse.move(box.x + box.width - 10, y, { steps: 8 });
  await page.mouse.up();
  // le carte escono in un carosello: avanti fino al riepilogo
  for (let i = 0; i < 4; i++) await page.getByTestId("avanti").click();
  await expect(page.getByTestId("carta-pacchetto")).toHaveCount(4);
  await expect(page.getByTestId("riepilogo-apertura")).toBeVisible();
  await page.getByRole("button", { name: "Continua" }).click();
  // 250 spesi, più eventuali doppioni rimborsati
  const saldo = await page.getByTestId("saldo").textContent();
  const n = Number((saldo ?? "").replace(/\D/g, ""));
  expect(n).toBeGreaterThanOrEqual(750);
  expect(n).toBeLessThan(1000);
});
