import { expect, test } from "@playwright/test";
import { createRoom, joinRoom } from "./helpers";

test("fase di ban: ognuno banna un personaggio, poi parte l'asta", async ({ browser }) => {
  const { host, code } = await createRoom(browser, "Anna");
  const guest = await joinRoom(browser, code, "Bruno");
  await expect(host.page.getByTestId("player")).toHaveCount(2);

  await host.page.getByLabel("Ban a testa").fill("1");
  await host.page.getByRole("button", { name: "Avvia l'asta" }).click();
  for (const p of [host, guest]) await expect(p.page.getByTestId("ban-phase")).toBeVisible();

  await host.page.getByLabel("Cerca un personaggio").fill("Son Goku");
  await host.page.getByTestId("ban-option").first().click();
  await expect(guest.page.getByTestId("ban-list")).toContainText("Anna: Son Goku");

  await guest.page.getByLabel("Cerca un personaggio").fill("Son Goku");
  await expect(guest.page.getByTestId("ban-option").first()).toBeDisabled(); // già bannato

  await guest.page.getByLabel("Cerca un personaggio").fill("Vegeta");
  await guest.page.getByTestId("ban-option").first().click();
  for (const p of [host, guest]) await expect(p.page.getByTestId("lot-card")).toBeVisible();
  await host.ctx.close();
  await guest.ctx.close();
});
