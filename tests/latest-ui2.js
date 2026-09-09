'use strict';

/* Live-IP TFV regressions for the latest RPS UI request. */
const assert = require('assert');
const crypto = require('crypto');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');

async function openEditor(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Board editor', exact: true }).click();
  await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor();
}

async function registerUser(context, prefix) {
  const page = await context.newPage({ viewport: { width: 1366, height: 768 } });
  page.setDefaultTimeout(5000);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const username = 'qa' + prefix + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const password = crypto.randomBytes(18).toString('base64url');
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await page.locator('#authModal').waitFor({ state: 'visible' });
  await page.locator('#authUsername').fill(username);
  await page.locator('#authPassword').fill(password);
  await page.locator('#authSubmit').click();
  await page.locator('#navUser').waitFor({ state: 'visible' });
  return { page, username, password };
}

async function createPrivateGame(createPage, joinPage) {
  await createPage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await createPage.locator('#createBtn').click();
  await createPage.locator('#gameStatus').filter({ hasText: /Waiting for opponent/ }).waitFor();
  const url = createPage.url();
  await joinPage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await joinPage.locator('#joinInput').fill(url);
  await joinPage.locator('#joinBtn').click();
  await createPage.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor({ timeout: 5000 });
  await joinPage.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor({ timeout: 5000 });
  return new URL(url).searchParams.get('game');
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
      assert.strictEqual(checks.length, 6, 'editor should have six action buttons including Add to study');
      assert.ok(checks.every((x) => /rgba\(0, 0, 0, 0\)|transparent/.test(x.bg) && x.border === 'none' && x.outline === 'none' && x.textAlign === 'left'),
        'editor action buttons should be text/icon only by default');
      assert.ok(checks.every((x, i) => i === 0 || Math.abs((x.y - checks[i - 1].y) - checks[i - 1].h - 8) < 3), 'editor action spacing should be uniform');
      const heading = await page.locator('#editor h1').boundingBox();
      const board = await page.locator('#editorBoard').boundingBox();
      assert.ok(heading && board && heading.x <= board.x + 10, 'editor heading should be left of the board');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight),
        'editor should fit a laptop viewport without clipping or page scroll');
      await page.locator('#editorReset').hover();
      const hover = await page.locator('#editorReset').evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return {
          active: el.matches(':hover'),
          background: getComputedStyle(el).backgroundColor,
          hitInsideButton: hit === el || el.contains(hit),
        };
      });
      assert.strictEqual(hover.active, true, 'editor hover should reach the action button');
      assert.strictEqual(hover.hitInsideButton, true, 'editor hover should not be blocked by another layer');
      assert.notStrictEqual(hover.background, 'rgba(0, 0, 0, 0)', 'editor hover should reveal button styling');
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
      try {
        assert.ok(!/grab|grabbing|pointer/.test(await source.evaluate((el) => getComputedStyle(el).cursor)), 'ordinary move should use a regular cursor');
      } catch (error) { failures.push('ordinary move cursor: ' + error.message); }
      await source.click();
      await target.click();
      await gamePage.locator('#moves .move[data-step="0"]').waitFor({ timeout: 3000 });
      assert.strictEqual(await gamePage.locator('#board .sq[data-c="1"][data-r="4"] .piece').count(), 0, 'captured source should be empty');
      assert.strictEqual(await gamePage.locator('#board .sq[data-c="2"][data-r="4"] .piece[data-color="blue"]').count(), 1, 'capture should move the blue piece onto target');
    } catch (error) { failures.push('normal click capture/cursor: ' + error.message); }

    const activeCreator = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const activeOpponent = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    try { await joinCreatedGame(activeCreator, activeOpponent); }
    catch (error) { failures.push('active game setup for Watch: ' + error.message); }

    let featuredId = null;
    try {
      // Use separate browser contexts so the two authenticated users have independent sessions.
      const highContext = await browser.newContext();
      const lowContext = await browser.newContext();
      const high = await registerUser(highContext, 'hi');
      const low = await registerUser(lowContext, 'lo');
      await joinCreatedGame(high.page, low.page);
      await low.page.locator('#resign').click();
      await low.page.locator('#actionConfirmYes').click();
      await high.page.locator('#gameStatus').filter({ hasText: /resignation/ }).waitFor({ timeout: 5000 });
      await low.page.locator('#gameStatus').filter({ hasText: /resignation/ }).waitFor({ timeout: 5000 });

      const highGuestContext = await browser.newContext();
      const lowGuestContext = await browser.newContext();
      const highGuest = await highGuestContext.newPage({ viewport: { width: 1366, height: 768 } });
      const lowGuest = await lowGuestContext.newPage({ viewport: { width: 1366, height: 768 } });
      featuredId = await createPrivateGame(high.page, highGuest);
      const lowGameId = await createPrivateGame(low.page, lowGuest);
      assert.notStrictEqual(featuredId, lowGameId, 'featured regression needs two different active games');

      const watchResponse = await page.request.get(BASE + '/api/watch', { timeout: 5000 });
      assert.strictEqual(watchResponse.status(), 200, '/api/watch should be available');
      const watchData = await watchResponse.json();
      const active = watchData.games.filter((game) => game.status === 'playing');
      const score = (game) => Math.max(...['blue', 'red'].map((color) => {
        const rating = game.players[color] && game.players[color].rating;
        return Number.isFinite(rating) ? rating : -1;
      }));
      const expected = active.slice().sort((a, b) =>
        (score(b) - score(a)) || (a.createdAt - b.createdAt) || a.id.localeCompare(b.id)
      )[0];
      assert.ok(expected, '/api/watch should expose active playing games');
      assert.ok(score(active.find((game) => game.id === featuredId)) !== score(active.find((game) => game.id === lowGameId)),
        'featured regression games should have distinct player ratings');
      assert.ok(watchData.featured, '/api/watch should select a featured game');
      assert.strictEqual(watchData.featured.id, expected.id, '/api/watch featured game should be highest-rated with deterministic tie-breaks');

      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.locator('#homeFeaturedGame [data-game-id="' + watchData.featured.id + '"]').waitFor({ timeout: 5000 });
      assert.strictEqual(await page.locator('#homeFeaturedGame [data-game-id="' + watchData.featured.id + '"]').isVisible(), true,
        'home should render the exact /api/watch featured game');
    } catch (error) { failures.push('highest-rated featured game selection: ' + error.message); }

    try {
      assert.strictEqual(await page.getByRole('button', { name: /Highest-rated|Ongoing game|Watch/i }).count() > 0, true,
        'home should expose a clickable highest-rated ongoing game');
    } catch (error) { failures.push('highest-rated ongoing game: ' + error.message); }

    try {
      await page.getByRole('button', { name: 'Watch', exact: true }).click();
      await page.getByRole('heading', { name: 'Watch', exact: true }).waitFor();
      assert.strictEqual(await page.locator('link[rel="icon"]').count(), 1, 'Watch should retain the favicon');
      assert.ok(await page.locator('#watch [data-game-id]').count() > 0, 'Watch should list active games');
      const activeGameId = new URL(activeCreator.url()).searchParams.get('game');
      await page.locator('#watch [data-game-id="' + activeGameId + '"]').first().click();
      await page.locator('#game').waitFor();
      assert.strictEqual(await page.locator('#gameChatInput').count(), 1, 'spectator chat input missing');
      assert.strictEqual(await page.locator('#resign').isVisible(), false, 'spectator must not have player controls');
      await page.locator('#gameChatInput').fill('spectator hello');
      await page.locator('#gameChatSend').click();
      await page.getByText('spectator hello', { exact: true }).waitFor();
      await activeCreator.getByText('spectator hello', { exact: true }).waitFor();
    } catch (error) { failures.push('Watch active-game spectator flow: ' + error.message); }

    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Players', exact: true }).click();
      await page.getByRole('heading', { name: 'Players', exact: true }).waitFor();
      assert.strictEqual(await page.locator('link[rel="icon"]').count(), 1, 'Players should retain the favicon');
      const search = page.locator('#playersSearch');
      const playersContext = await browser.newContext();
      const known = await registerUser(playersContext, 'pl');
      await known.page.getByRole('button', { name: 'Players', exact: true }).click();
      await known.page.getByRole('heading', { name: 'Players', exact: true }).waitFor();
      const positiveSearch = known.page.locator('#playersSearch');
      await positiveSearch.fill(known.username);
      const matchingRow = known.page.locator('.player-directory-row').filter({ hasText: known.username });
      await matchingRow.waitFor({ timeout: 5000 });
      assert.strictEqual(await matchingRow.count(), 1, 'Players search should return the known registered user');
      assert.match(await matchingRow.first().innerText(), new RegExp(known.username), 'matching player row should include the username');

      // Preserve the existing no-result assertion after the positive search.
      const noResultSearch = known.page.locator('#playersSearch');
      await noResultSearch.fill('definitely-no-such-player');
      await known.page.locator('#playersEmpty').waitFor({ state: 'visible', timeout: 5000 });
      assert.match(await known.page.locator('body').innerText(), /no players|no results/i, 'Players should show a no-result state');

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
