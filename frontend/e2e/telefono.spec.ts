import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 780 } });

test("telefono: barra in basso con le voci principali e «Altro»", async ({ page }) => {
  await page.goto("/");
  const barra = page.getByTestId("barra-rapida");
  await expect(barra).toBeVisible();
  for (const voce of ["Duello", "Sfide", "Album", "Negozio", "Profilo"])
    await expect(barra.getByRole("link", { name: voce })).toBeVisible();
  // tocchi grandi
  const alt = await barra.getByRole("link", { name: "Negozio" }).boundingBox();
  expect(alt?.height ?? 0).toBeGreaterThanOrEqual(48);
  // le voci meno usate stanno in «Altro»
  await barra.getByRole("button", { name: "Altro" }).click();
  await expect(page.getByTestId("barra-altro").getByRole("link", { name: "Ranked" })).toBeVisible();
  await page.getByTestId("barra-altro").getByRole("link", { name: "Veloce" }).click();
  await expect(page).toHaveURL(/\/veloce/);
  await barra.getByRole("link", { name: "Negozio" }).click();
  await expect(page).toHaveURL(/\/negozio/);
});

test("telefono: l'album non scorre in orizzontale", async ({ page }) => {
  await page.goto("/profilo");
  await page.getByLabel("Come ti chiami?").fill(`Tel${Date.now() % 100000}`);
  await page.getByRole("button", { name: "Crea il profilo" }).click();
  await expect(page.getByTestId("profilo")).toBeVisible();
  const id = await page.evaluate(() => window.localStorage.getItem("arena-profile-id"));
  await page.request.post(`http://localhost:8000/api/dev/regala-carte/${id}`);
  await page.goto("/album");
  await expect(page.getByTestId("raccoglitore")).toBeVisible();
  const larghezze = await page.evaluate(() => ({
    pagina: document.documentElement.scrollWidth,
    finestra: window.innerWidth,
  }));
  expect(larghezze.pagina).toBeLessThanOrEqual(larghezze.finestra);
});

test("telefono: la finestra delle impostazioni del quiz è opaca", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Il tuo nome").fill("Anna");
  await page.getByTestId("crea-quiz").click();
  const finestra = page.getByTestId("quiz-impostazioni-finestra");
  await expect(finestra).toBeVisible();
  const alfa = await finestra.evaluate((el) => {
    const c = getComputedStyle(el).backgroundImage;
    return /rgba\(|\/ 0\./.test(c.split("),")[0] ?? "");
  });
  expect(alfa).toBe(false);
});
