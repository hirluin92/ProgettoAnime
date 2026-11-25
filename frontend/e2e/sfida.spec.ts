import { expect, test, type Page } from "@playwright/test";

async function draft(page: Page) {
  for (let i = 0; i < 7; i++) {
    const options = page.getByTestId("option");
    await expect(options.first()).toBeVisible();
    const labels = await options.evaluateAll((els) =>
      els.map((e, idx) => ({
        idx,
        off: (e as HTMLButtonElement).disabled,
        c: Number((e.getAttribute("aria-label") ?? "").split("costo ")[1]),
      })),
    );
    const pick = labels.filter((l) => !l.off).sort((a, b) => a.c - b.c)[0];
    await options.nth(pick.idx).click();
  }
}

test("sfida del giorno: un tentativo a nome e classifica", async ({ browser }) => {
  const name = `Sfidante${Date.now() % 100000}`;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/sfida");
  await page.getByLabel("Il tuo nome").fill(name);
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await draft(page);
  await expect(page.getByTestId("arena")).toBeVisible();
  await expect(page.getByTestId("commentary")).toBeVisible();
  await expect(page.getByTestId("daily-result")).toContainText("Posizione");

  // secondo tentativo con lo stesso nome: rifiutato
  await page.goto("/sfida");
  await page.getByLabel("Il tuo nome").fill(name.toUpperCase());
  await page.getByRole("button", { name: "Inizia la sfida" }).click();
  await draft(page);
  await expect(page.getByRole("alert").filter({ hasText: "già giocato" })).toBeVisible();
  await ctx.close();
});
