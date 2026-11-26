import { expect, test, type Page } from "@playwright/test";
import { createRoom, joinRoom } from "./helpers";

async function gioca(page: Page) {
  const done = page.getByTestId("tournament");
  for (let i = 0; i < 400 && !(await done.isVisible().catch(() => false)); i++) {
    if (
      await page
        .getByTestId("specchio-turn-me")
        .isVisible()
        .catch(() => false)
    ) {
      const card = page.getByTestId("spec-card").and(page.locator(":enabled")).first();
      if (await card.isVisible().catch(() => false)) {
        await card.click({ timeout: 1500 }).catch(() => {});
        await page
          .getByTestId("spec-slot-free")
          .and(page.locator(":enabled"))
          .first()
          .click({ timeout: 1500 })
          .catch(() => {});
      }
    }
    await page.waitForTimeout(200);
  }
}

test("draft a specchio in 2 e torneo a eliminazione diretta", async ({ browser }) => {
  test.setTimeout(240_000);
  const { host, code } = await createRoom(browser, "Anna");
  const guest = await joinRoom(browser, code, "Bruno");
  await expect(host.page.getByTestId("player")).toHaveCount(2);

  await host.page.getByLabel("Modalità").selectOption("specchio");
  await host.page.getByLabel("Formato torneo").selectOption("eliminazione");
  await host.page.getByLabel("Piano di battaglia (s)").fill("0");
  await host.page.getByRole("button", { name: "Avvia l'asta" }).click();
  for (const p of [host, guest]) await expect(p.page.getByTestId("specchio")).toBeVisible();

  await Promise.all([gioca(host.page), gioca(guest.page)]);

  for (const p of [host, guest]) {
    await expect(p.page.getByTestId("tournament")).toBeVisible();
    await expect(p.page.getByTestId("tabellone")).toBeVisible();
    await expect(p.page.getByTestId("campione")).toBeVisible();
    await expect(p.page.getByTestId("bracket-match")).toHaveCount(1); // 2 giocatori: solo la finale
    await expect(p.page.getByTestId("missioni")).toBeVisible();
  }
  await host.ctx.close();
  await guest.ctx.close();
});
