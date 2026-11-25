import { expect, test } from "@playwright/test";
import { createRoom, joinRoom } from "./helpers";

test("3 browser entrano nella stessa stanza e si vedono; uno rientra e ritrova il suo posto", async ({
  browser,
}) => {
  const { host, code } = await createRoom(browser, "Anna");
  const b = await joinRoom(browser, code, "Bruno");
  const c = await joinRoom(browser, code, "Carla");

  for (const p of [host, b, c]) {
    await expect(p.page.getByTestId("player")).toHaveCount(3);
    for (const n of ["Anna", "Bruno", "Carla"]) {
      await expect(p.page.getByTestId("player").filter({ hasText: n })).toHaveCount(1);
    }
  }

  // Bruno chiude la scheda e rientra nella stessa sessione (token in localStorage)
  await b.page.close();
  await expect(host.page.getByText("assente")).toBeVisible();
  const again = await b.ctx.newPage();
  await again.goto(`/stanza/${code}`);
  await expect(again.getByTestId("player")).toHaveCount(3);
  await expect(again.getByLabel("Il tuo nome")).toHaveCount(0);
  await expect(host.page.getByText("assente")).toHaveCount(0);

  for (const p of [host, b, c]) await p.ctx.close();
});
