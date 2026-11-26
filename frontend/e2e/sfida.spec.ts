import { expect, test } from "@playwright/test";
import { playDraft } from "./helpers";

test("sfida del giorno: un tentativo a nome e classifica", async ({ browser }) => {
  const name = `Sfidante${Date.now() % 100000}`;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/sfida");
  await page.getByLabel("Il tuo nome").fill(name);
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await playDraft(page);
  await expect(page.getByTestId("arena")).toBeVisible();
  await expect(page.getByTestId("commentary")).toBeVisible();
  await page.getByRole("button", { name: "Salta" }).click();
  await expect(page.getByTestId("daily-result")).toContainText("Posizione");

  // secondo tentativo con lo stesso nome: rifiutato
  await page.goto("/sfida");
  await page.getByLabel("Il tuo nome").fill(name.toUpperCase());
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await playDraft(page);
  await expect(page.getByRole("alert").filter({ hasText: "già giocato" })).toBeVisible();
  await ctx.close();
});
