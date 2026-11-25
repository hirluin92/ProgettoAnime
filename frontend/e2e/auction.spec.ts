import { expect, test, type Page } from "@playwright/test";
import { createRoom, joinRoom } from "./helpers";

async function bot(page: Page) {
  const done = page.getByTestId("tournament");
  while (!(await done.isVisible().catch(() => false))) {
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

test("4 browser completano un'asta intera e vedono il torneo", async ({ browser }) => {
  test.setTimeout(400_000);
  const { host, code } = await createRoom(browser, "P1");
  const others = await Promise.all([2, 3, 4].map((i) => joinRoom(browser, code, `P${i}`)));
  const all = [host, ...others];
  await expect(host.page.getByTestId("player")).toHaveCount(4);

  await host.page.getByLabel("Timer (s)").fill("1");
  await host.page.getByLabel("Scelta ruolo (s)").fill("3");
  await host.page.getByRole("button", { name: "Avvia l'asta" }).click();
  for (const p of all) await expect(p.page.getByTestId("lot-card")).toBeVisible();

  await Promise.all(all.map((p) => bot(p.page)));

  for (const p of all) {
    await expect(p.page.getByTestId("standing")).toHaveCount(4);
    await expect(p.page.getByTestId("match-link")).toHaveCount(6);
  }
  // ogni squadra è completa: 4 giocatori × 7 ruoli
  const slots = await host.page.getByTestId("tournament").count();
  expect(slots).toBe(1);

  // ogni scontro è rivedibile dal suo link
  const href = await host.page.getByTestId("match-link").first().getAttribute("href");
  await host.page.goto(href!);
  await expect(host.page.getByTestId("arena")).toBeVisible();
  for (const p of all) await p.ctx.close();
});
