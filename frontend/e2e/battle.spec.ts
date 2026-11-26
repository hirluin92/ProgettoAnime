import { expect, test } from "@playwright/test";

test("lo scontro di prova si recita e si può saltare", async ({ page }) => {
  await page.goto("/dev/scontro");
  await page.getByRole("button", { name: "Nuova sfida" }).click();
  await expect(page.getByTestId("arena")).toBeVisible();
  await page.getByRole("button", { name: "Combatti" }).click();
  await expect(page.getByTestId("banner")).toBeVisible();
  await page.getByRole("button", { name: "Salta" }).click();
  await expect(page.getByTestId("result")).toBeVisible();
  const veloce = page.getByRole("button", { name: "Velocità ×2" });
  await expect(veloce).toHaveAttribute("aria-pressed", "true"); // ×2 di default
  await veloce.click();
  await expect(veloce).toHaveAttribute("aria-pressed", "false");
});

test("la pagina /partita/[id] rilegge uno scontro salvato", async ({ page, request }) => {
  const res = await request.post("http://localhost:8000/api/dev/random-match");
  const { id } = await res.json();
  await page.goto(`/partita/${id}`);
  await expect(page.getByTestId("arena")).toBeVisible();
  await expect(page.getByTestId("result")).toBeVisible({ timeout: 40_000 });
});
