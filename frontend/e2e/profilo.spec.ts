import { expect, test } from "@playwright/test";
import { playDraft } from "./helpers";

test("profilo: si crea, una partita dà XP e riempie la collezione", async ({ page }) => {
  await page.goto("/profilo");
  await expect(page.getByTestId("profilo-nuovo")).toBeVisible();
  await page.getByLabel("Come ti chiami?").fill(`Tester${Date.now() % 100000}`);
  await page.getByRole("button", { name: "Crea il profilo" }).click();
  await expect(page.getByTestId("profilo")).toBeVisible();
  await expect(page.getByTestId("livello")).toHaveText("1");
  await expect(page.getByTestId("obiettivi").getByRole("listitem")).toHaveCount(3);

  await page.goto("/veloce");
  await playDraft(page);
  await page.getByRole("button", { name: "Salta" }).click();
  await expect(page.getByTestId("premio")).toBeVisible();
  await expect(page.getByTestId("premio-xp")).toContainText("XP");

  await page.goto("/profilo");
  await expect(page.getByTestId("coll-count")).toHaveText("7");
  await expect(page.getByTestId("nav-livello")).toBeVisible();
});

test("l'app è installabile: manifesto, icone e service worker", async ({ request }) => {
  const m = await request.get("/manifest.webmanifest");
  expect(m.ok()).toBeTruthy();
  const j = await m.json();
  expect(j.display).toBe("standalone");
  expect(j.icons.length).toBeGreaterThanOrEqual(3);
  for (const ic of j.icons) expect((await request.get(ic.src)).ok()).toBeTruthy();
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
  expect((await request.get("/offline.html")).ok()).toBeTruthy();
});
