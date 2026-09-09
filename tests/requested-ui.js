'use strict';

/* Real-site regression coverage for the requested Intransitive UI changes. */
const assert = require('assert');
const crypto = require('crypto');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');

async function register(context) {
  const page = await context.newPage({ viewport: { width: 1366, height: 768 } });
  const username = 'ui' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  const password = crypto.randomBytes(18).toString('base64url');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await page.locator('#authUsername').fill(username);
  await page.locator('#authPassword').fill(password);
  await page.locator('#authSubmit').click();
  await page.locator('#navUser').waitFor({ state: 'visible' });
  return { page, username };
}

async function createGame(creator, opponent) {
  await creator.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await creator.locator('#createBtn').click();
  await creator.locator('#gameStatus').filter({ hasText: /Waiting for opponent/ }).waitFor();
  const url = creator.url();
  await opponent.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await opponent.locator('#joinInput').fill(url);
  await opponent.locator('#joinBtn').click();
  await creator.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor();
  await opponent.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor();
}

(async () => {
  const browser = await firefox.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

    const nav = await page.locator('#nav .nav-inner').boundingBox();
    const brand = await page.locator('#navBrand').boundingBox();
    const auth = await page.locator('#navAuth').boundingBox();
    const links = await page.locator('.nav-link-btn').first().evaluate((el) => ({
      fontSize: parseFloat(getComputedStyle(el).fontSize), height: el.getBoundingClientRect().height,
    }));
    assert.ok(nav && brand && brand.x <= nav.x + 2, 'brand should be flush with the navigation bar');
    assert.ok(nav && auth && auth.x + auth.width >= nav.x + nav.width - 2, 'auth controls should be flush with the navigation bar');
    assert.ok(links.fontSize >= 17 && links.height >= 46, 'navigation controls should be larger');

    await page.getByRole('button', { name: 'Watch', exact: true }).click();
    await page.locator('#watch').waitFor({ state: 'visible' });
    assert.deepStrictEqual(
      await page.locator('#watch .watch-filter:not([data-category="all"])').evaluateAll((els) => els.map((el) => el.dataset.category)),
      ['bullet', 'blitz', 'rapid', 'classical'],
      'Watch should provide all four time-control filters',
    );

    await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
    await page.locator('#leaderboard').waitFor({ state: 'visible' });
    assert.strictEqual(await page.locator('.leaderboard-panel .time-control-symbol').count(), 4,
      'each leaderboard heading should have a time-control symbol');
    const leaderboard = await page.locator('#leaderboard').boundingBox();
    assert.ok(leaderboard && leaderboard.height >= 600, 'leaderboard page should fill the available page');
    await page.locator('.leaderboard-panel tbody tr').first().locator('.leaderboard-player').click();
    await page.locator('.profile-card').waitFor({ state: 'visible' });
    assert.ok(await page.locator('.profile-crown').count() >= 1, 'leaderboard leader should have a profile crown');
    assert.ok(await page.locator('.profile-crown[title]').count() >= 1, 'profile crown should identify its category on hover');

    await page.getByRole('button', { name: 'Analysis', exact: true }).click();
    await page.locator('#explorerBoard .sq').first().waitFor({ state: 'visible' });
    const openingMove = page.locator('#explorerMoves .explorer-move').first();
    if (await openingMove.count()) {
      await openingMove.click();
      await page.locator('#explorerBoard .lastmove').nth(1).waitFor({ state: 'visible' });
      assert.strictEqual(await page.locator('#explorerBoard .lastmove').count(), 2, 'analysis should highlight both last-move squares');
    }

    await page.getByRole('button', { name: 'Board editor', exact: true }).click();
    await page.getByRole('button', { name: 'Blue Rock', exact: true }).click();
    const square = page.locator('#editorBoard .sq[data-c="4"][data-r="4"]');
    await square.hover();
    assert.strictEqual(await page.locator('#editorBoard .editor-cursor-piece').count(), 1,
      'selected editor piece should follow the pointer');
    assert.strictEqual(await page.locator('#editorBoard .piece').first().getAttribute('draggable'), 'false',
      'editor painting mode should not enable dragging');

    const creatorContext = await browser.newContext();
    const opponentContext = await browser.newContext();
    const creator = await register(creatorContext);
    const opponent = await register(opponentContext);
    await createGame(creator.page, opponent.page);
    await creator.page.locator('#opponentName').click();
    assert.strictEqual(new URL(creator.page.url()).searchParams.get('view'), 'profile',
      'clicking the opponent name should open the opponent profile');
    await creator.page.close();
    await opponent.page.close();
    await creatorContext.close();
    await opponentContext.close();
  } finally {
    await browser.close();
  }
  console.log('PASS requested Intransitive UI regressions');
})().catch((error) => {
  console.error('REQUESTED UI REGRESSION FAILED:', error.message);
  process.exitCode = 1;
});
