import { expect, test } from "@playwright/test";

test("la home si carica", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
