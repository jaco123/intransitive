'use strict';

/* Real-IP regressions for the Intransitive naming, profiles, premoves, and Watch UI. */
const assert = require('assert');
const crypto = require('crypto');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');

async function registerUser(context) {
  const page = await context.newPage({ viewport: { width: 1366, height: 768 } });
  page.setDefaultTimeout(15000);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const username = 'qa' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await page.locator('#authModal').waitFor({ state: 'visible' });
  await page.locator('#authUsername').fill(username);
  await page.locator('#authPassword').fill(crypto.randomBytes(18).toString('base64url'));
  await page.locator('#authSubmit').click();
  await page.locator('#navUser').waitFor({ state: 'visible' });
  return { page, username };
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

async function clickMove(page, boardSelector, color = 'blue') {
  const source = page.locator(boardSelector + ' .piece[data-color="' + color + '"]').first();
  await source.click();
  const target = await page.locator(boardSelector + ' .mv-dot').first().boundingBox();
  assert.ok(target, 'a legal move target should be visible');
  await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
}

async function assertFavicon(page) {
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  assert.ok(href, 'view should declare a favicon');
  assert.strictEqual((await page.request.get(new URL(href, BASE + '/').href)).status(), 200, 'favicon should load');
}

(async () => {
  const failures = [];
  const browser = await firefox.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(String(error)));

    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await assertFavicon(page);
      assert.strictEqual(await page.title(), 'Intransitive', 'browser title should use Intransitive');
      assert.strictEqual(await page.locator('#navBrand').innerText(), 'Intransitive', 'brand should use Intransitive');
      const nav = await page.locator('#nav .nav-inner').boundingBox();
      const brand = await page.locator('#navBrand').boundingBox();
      const auth = await page.locator('#navAuth').boundingBox();
      assert.ok(nav && brand && auth && brand.x <= nav.x + 8, 'brand should be flush left');
      assert.ok(auth.x + auth.width >= nav.x + nav.width - 8, 'profile controls should be flush right');
      assert.strictEqual(await page.getByRole('button', { name: 'Leaderboard', exact: true }).count(), 1, 'Leaderboard nav button missing');
    } catch (error) { failures.push('Intransitive naming/top-bar/Leaderboard: ' + error.message); }

    try {
      await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
      await page.locator('#leaderboard').waitFor({ state: 'visible' });
      await assertFavicon(page);
      assert.strictEqual(new URL(page.url()).searchParams.get('view'), 'leaderboard');
      const boards = page.locator('.leaderboard-panel[data-category]');
      assert.strictEqual(await boards.count(), 4, 'Leaderboard should have four category panels');
      for (const category of ['bullet', 'blitz', 'rapid', 'classical']) {
        const panel = page.locator('.leaderboard-panel[data-category="' + category + '"]');
        assert.strictEqual(await panel.count(), 1, category + ' leaderboard missing');
        assert.ok(await panel.locator('tbody tr').count() <= 10, category + ' leaderboard must be capped at ten');
      }
      await page.locator('#leaderboardBack').click();
      assert.strictEqual(new URL(page.url()).search, '', 'Leaderboard Back should update URL');
      await page.getByRole('button', { name: 'Watch', exact: true }).click();
      await page.locator('#watch').waitFor({ state: 'visible' });
      const watchGrid = await page.locator('#watchList').evaluate((el) => getComputedStyle(el).gridTemplateColumns);
      assert.ok(watchGrid.split(' ').length >= 2, 'Watch should use a responsive card grid');
      const watchCard = page.locator('#watchList .watch-game').first();
      if (await watchCard.count()) {
        const preview = page.locator('#watchList .watch-game-preview').first();
        const box = await preview.boundingBox();
        assert.ok(box && box.width >= 120, 'Watch previews should be substantially larger');
        const playersBox = await page.locator('#watchList .watch-game-players').first().boundingBox();
        assert.ok(playersBox && box && playersBox.y >= box.y + box.height - 2, 'Watch names should be below previews');
      }
    } catch (error) { failures.push('Leaderboard UI/categories/history: ' + error.message); }

    try {
      const profileContext = await browser.newContext();
      const known = await registerUser(profileContext);
      await known.page.getByRole('button', { name: 'Players', exact: true }).click();
      await known.page.locator('#playersSearch').fill(known.username);
      const row = known.page.locator('.player-directory-row').filter({ hasText: known.username });
      await row.waitFor();
      assert.strictEqual(await row.locator('.rating-category').count(), 0, 'Players rows should use icons instead of category words');
      assert.strictEqual(await row.locator('[data-time-control]').count(), 4, 'Players rows should show four time-control symbols');
      await row.click();
      await known.page.locator('.profile-card').waitFor({ state: 'visible' });
      assert.strictEqual(new URL(known.page.url()).searchParams.get('view'), 'profile');
      assert.strictEqual(await known.page.locator('#profileLogout').isVisible(), false, 'public profile must not show Log out');
      assert.ok(await known.page.locator('#profileHistory').count() === 1, 'public profile should expose bounded history');
      await assertFavicon(known.page);
    } catch (error) { failures.push('Players icons/public profile history: ' + error.message); }

    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Board editor', exact: true }).click();
      const actions = page.locator('#editor .editor-action');
      const initialColors = await actions.evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
      assert.ok(initialColors.every((color) => color === initialColors[0]), 'Continue text should match neutral editor actions');
      await page.locator('#editorToAnalysis').hover();
      const hoverColors = await actions.evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
      assert.ok(hoverColors.every((color) => color === hoverColors[0]), 'hover text colors should remain consistent');
      await page.locator('#editorToAnalysis').evaluate((el) => { el.disabled = true; });
      const disabledColors = await actions.evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
      assert.ok(disabledColors.every((color) => color === disabledColors[0]), 'disabled text colors should remain consistent');
    } catch (error) { failures.push('editor Continue text color states: ' + error.message); }

    try {
      const creator = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      const opponent = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      await createPrivateGame(creator, opponent);
      await clickMove(creator, '#board');
      await creator.locator('#moves li').waitFor();
      const blueSource = creator.locator('#board .piece[data-color="blue"]').first();
      await blueSource.click();
      const premoveTarget = await creator.locator('#board .mv-dot').first().boundingBox();
      assert.ok(premoveTarget, 'premove destination should be selectable while waiting');
      await creator.mouse.click(premoveTarget.x + premoveTarget.width / 2, premoveTarget.y + premoveTarget.height / 2);
      await clickMove(opponent, '#board', 'red');
      await creator.locator('#moves li').nth(1).waitFor({ timeout: 5000 });
      assert.strictEqual(await creator.locator('#moves li').count(), 2, 'queued premove should execute after opponent move');
      assert.doesNotMatch(await creator.locator('#gameStatus').innerText(), /Invalid|illegal|error/i, 'premove should not send an invalid move');
      await opponent.close();
      await creator.close();
    } catch (error) { failures.push('premove queue/automatic execution: ' + error.message); }

    try {
      const ratedHighContext = await browser.newContext();
      const ratedLowContext = await browser.newContext();
      const high = await registerUser(ratedHighContext);
      const low = await registerUser(ratedLowContext);
      await createPrivateGame(high.page, low.page);
      await low.page.locator('#resign').click();
      await low.page.locator('#actionConfirmYes').click();
      await high.page.locator('#gameStatus').filter({ hasText: /resignation/ }).waitFor();
      assert.doesNotMatch(await high.page.locator('#gameStatus').innerText(), /·\s*[+-]\d+/, 'result text should not contain rating delta');
      assert.match(await high.page.locator('#playerName').innerText(), /\d+/, 'player display should show rating');
      assert.match(await high.page.locator('#opponentName').innerText(), /\d+/, 'opponent display should show rating');
      assert.doesNotMatch(await high.page.locator('body').innerText(), / · You\b/, 'user-facing player labels should not append You');
      await high.page.locator('#finishedAnalysis').click();
      await high.page.locator('#explorer').waitFor({ state: 'visible' });
      assert.ok(await high.page.locator('#explorerHistory [data-analysis-step]').count() >= 1, 'finished analysis should include the full game history');
      assert.ok(await high.page.locator('#explorerBoard .analysis-source, #explorerBoard .analysis-destination').count() >= 1, 'finished analysis should highlight the selected move');
    } catch (error) { failures.push('rated result labels/full finished analysis: ' + error.message); }

    try { assert.deepStrictEqual(errors, [], 'main affected views should have no console/page errors'); }
    catch (error) { failures.push(error.message); }
  } finally {
    await browser.close();
  }
  if (failures.length) throw new Error(failures.join(' | '));
  console.log('PASS latest UI4 regressions');
})().catch((error) => { console.error('LATEST UI4 REGRESSION FAILED:', error.message); process.exitCode = 1; });
