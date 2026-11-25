import { expect, test } from "@playwright/test";

test("footer, banner cookie con rifiuto, info e 404", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("footer")).toContainText("Progetto non ufficiale creato da fan");
  const banner = page.getByTestId("cookie-banner");
  await expect(banner).toBeVisible();
  await expect(page.getByTestId("ad-slot")).toHaveCount(0);
  await banner.getByRole("button", { name: "Rifiuta" }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(banner).toHaveCount(0);

  await page.getByRole("link", { name: /Info, regole e rimozioni/ }).click();
  await expect(page.getByTestId("contact-email")).toBeVisible();
  await expect(page.getByTestId("footer")).toBeVisible();

  await page.goto("/pagina-che-non-esiste");
  await expect(page.getByRole("heading", { name: "Pagina non trovata" })).toBeVisible();
  await expect(page.getByTestId("footer")).toBeVisible();
});

test("una stanza scaduta mostra un messaggio chiaro", async ({ page }) => {
  await page.goto("/stanza/ZZZZZ");
  await page.getByLabel("Il tuo nome").fill("Ospite");
  await page.getByRole("button", { name: "Entra nella stanza" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "non esiste più" })).toBeVisible();
});
