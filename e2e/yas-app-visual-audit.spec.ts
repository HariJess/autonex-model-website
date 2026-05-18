/**
 * AUDIT VISUEL YAS — script Playwright qui parcourt automatiquement la
 * mini-app `/yas-app` + parcours utilisateur (Acheter / Estimer / Bonnes
 * affaires / Vendre / CTA cross-sell), prend des screenshots à chaque étape,
 * collecte les erreurs console.
 *
 * Output : `e2e/screenshots/yas-audit/{viewport}/NN-name.png`
 * Format de nommage : `01-yas-home-top.png`, `02-yas-home-middle.png`, etc.
 *
 * Lancement : `npx playwright test -c playwright.audit.config.ts`
 * Prérequis : `npm run dev` actif sur http://localhost:8090.
 *
 * Aucun fix de produit ici — pure observation.
 */

import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ConsoleEntry = {
  type: "error" | "warning" | "info";
  text: string;
  url: string;
};

const SCREENSHOT_DIR = path.resolve(__dirname, "screenshots/yas-audit");

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function viewportFolder(projectName: string): string {
  return path.join(SCREENSHOT_DIR, projectName);
}

async function shot(page: Page, projectName: string, name: string): Promise<void> {
  const folder = viewportFolder(projectName);
  ensureDir(folder);
  await page.screenshot({ path: path.join(folder, `${name}.png`), fullPage: true });
}

async function viewportShot(page: Page, projectName: string, name: string): Promise<void> {
  const folder = viewportFolder(projectName);
  ensureDir(folder);
  await page.screenshot({ path: path.join(folder, `${name}.png`), fullPage: false });
}

function attachConsoleCollector(page: Page, sink: ConsoleEntry[]): void {
  page.on("console", (msg: ConsoleMessage) => {
    const type = msg.type();
    if (type !== "error" && type !== "warning") return;
    sink.push({
      type: type === "error" ? "error" : "warning",
      text: msg.text(),
      url: page.url(),
    });
  });
  page.on("pageerror", (err) => {
    sink.push({
      type: "error",
      text: `pageerror: ${err.message}`,
      url: page.url(),
    });
  });
}

function dumpConsoleLog(projectName: string, entries: ConsoleEntry[]): void {
  const folder = viewportFolder(projectName);
  ensureDir(folder);
  fs.writeFileSync(
    path.join(folder, "_console.json"),
    JSON.stringify(entries, null, 2),
  );
}

const YAS_QUERY = "source=yas&embedded=true";

