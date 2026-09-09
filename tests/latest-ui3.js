'use strict';

/* Real-IP regressions for the current analysis, navigation, directory, and watch UI. */
const assert = require('assert');
const crypto = require('crypto');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');

async function openAnalysis(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Analysis', exact: true }).click();
  await page.locator('#explorer').waitFor({ state: 'visible' });
}

async function openEditor(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Board editor', exact: true }).click();
  await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor({ state: 'visible' });
}

async function assertFavicon(page) {
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  assert.ok(href, 'affected view should declare a favicon');
  const response = await page.request.get(new URL(href, BASE + '/').href);
  assert.strictEqual(response.status(), 200, 'affected view favicon should be reachable');
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

async function pointerDrag(page, source, target) {
  const from = await page.locator(source).first().boundingBox();
  const to = await page.locator(target).first().boundingBox();
  assert.ok(from && to, 'drag source and target should be visible');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 5 });
  await page.mouse.up();
}

(async () => {
  const failures = [];
  const browser = await firefox.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.setDefaultTimeout(4000);
    const pageErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    await page.addInitScript(() => {
      window.__rpsAudioPlays = [];
      HTMLMediaElement.prototype.play = function () {
        window.__rpsAudioPlays.push(this.currentSrc || this.src || this.getAttribute('src') || 'audio');
        return Promise.resolve();
      };
    });

    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await assertFavicon(page);
      const navButtons = page.locator('.nav-links .nav-link-btn');
      const navMetrics = await navButtons.evaluateAll((els) => ({
        heights: els.map((el) => el.getBoundingClientRect().height),
        gap: parseFloat(getComputedStyle(els[0].parentElement).columnGap || getComputedStyle(els[0].parentElement).gap || '0'),
      }));
      assert.ok(navMetrics.heights.every((height) => height >= 38), 'top-bar buttons should be modestly enlarged');
      assert.ok(navMetrics.gap >= 8, 'top-bar buttons should have a visible spread');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'top bar should not overflow');
    } catch (error) { failures.push('top-bar sizing/spread: ' + error.message); }

    try {
      await page.getByRole('button', { name: 'Analysis', exact: true }).click();
      await page.locator('#explorer').waitFor({ state: 'visible' });
      await assertFavicon(page);
      assert.strictEqual(new URL(page.url()).searchParams.get('view'), 'analysis', 'Analysis should update the URL');
      await page.getByRole('button', { name: 'Board editor', exact: true }).click();
      await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor({ state: 'visible' });
      assert.strictEqual(new URL(page.url()).searchParams.get('view'), 'editor', 'editor should update the URL');
      await page.locator('#editorBack').click();
      await page.locator('#home').waitFor({ state: 'visible' });
      assert.strictEqual(new URL(page.url()).search, '', 'in-app Back should update the URL');
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      assert.strictEqual(new URL(page.url()).search, '', 'Play should clear the stale view URL');
    } catch (error) { failures.push('view routing/history URLs: ' + error.message); }

    try {
      await openEditor(page);
      await assertFavicon(page);
      const actions = page.locator('#editor .editor-action');
      const styles = await actions.evaluateAll((els) => els.map((el) => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, border: s.borderStyle, outline: s.outlineStyle };
      }));
      assert.strictEqual(styles.length, 5, 'editor should expose five actions');
      assert.ok(styles.every((style) => style.background === styles[0].background), 'Continue should stay neutral by default');
      await page.locator('#editorToAnalysis').hover();
      assert.notStrictEqual(await page.locator('#editorToAnalysis').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', 'Continue hover should be visible');
      await page.locator('#editorToAnalysis').focus();
      assert.notStrictEqual(await page.locator('#editorToAnalysis').evaluate((el) => getComputedStyle(el).outlineStyle), 'none', 'Continue keyboard focus should remain visible');
    } catch (error) { failures.push('editor neutral action styling: ' + error.message); }

    try {
      await page.getByRole('button', { name: 'Clear board', exact: true }).click();
      await page.getByRole('button', { name: 'Blue Rock', exact: true }).click();
      const board = page.locator('#editorBoard');
      const squares = ['0', '1', '2'].map((c) => '#editorBoard .sq[data-c="' + c + '"][data-r="4"]');
      const first = await page.locator(squares[0]).boundingBox();
      const second = await page.locator(squares[1]).boundingBox();
      const third = await page.locator(squares[2]).boundingBox();
      assert.ok(first && second && third, 'paint squares should be visible');
      await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
      await page.mouse.down();
      await page.mouse.move(second.x + second.width / 2, second.y + second.height / 2, { steps: 4 });
      await page.mouse.move(third.x + third.width / 2, third.y + third.height / 2, { steps: 4 });
      assert.strictEqual(await page.locator('#editorBoard .piece[data-c="0"][data-r="4"]').count(), 1, 'paint should fill the first traversed square');
      assert.strictEqual(await page.locator('#editorBoard .piece[data-c="1"][data-r="4"]').count(), 1, 'paint should fill the middle traversed square');
      assert.strictEqual(await page.locator('#editorBoard .piece[data-c="2"][data-r="4"]').count(), 1, 'paint should fill the final traversed square');
      const ghost = page.locator('.drag-ghost');
      await ghost.waitFor({ state: 'visible', timeout: 1000 });
      const outside = await page.locator('#editorClear').boundingBox();
      await page.mouse.move(outside.x + outside.width / 2, outside.y + outside.height / 2);
      await ghost.waitFor({ state: 'hidden', timeout: 1000 });
      await page.mouse.up();
      await page.getByRole('button', { name: 'Delete piece', exact: true }).first().click();
      const eraseFirst = await page.locator('#editorBoard .sq[data-c="0"][data-r="4"]').boundingBox();
      const eraseSecond = await page.locator('#editorBoard .sq[data-c="1"][data-r="4"]').boundingBox();
      const eraseThird = await page.locator('#editorBoard .sq[data-c="2"][data-r="4"]').boundingBox();
      await page.mouse.move(eraseFirst.x + eraseFirst.width / 2, eraseFirst.y + eraseFirst.height / 2);
      await page.mouse.down();
      await page.mouse.move(eraseSecond.x + eraseSecond.width / 2, eraseSecond.y + eraseSecond.height / 2, { steps: 4 });
      await page.mouse.move(eraseThird.x + eraseThird.width / 2, eraseThird.y + eraseThird.height / 2, { steps: 4 });
      assert.strictEqual(await page.locator('#editorBoard .piece[data-c="0"][data-r="4"]').count(), 0, 'trash should erase the first traversed square');
      assert.strictEqual(await page.locator('#editorBoard .piece[data-c="1"][data-r="4"]').count(), 0, 'trash should erase the middle traversed square');
      assert.strictEqual(await page.locator('#editorBoard .piece[data-c="2"][data-r="4"]').count(), 0, 'trash should erase the final traversed square');
      await page.mouse.up();
    } catch (error) { failures.push('editor paint traversal/ghost: ' + error.message); await page.mouse.up(); }

    try {
      await openAnalysis(page);
      assert.strictEqual(await page.getByText(/to move · .* games/).count(), 0, 'duplicate opening status should be removed');
      assert.strictEqual(await page.locator('#explorer .move-nav').count(), 1, 'Analysis should have one move navigation row');
      const lists = page.locator('#explorer ol, #explorer ul');
      assert.strictEqual(await lists.count(), 1, 'Analysis should have one move list');
      assert.ok(await lists.first().evaluate((el) => (parseFloat(getComputedStyle(el).minHeight) || 0) >= 8 * 24), 'analysis move list should show at least eight ply before scrolling');
    } catch (error) { failures.push('analysis duplicate move displays/layout: ' + error.message); }

    try {
      await page.getByRole('button', { name: 'Board editor', exact: true }).click();
      await page.getByRole('button', { name: 'Clear board', exact: true }).click();
      await page.getByRole('button', { name: 'Blue Rock', exact: true }).click();
      await page.locator('#editorBoard .sq[data-c="1"][data-r="4"]').click();
      await page.getByRole('button', { name: 'Red Scissors', exact: true }).click();
      await page.locator('#editorBoard .sq[data-c="2"][data-r="4"]').click();
      await page.getByRole('button', { name: 'Analysis board', exact: true }).click();
      await page.locator('#explorerBoard .piece[data-c="1"][data-r="4"][data-color="blue"]').click();
      await page.locator('#explorerBoard .sq[data-c="2"][data-r="4"]').click();
      await page.locator('#explorerBoard .piece[data-c="2"][data-r="4"][data-color="blue"]').waitFor({ state: 'visible' });
      assert.ok(await page.evaluate(() => window.__rpsAudioPlays.length > 0), 'Analysis capture should invoke the game sound playback path');
      await openAnalysis(page);
      await pointerDrag(page, '#explorerBoard .piece[data-color="blue"]', '#explorerBoard .sq[data-c="0"][data-r="5"]');
      assert.ok(await page.locator('#explorer .move-nav button').count() >= 4, 'Analysis drag move should update the move path');
    } catch (error) { failures.push('analysis click capture/drag/audio: ' + error.message); await page.mouse.up(); }

    try {
      const creator = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      const opponent = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      const gameId = await createPrivateGame(creator, opponent);
      await creator.getByRole('button', { name: 'Players', exact: true }).click();
      await creator.getByRole('heading', { name: 'Players', exact: true }).waitFor();
      await page.waitForTimeout(800);
      assert.strictEqual(await creator.locator('#players').isVisible(), true, 'background game events must not force another view to Game');
      assert.strictEqual(new URL(creator.url()).searchParams.get('view'), 'players', 'background game events must preserve the current URL');
      await opponent.close();
      await creator.close();
      assert.ok(gameId);
    } catch (error) { failures.push('background game event routing: ' + error.message); }

    try {
      const creator = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      const opponent = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      const gameId = await createPrivateGame(creator, opponent);
      const watch = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      await watch.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await watch.getByRole('button', { name: 'Watch', exact: true }).click();
      await assertFavicon(watch);
      await watch.locator('#watchList [data-game-id="' + gameId + '"]').waitFor();
      const card = watch.locator('#watchList [data-game-id="' + gameId + '"]');
      assert.strictEqual(await card.locator('.watch-game-preview').count(), 1, 'each Watch game should include a board preview');
      assert.strictEqual(await card.locator('.watch-game-preview .sq').count(), 81, 'Watch preview should render a complete board');
      const before = await card.locator('.watch-game-preview').innerHTML();
      const source = creator.locator('#board .piece[data-color="blue"]').first();
      await source.click();
      const target = await creator.locator('#board .mv-dot').first().boundingBox();
      assert.ok(target, 'live move target should be visible');
      await creator.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
      let updated = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        await watch.waitForTimeout(1000);
        if ((await card.locator('.watch-game-preview').innerHTML()) !== before) { updated = true; break; }
      }
      assert.strictEqual(updated, true, 'Watch preview should update after a game move');
      await card.locator('.watch-game-players').click();
      await watch.locator('#game').waitFor({ state: 'visible' });
      await opponent.close();
      await creator.close();
      await watch.close();
    } catch (error) { failures.push('Watch live board previews/update: ' + error.message); }

    try {
      const playersContext = await browser.newContext();
      const known = await registerUser(playersContext);
      await known.page.getByRole('button', { name: 'Players', exact: true }).click();
      await assertFavicon(known.page);
      await known.page.locator('#playersSearch').fill(known.username);
      const row = known.page.locator('.player-directory-row').filter({ hasText: known.username });
      await row.waitFor();
      await row.click();
      await known.page.locator('.profile-card').waitFor({ state: 'visible' });
      assert.strictEqual(new URL(known.page.url()).searchParams.get('view'), 'profile', 'player click should route to a profile URL');
      const profileText = await known.page.locator('body').innerText();
      for (const rating of ['Bullet', 'Blitz', 'Rapid', 'Classical']) assert.match(profileText, new RegExp(rating, 'i'), rating + ' rating should be shown');
      assert.strictEqual(await known.page.getByRole('button', { name: 'Log out', exact: true }).count(), 0, 'other player profile must not show Log out');
    } catch (error) { failures.push('Players profile/rating categories: ' + error.message); }
    try { assert.deepStrictEqual(pageErrors, [], 'affected views should have no console/page errors'); }
    catch (error) { failures.push(error.message); }
  } finally {
    await browser.close();
  }
  if (failures.length) throw new Error(failures.join(' | '));
  console.log('PASS latest UI3 regressions');
})().catch((error) => { console.error('LATEST UI3 REGRESSION FAILED:', error.message); process.exitCode = 1; });
