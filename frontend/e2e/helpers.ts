import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export interface Player {
  ctx: BrowserContext;
  page: Page;
  name: string;
}

export async function createRoom(browser: Browser, name: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByLabel("Il tuo nome").fill(name);
  await page.getByRole("button", { name: "Crea stanza" }).click();
  await expect(page.getByTestId("room-code")).toBeVisible();
  const code = (await page.getByTestId("room-code").textContent())!.trim();
  return { host: { ctx, page, name } as Player, code };
}

export async function joinRoom(browser: Browser, code: string, name: string): Promise<Player> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByLabel("Codice stanza").fill(code);
  await page.getByRole("button", { name: "Entra con un codice" }).click();
  await expect(page.getByRole("heading", { name: /Entra nella stanza/ })).toBeVisible();
  await page.getByLabel("Il tuo nome").fill(name);
  await page.getByRole("button", { name: "Entra nella stanza" }).click();
  await expect(page.getByTestId("room-code")).toHaveText(code);
  return { ctx, page, name };
}

/** Gioca un draft v3 completo: carta più economica consentita di ogni mano, slot con l'affinità migliore. */
export async function playDraft(page: Page, opts: { reroll?: boolean; swap?: boolean } = {}) {
  const placeBest = async () => {
    const free = page.getByTestId("slot-free");
    await expect(free.first()).toBeEnabled();
    const idx = await free.evaluateAll((els) => {
      let best = 0;
      let bestV = -999;
      els.forEach((e, i) => {
        const m = (e.textContent ?? "").match(/([+-]?\d+)%/);
        const v = m ? Number(m[1]) : -99;
        if (!(e as HTMLButtonElement).disabled && v > bestV) {
          bestV = v;
          best = i;
        }
      });
      return best;
    });
    await free.nth(idx).click();
  };
  let rerolled = false;
  for (let r = 0; r < 7; r++) {
    const mystery = page.getByTestId("mystery-card");
    const options = page.getByTestId("option");
    await expect(mystery.or(options.first())).toBeVisible();
    if (await mystery.isVisible()) {
      await mystery.click();
      await placeBest();
      continue;
    }
    if (opts.reroll && !rerolled && r > 0) {
      const reroll = page.getByTestId("reroll");
      if (await reroll.isEnabled()) {
        await reroll.click();
        rerolled = true;
      }
    }
    await expect(options.first()).toBeVisible();
    const labels = await options.evaluateAll((els) =>
      els.map((e, idx) => ({
        idx,
        off: (e as HTMLButtonElement).disabled,
        c: Number((e.getAttribute("aria-label") ?? "").split("costo ")[1]),
      })),
    );
    const pick = labels.filter((l) => !l.off).sort((a, b) => a.c - b.c)[0];
    await options.nth(pick.idx).click();
    await placeBest();
  }
  if (opts.swap) {
    const slots = page.getByTestId("slot-filled");
    await slots.nth(0).click();
    await slots.nth(6).click();
    await expect(page.getByTestId("swap-hint")).toContainText("Scambio fatto");
  }
  await page.getByTestId("carica-carica").click();
  // tattiche: nella Veloce si gioca una fase alla volta (con il resoconto), altrove tutte insieme
  const scelte: [number, string][] = [
    [0, "assalto"],
    [1, "tecnica"],
    [2, "guardia"],
  ];
  for (const [f, t] of scelte) {
    await page.getByTestId(`tactic-${f}-${t}`).click();
    const gioca = page.getByTestId(`gioca-fase-${f + 1}`);
    if (await gioca.count()) {
      await gioca.click();
      await expect(page.getByTestId(`fase-report-${f + 1}`)).toBeVisible();
    }
  }
  await page.getByTestId("fight").click();
}

/** Imposta un cursore (input range) e avvisa React, come farebbe un trascinamento. */
export async function impostaCursore(page: Page, testId: string, valore: number) {
  await page.getByTestId(testId).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(input, String(v));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, valore);
}
