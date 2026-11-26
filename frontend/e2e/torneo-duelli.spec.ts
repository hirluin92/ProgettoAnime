import { expect, test, type Page } from "@playwright/test";
import { createRoom, joinRoom } from "./helpers";

// Asta con offerte minime e poi i duelli: si passa il turno finché il torneo non finisce.
async function bot(page: Page) {
  const done = page.getByTestId("tournament");
  while (!(await done.isVisible().catch(() => false))) {
    const conferma = page.getByTestId("duello-conferma");
    if (await conferma.isVisible().catch(() => false)) {
      if (await conferma.isEnabled({ timeout: 300 }).catch(() => false)) {
        // gioca la prima carta che si può permettere nella prima corsia libera, poi conferma
        const mano = page.getByTestId("duello-mano");
        for (let i = 0; i < (await mano.count()); i++) {
          const c = mano.nth(i);
          if (await c.evaluate((el) => el.className.includes("opacity-45"))) continue;
          await c.click();
          const g = page.getByTestId("gioca-0");
          if (await g.isEnabled()) {
            await g.click();
            break;
          }
          await c.click();
        }
        await conferma.click({ timeout: 1000 }).catch(() => {});
      }
      await page.waitForTimeout(400);
      continue;
    }
    const picker = page.getByTestId("role-picker");
    if (await picker.isVisible().catch(() => false)) {
      await picker
        .getByRole("button")
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
    } else {
      const text =
        (await page
          .getByTestId("current-bid")
          .textContent({ timeout: 300 })
          .catch(() => "")) ?? "";
      const current = parseInt(text, 10) || 0;
      const bid = page.getByTestId("bid-1");
      if (current < 3 && (await bid.isEnabled({ timeout: 300 }).catch(() => false))) {
        await bid.click({ timeout: 1000 }).catch(() => {});
      }
    }
    await page.waitForTimeout(150);
  }
}

test("torneo a duelli: asta, duello a turni tra due giocatori, classifica", async ({ browser }) => {
  test.setTimeout(420_000);
  const { host, code } = await createRoom(browser, "Anna");
  const guest = await joinRoom(browser, code, "Bruno");
  await expect(host.page.getByTestId("player")).toHaveCount(2);

  await host.page.getByTestId("regole").selectOption("duello");
  await host.page.getByLabel("Timer (s)").fill("1");
  await host.page.getByLabel("Scelta ruolo (s)").fill("3");
  await host.page.getByRole("button", { name: "Avvia l'asta" }).click();
  for (const p of [host, guest]) await expect(p.page.getByTestId("lot-card")).toBeVisible();

  await Promise.all([bot(host.page), bot(guest.page)]);
  for (const p of [host, guest]) {
    await expect(p.page.getByTestId("standing")).toHaveCount(2);
    await expect(p.page.getByTestId("match-card")).toHaveCount(1); // un duello, senza replay
  }
  await host.ctx.close();
  await guest.ctx.close();
});
