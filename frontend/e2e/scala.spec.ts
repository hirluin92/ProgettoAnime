import { expect, test } from "@playwright/test";
import { playDraft } from "./helpers";

test("la Scala: draft, primo gradino, potenziamento e secondo gradino", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/scala");
  await expect(page.getByTestId("step")).toBeVisible();
  await playDraft(page);
  await page.getByRole("button", { name: "Salta" }).click();
  const fine = page.getByTestId("scala-fine");
  const offerte = page.getByTestId("scala-offerte");
  await expect(offerte.or(fine)).toBeVisible();

  // se il primo gradino è vinto: si sceglie un potenziamento e si combatte il secondo
  if (await offerte.isVisible()) {
    await expect(page.getByTestId("scala-vinti")).toContainText("1 gradino vinto");
    await page.getByTestId("upgrade-0").click();
    await page.getByTestId("tactic-0-assalto").click();
    await page.getByTestId("tactic-1-tecnica").click();
    await page.getByTestId("tactic-2-guardia").click();
    await page.getByTestId("scala-fight").click();
    await expect(page.getByTestId("arena")).toHaveCount(2); // la scena nuova del secondo gradino
    await page.getByRole("button", { name: "Salta" }).last().click();
    await expect(offerte.or(fine)).toBeVisible();
  } else {
    await expect(fine).toContainText("La corsa è finita");
  }
});
