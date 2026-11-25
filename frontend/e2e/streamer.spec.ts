import { expect, test } from "@playwright/test";

test("la chat compra, completa la squadra e l'overlay OBS si vede a 1920×1080", async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByLabel("Il tuo nome").fill("Streamer");
  await page.getByLabel(/Stanza streamer/).check();
  await page.getByLabel("Canale Twitch").fill("canaleprova");
  await page.getByRole("button", { name: "Crea stanza" }).click();
  await expect(page.getByTestId("room-code")).toBeVisible();
  const code = (await page.getByTestId("room-code").textContent())!.trim();
  await expect(page.getByTestId("player").filter({ hasText: "Chat di canaleprova" })).toHaveCount(
    1,
  );

  // overlay come lo caricherebbe OBS: pagina 1920×1080 con sfondo trasparente
  const obs = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const overlay = await obs.newPage();
  await overlay.goto(`/overlay/${code}`);
  const box = overlay.getByTestId("overlay");
  await expect(box).toBeVisible();
  expect(await box.boundingBox()).toMatchObject({ width: 1920, height: 1080 });
  expect(await overlay.evaluate(() => getComputedStyle(document.body).backgroundColor)).toMatch(
    /rgba\(0, 0, 0, 0\)|transparent/,
  );

  await page.getByLabel("Timer (s)").fill("3");
  await page.getByRole("button", { name: "Avvia l'asta" }).click();
  await expect(overlay.getByTestId("overlay-bid")).toBeVisible();
  await expect(box.getByRole("button")).toHaveCount(0); // nessun controllo cliccabile

  const viewers = Array.from({ length: 30 }, (_, i) => `spettatore${i}`);
  const pass = page.getByTestId("pass");
  for (let i = 0; i < 600 && !(await page.getByTestId("tournament").isVisible()); i++) {
    await request.post("http://localhost:8000/api/dev/fake-chat/" + code, {
      data: { messages: viewers.map((user) => ({ user, text: "!offro 2" })) },
    });
    if (await pass.isEnabled({ timeout: 200 }).catch(() => false))
      await pass.click({ timeout: 500 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId("tournament")).toBeVisible();
  const rows = page.getByTestId("standing");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Chat di canaleprova" })).toHaveCount(1);
  await expect(page.getByTestId("match-link")).toHaveCount(1);
  await ctx.close();
  await obs.close();
});
