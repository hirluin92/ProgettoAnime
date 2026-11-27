import { expect, test, type Page } from "@playwright/test";
import { createRoom, joinRoom } from "./helpers";

async function gioca(page: Page) {
  const done = page.getByTestId("raid-result");
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

test("raid cooperativo: squadra comune contro un boss", async ({ browser }) => {
  test.setTimeout(300_000);
  const { host, code } = await createRoom(browser, "Anna");
  const guest = await joinRoom(browser, code, "Bruno");
  await expect(host.page.getByTestId("player")).toHaveCount(2);

  await host.page.getByLabel("Modalità").selectOption("raid");
  await host.page.getByLabel("Boss").selectOption("freezer");
  await host.page.getByLabel("Difficoltà").selectOption("normale");
  await host.page.getByLabel("Piano di battaglia (s)").fill("0");
  await host.page.getByRole("button", { name: "Avvia il raid" }).click();
  for (const p of [host, guest]) await expect(p.page.getByTestId("specchio")).toBeVisible();

  await Promise.all([gioca(host.page), gioca(guest.page)]);

  for (const p of [host, guest]) {
    await expect(p.page.getByTestId("raid-result")).toBeVisible();
    await expect(p.page.getByTestId("arena")).toBeVisible();
    await p.page.getByRole("button", { name: "Salta" }).click();
    await expect(
      p.page.getByTestId("raid-vittoria").or(p.page.getByTestId("raid-sconfitta")),
    ).toBeVisible();
  }
  await host.ctx.close();
  await guest.ctx.close();
});
