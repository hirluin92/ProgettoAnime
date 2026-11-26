import { expect, test } from "@playwright/test";

test("album: carte possedute dal draft, mazzo personale salvato e giocato", async ({ page }) => {
  test.setTimeout(180_000);
  // profilo nuovo
  await page.goto("/profilo");
  await page.getByLabel("Come ti chiami?").fill(`Album${Date.now() % 100000}`);
  await page.getByRole("button", { name: "Crea il profilo" }).click();
  await expect(page.getByTestId("profilo")).toBeVisible();

  // la collezione si riempie giocando; qui la si riempie con carte economiche (strumento di sviluppo)
  const id = await page.evaluate(() => window.localStorage.getItem("arena-profile-id"));
  await page.request.post(`http://localhost:8000/api/dev/regala-carte/${id}`);

  // album: le carte regalate sono possedute
  await page.goto("/album");
  await expect(page.getByTestId("album")).toBeVisible();
  await expect(page.getByTestId("album-conta")).toContainText("Possiedi 12 carte");
  await expect(page.getByTestId("album-posseduta")).toHaveCount(12);

  // un mazzo con le 8 carte possedute
  await page.getByTestId("nuovo-mazzo").click();
  const possedute = page.getByTestId("album-posseduta");
  for (let i = 0; i < 8; i++) await possedute.nth(i).locator("button").first().click();
  await expect(page.getByTestId("mazzo-stato")).toContainText("8/8 carte");
  await page.getByTestId("salva-mazzi").click();
  await expect(page.getByText("Salvato!")).toBeVisible();

  // si gioca con il mazzo personale
  await page.goto("/duello");
  await page.getByTestId("duello-capito").click();
  await page.getByTestId("tab-mazzo").click();
  await page.getByTestId("inizia-personale").click();
  await expect(page.getByTestId("duello-gioco")).toBeVisible();
});
