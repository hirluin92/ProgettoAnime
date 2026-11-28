import { expect, test } from "@playwright/test";
import { playDraft } from "./helpers";

test("il piano di battaglia si può spegnere e la partita si gioca senza tattiche", async ({
  page,
}) => {
  await page.goto("/veloce");
  await expect(page.getByTestId("step")).toBeVisible();
  await playDraft(page, { senzaPiano: true });
  await expect(page.getByTestId("arena")).toBeVisible();
  await page.getByRole("button", { name: "Salta" }).click();
  await expect(page.getByTestId("result")).toBeVisible();
});

test("una partita veloce si completa in meno di 3 minuti", async ({ page }) => {
  const t0 = Date.now();
  await page.goto("/");
  await page.getByTestId("home-altro").locator("summary").click();
  await page.getByRole("link", { name: /Partita veloce/ }).click();
  await expect(page.getByTestId("step")).toBeVisible();
  await expect(page.getByTestId("arena-banner")).toBeVisible();
  await playDraft(page, { reroll: true, swap: true });
  await expect(page.getByTestId("arena")).toBeVisible();
  await page.getByRole("button", { name: "Salta" }).click();
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("momenti")).toBeVisible();
  await expect(page.getByTestId("perche")).toBeVisible();
  await expect(page.getByTestId("arena-info")).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(180_000);
});
