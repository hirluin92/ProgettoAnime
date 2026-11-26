import { expect, test } from "@playwright/test";

test("ranked: serve un account, partita a draft contro un avversario, punti e piazzamento", async ({
  page,
  request,
}) => {
  test.setTimeout(150_000);
  const nome = `Rk${Date.now() % 100000}`;
  const p = await (
    await request.post("http://localhost:8000/api/profile", { data: { name: nome } })
  ).json();
  await page.addInitScript((id) => window.localStorage.setItem("arena-profile-id", id), p.id);

  // senza account: niente partite classificate
  await page.goto("/ranked");
  await expect(page.getByTestId("ranked")).toBeVisible();
  await expect(page.getByText("serve un account")).toBeVisible();
  await expect(page.getByTestId("gioca-ranked")).toHaveCount(0);

  await request.post("http://localhost:8000/api/account/registra", {
    data: { profile_id: p.id, username: nome.toLowerCase(), password: "password123" },
  });
  await page.reload();
  await expect(page.getByTestId("ranked-piazzamento")).toContainText("ancora 5 partite");
  await page.getByTestId("gioca-ranked").click();

  await page.getByTestId("duello-capito").click();
  await expect(page.getByTestId("ranked-avversario")).toBeVisible();
  for (let i = 0; i < 8; i++) await page.getByTestId("duello-offerta").first().click();
  await page.getByTestId("duello-inizia").click();
  for (let t = 1; t <= 6; t++) {
    await expect(page.getByTestId("duello-turno")).toContainText(`Turno ${t} di 6`);
    await page.getByTestId("duello-conferma").click();
  }
  await expect(page.getByTestId("ranked-esito")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("ranked-esito")).toContainText("Partita di piazzamento");
  await page.getByTestId("duello-rigioca").click();
  await expect(page.getByTestId("ranked-piazzamento")).toContainText("ancora 4 partite");
});
