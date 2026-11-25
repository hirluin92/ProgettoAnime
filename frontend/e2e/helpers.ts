import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export interface Player {
  ctx: BrowserContext;
  page: Page;
  name: string;
}

export async function createRoom(browser: Browser, name: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByLabel("Il tuo nome").fill(name);
  await page.getByRole("button", { name: "Crea stanza" }).click();
  await expect(page.getByTestId("room-code")).toBeVisible();
  const code = (await page.getByTestId("room-code").textContent())!.trim();
  return { host: { ctx, page, name } as Player, code };
}

export async function joinRoom(browser: Browser, code: string, name: string): Promise<Player> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByLabel("Codice stanza").fill(code);
  await page.getByRole("button", { name: "Entra con un codice" }).click();
  await expect(page.getByRole("heading", { name: /Entra nella stanza/ })).toBeVisible();
  await page.getByLabel("Il tuo nome").fill(name);
  await page.getByRole("button", { name: "Entra nella stanza" }).click();
  await expect(page.getByTestId("room-code")).toHaveText(code);
  return { ctx, page, name };
}
