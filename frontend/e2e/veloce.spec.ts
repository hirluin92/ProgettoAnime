import { expect, test } from "@playwright/test";

test("una partita veloce si completa in meno di 3 minuti", async ({ page }) => {
  const t0 = Date.now();
  await page.goto("/");
  await page.getByRole("link", { name: /Partita veloce/ }).click();
  await expect(page.getByTestId("step")).toBeVisible();
  for (let i = 0; i < 7; i++) {
    // sceglie l'opzione più economica disponibile
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
  await expect(page.getByTestId("arena")).toBeVisible();
  await page.getByRole("button", { name: "Salta" }).click();
  await expect(page.getByTestId("result")).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(180_000);
});