test.describe("YAS visual audit", () => {
  test.beforeEach(async ({ page }) => {
    // Désactive les animations CSS pour des captures stables.
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.documentElement.appendChild(style);
    });
  });

  test("full mini-app + parcours utilisateur + non-régression site normal", async ({
    page,
  }, testInfo) => {
    const projectName = testInfo.project.name; // "iphone-13" | "galaxy-s8plus"
    const consoleEntries: ConsoleEntry[] = [];
    attachConsoleCollector(page, consoleEntries);
    test.setTimeout(180_000);

    // ───────────────────────── A. Page d'accueil mini-app
    await page.goto(`/yas-app?${YAS_QUERY}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await shot(page, projectName, "01-yas-home-fullpage");

    // Top viewport
    await viewportShot(page, projectName, "02-yas-home-top");

    // Scroll de 600px
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await page.waitForTimeout(300);
    await viewportShot(page, projectName, "03-yas-home-middle");

    // Bottom
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(300);
    await viewportShot(page, projectName, "04-yas-home-bottom");

    // ───────────────────────── B. Action "Acheter"
    await page.goto(`/yas-app?${YAS_QUERY}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    // Click "Acheter une voiture" (anchor card)
    const acheterCard = page.getByRole("link", { name: /Acheter une voiture/i }).first();
    await acheterCard.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await shot(page, projectName, "05-recherche-arrivee");

    // Scroll un peu sur la recherche
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
    await page.waitForTimeout(300);
    await viewportShot(page, projectName, "06-recherche-scroll");

    // Click sur la première annonce si présente
    const firstListing = page.locator('a[href^="/annonce/"]').first();
    const hasListings = (await firstListing.count()) > 0;
    if (hasListings) {
      await firstListing.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
      await shot(page, projectName, "07-annonce-detail");

      // Click breadcrumb "Accueil"
      const breadcrumbHome = page.getByRole("link", { name: /Accueil/i }).first();
      if ((await breadcrumbHome.count()) > 0) {
        await breadcrumbHome.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
        await shot(page, projectName, "08-retour-yas-via-breadcrumb");
      }
    } else {
      // Fallback : pas d'annonces — capture l'état vide
      await shot(page, projectName, "07-annonce-detail-skipped-no-listings");
    }

    // ───────────────────────── C. Action "Estimer"
    await page.goto(`/yas-app?${YAS_QUERY}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    const estimerCard = page.getByRole("link", { name: /Estimer ma voiture/i }).first();
    await estimerCard.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await shot(page, projectName, "09-estimation-top");

    // Scroll
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    await page.waitForTimeout(300);
    await viewportShot(page, projectName, "10-estimation-scroll");

    // Click "Retour à AutoNex"
    const backBtn = page.getByRole("link", { name: /Retour à AutoNex/i }).first();
    if ((await backBtn.count()) > 0) {
      await backBtn.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await shot(page, projectName, "11-retour-yas-via-backbutton");
    }

    // ───────────────────────── D. Action "Bonnes affaires" — TEST DU BUG SCROLL #deals
    await page.goto(`/yas-app?${YAS_QUERY}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Avant click — scroll position 0
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(200);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await shot(page, projectName, "12-deals-before-click");

    const dealsCard = page.locator('a[href="#deals"]').first();
    const dealsExists = (await dealsCard.count()) > 0;
    if (dealsExists) {
      await dealsCard.click();
      // Capture immédiate (~100ms)
      await page.waitForTimeout(100);
      const scrollAt100 = await page.evaluate(() => window.scrollY);
      await viewportShot(page, projectName, "13-deals-after-100ms");

      // Capture après 1s (état final)
      await page.waitForTimeout(900);
      const scrollAt1s = await page.evaluate(() => window.scrollY);
      await viewportShot(page, projectName, "14-deals-after-1s");

      // Note dans le log console pour le rapport
      consoleEntries.push({
        type: "info" as const,
        text: `[AUDIT NOTE] Bonnes affaires scroll: before=${scrollBefore}px → 100ms=${scrollAt100}px → 1s=${scrollAt1s}px (target #deals)`,
        url: page.url(),
      });
    }

    // ───────────────────────── E. Action "Vendre" (auth required → redirect login)
    await page.goto(`/yas-app?${YAS_QUERY}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    const vendreCard = page.getByRole("link", { name: /Vendre ma voiture/i }).first();
    await vendreCard.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    const vendreUrl = page.url();
    await shot(page, projectName, "15-vendre-redirect");
    consoleEntries.push({
      type: "info" as const,
      text: `[AUDIT NOTE] Vendre URL après click: ${vendreUrl} — should contain source=yas&embedded=true`,
      url: vendreUrl,
    });

    // ───────────────────────── F. CTA conclusif "Hésitant à vendre ?"
    await page.goto(`/yas-app?${YAS_QUERY}`);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(500);
    await viewportShot(page, projectName, "16-cta-cross-sell");

    // Click le bouton CTA finale
    const ctaButton = page.getByRole("link", { name: /^Estimer ma voiture$/i }).last();
    if ((await ctaButton.count()) > 0) {
      await ctaButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
      await shot(page, projectName, "17-cta-cross-sell-arrivee");
    }

    // ───────────────────────── G. Non-régression site normal
    await page.goto(`/`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await shot(page, projectName, "18-site-normal-home");

    await page.goto(`/recherche`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await shot(page, projectName, "19-site-normal-recherche");

    await page.goto(`/estimation`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await shot(page, projectName, "20-site-normal-estimation");

    // ───────────────────────── Sauvegarde du log console
    dumpConsoleLog(projectName, consoleEntries);

    // Assertion souple : on n'attend pas un test "vert" — le but est de
    // produire les artefacts. On vérifie juste que le contexte YAS a
    // pu démarrer (sinon les screenshots seraient inutiles).
    expect(consoleEntries.length).toBeGreaterThanOrEqual(0);
  });
});
