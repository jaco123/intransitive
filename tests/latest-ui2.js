'use strict';

/* Live-IP TFV regressions for the latest RPS UI request. */
const assert = require('assert');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');

async function openEditor(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Board editor', exact: true }).click();
  await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor();
}

async function joinCreatedGame(createPage, joinPage) {
  await createPage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await createPage.locator('#createBtn').click();
  await createPage.locator('#gameStatus').filter({ hasText: /Waiting for opponent/ }).waitFor();
  const url = createPage.url();
  await joinPage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await joinPage.locator('#joinInput').fill(url);
  await joinPage.locator('#joinBtn').click();
  await createPage.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor({ timeout: 5000 });
  await joinPage.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor({ timeout: 5000 });
}

async function createCustomCaptureGame(page, joinPage) {
  await openEditor(page);
  await page.getByRole('button', { name: 'Clear board', exact: true }).click();
  await page.getByRole('button', { name: 'Blue Rock', exact: true }).click();
  await page.locator('#editorBoard .sq[data-c="1"][data-r="4"]').click();
  await page.getByRole('button', { name: 'Red Scissors', exact: true }).click();
  await page.locator('#editorBoard .sq[data-c="2"][data-r="4"]').click();
  await page.getByRole('button', { name: 'Continue from here', exact: true }).click();
  await page.locator('#playFromPositionPreview').waitFor();
  await page.locator('#createBtn').click();
  await page.locator('#gameStatus').filter({ hasText: /Waiting for opponent/ }).waitFor();
  const url = page.url();
  await joinPage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await joinPage.locator('#joinInput').fill(url);
  await joinPage.locator('#joinBtn').click();
  await page.locator('#gameStatus').filter({ hasText: /Your move/ }).waitFor({ timeout: 5000 });
  await joinPage.locator('#gameStatus').filter({ hasText: /to move/ }).waitFor({ timeout: 5000 });
}

(async () => {
  const failures = [];
  const browser = await firefox.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.setDefaultTimeout(3000);

    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      assert.strictEqual(await page.getByRole('button', { name: 'Watch', exact: true }).count(), 1, 'Watch nav button missing');
      assert.strictEqual(await page.getByRole('button', { name: 'Players', exact: true }).count(), 1, 'Players nav button missing');
    } catch (error) { failures.push('Watch/Players navigation: ' + error.message); }

    try {
      const nav = page.locator('nav').first();
      assert.strictEqual(await nav.evaluate((el) => getComputedStyle(el).borderBottomStyle), 'none', 'top-nav separator should be absent');
    } catch (error) { failures.push('top-nav separator: ' + error.message); }

    try {
      await openEditor(page);
      const checks = await page.locator('#editor .side > .btn, #editor .actions .btn').evaluateAll((els) => els.map((el) => {
        const s = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return { bg: s.backgroundColor, border: s.borderStyle, outline: s.outlineStyle, textAlign: s.textAlign, x: rect.x, y: rect.y, h: rect.height };
      }));
      assert.strictEqual(checks.length, 5, 'editor should have five action buttons');
      assert.ok(checks.every((x) => /rgba\(0, 0, 0, 0\)|transparent/.test(x.bg) && x.border === 'none' && x.outline === 'none' && x.textAlign === 'left'),
        'editor action buttons should be text/icon only by default');
      assert.ok(checks.every((x, i) => i === 0 || Math.abs((x.y - checks[i - 1].y) - checks[i - 1].h - 8) < 3), 'editor action spacing should be uniform');
      const heading = await page.locator('#editor h1').boundingBox();
      const board = await page.locator('#editorBoard').boundingBox();
      assert.ok(heading && board && heading.x <= board.x + 10, 'editor heading should be left of the board');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight),
        'editor should fit a laptop viewport without clipping or page scroll');
      await page.locator('#editorReset').hover();
      assert.notStrictEqual(await page.locator('#editorReset').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)',
        'editor hover should reveal button styling');
    } catch (error) { failures.push('editor layout/buttons: ' + error.message); }

    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('checkbox', { name: 'Play from position' }).check();
      const preview = await page.locator('#playFromPositionPreview').boundingBox();
      const create = await page.locator('#createBtn').boundingBox();
      assert.ok(preview && create && create.y - (preview.y + preview.height) >= 8, 'preview needs a visible gap before Create lobby game');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'home should not overflow horizontally');
    } catch (error) { failures.push('home scale/preview spacing: ' + error.message); }

    const gamePage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const opponentPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    try {
      await createCustomCaptureGame(gamePage, opponentPage);
      const source = gamePage.locator('#board .piece[data-c="1"][data-r="4"]');
      const target = gamePage.locator('#board .sq[data-c="2"][data-r="4"]');
      assert.ok(!/grab|grabbing|pointer/.test(await source.evaluate((el) => getComputedStyle(el).cursor)), 'ordinary move should use a regular cursor');
      await source.click();
      await target.click();
      await gamePage.locator('#moves .move[data-step="0"]').waitFor({ timeout: 3000 });
      assert.strictEqual(await gamePage.locator('#board .sq[data-c="1"][data-r="4"] .piece').count(), 0, 'captured source should be empty');
      assert.strictEqual(await gamePage.locator('#board .sq[data-c="2"][data-r="4"] .piece[data-color="blue"]').count(), 1, 'capture should move the blue piece onto target');
    } catch (error) { failures.push('normal click capture/cursor: ' + error.message); }

    try {
      assert.strictEqual(await page.getByRole('button', { name: /Highest-rated|Ongoing game|Watch/i }).count() > 0, true,
        'home should expose a clickable highest-rated ongoing game');
    } catch (error) { failures.push('highest-rated ongoing game: ' + error.message); }

    try {
      await page.getByRole('button', { name: 'Watch', exact: true }).click();
      await page.getByRole('heading', { name: 'Watch', exact: true }).waitFor();
      assert.strictEqual(await page.locator('link[rel="icon"]').count(), 1, 'Watch should retain the favicon');
      assert.ok(await page.locator('[data-game-id], .active-game, .watch-game').count() > 0, 'Watch should list active games');
      await page.locator('[data-game-id], .active-game, .watch-game').first().click();
      await page.locator('#game').waitFor();
      assert.strictEqual(await page.locator('#gameChatInput').count(), 1, 'spectator chat input missing');
      assert.strictEqual(await page.locator('#resign').isVisible(), false, 'spectator must not have player controls');
    } catch (error) { failures.push('Watch active-game spectator flow: ' + error.message); }

    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Players', exact: true }).click();
      await page.getByRole('heading', { name: 'Players', exact: true }).waitFor();
      assert.strictEqual(await page.locator('link[rel="icon"]').count(), 1, 'Players should retain the favicon');
      const search = page.getByRole('textbox', { name: /search/i });
      await search.fill('definitely-no-such-player');
      await page.waitForTimeout(250);
      assert.match(await page.locator('body').innerText(), /no players|no results/i, 'Players should show a no-result state');
    } catch (error) { failures.push('Players directory/search: ' + error.message); }
  } finally {
    await browser.close();
  }
  if (failures.length) throw new Error(failures.join(' | '));
  console.log('PASS latest UI2 regressions');
})().catch((error) => { console.error('LATEST UI2 REGRESSION FAILED:', error.message); process.exitCode = 1; });
