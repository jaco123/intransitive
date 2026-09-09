'use strict';

/* Real-site behavioral regression coverage. Every case runs against the public
 * deployment and reports independently so an early layout failure cannot mask
 * interaction failures later in the same request. */
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
  await page.locator('#authPassword').press('Enter');
  await Promise.race([
    page.locator('#navUser').waitFor({ state: 'visible', timeout: 15000 }),
    page.locator('#authError').waitFor({ state: 'visible', timeout: 15000 }).then(async () => {
      throw new Error('registration failed: ' + await page.locator('#authError').innerText());
    }),
  ]);
  return { page, username };
}

async function createGame(creator, opponent) {
  await creator.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await creator.locator('#createBtn').click();
  await creator.locator('#gameStatus').filter({ hasText: 'Waiting for opponent' }).waitFor();
  const url = creator.url();
  await opponent.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await opponent.locator('#joinInput').fill(url);
  await opponent.locator('#joinBtn').click();
  await creator.locator('#gameStatus').filter({ hasText: 'Your move' }).waitFor();
  await opponent.locator('#board .sq').first().waitFor({ state: 'visible' });
  await opponent.locator('#gameStatus').waitFor({ state: 'visible' });
  assert.doesNotMatch(await opponent.locator('#gameStatus').innerText(), /Waiting|Connecting/, 'opponent should reach the started game view');
  return url;
}

async function playFirstLegalMove(page, color, board = '#board') {
  await page.locator(`${board} .piece[data-color="${color}"]`).first().click();
  await page.locator(`${board} .mv-dot`).first().waitFor({ state: 'visible' });
  await page.locator(`${board} .mv-dot`).first().locator('..').click();
  await page.locator(`${board} .lastmove`).nth(1).waitFor({ state: 'visible' });
}

async function centerOf(locator) {
  const box = await locator.boundingBox();
  assert.ok(box, 'expected element to have geometry');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

(async () => {
  const browser = await firefox.launch({ headless: true });
  const failures = [];
  async function check(label, fn) {
    try { await fn(); console.log('PASS [' + label + ']'); }
    catch (error) { failures.push(label + ': ' + error.message); console.error('FAIL [' + label + ']: ' + error.message); }
  }
  async function page() { return browser.newPage({ viewport: { width: 1366, height: 768 } }); }

  try {
    await check('top navigation layout', async () => {
      const p = await page(); await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      const nav = await p.locator('#nav .nav-inner').boundingBox(); const brand = await p.locator('#navBrand').boundingBox(); const auth = await p.locator('#navAuth').boundingBox();
      const link = await p.locator('.nav-link-btn').first().evaluate((el) => ({ fontSize: parseFloat(getComputedStyle(el).fontSize), height: el.getBoundingClientRect().height }));
      assert.ok(nav && brand && brand.x >= nav.x + 10 && brand.x <= nav.x + 18, 'brand should have a modest inset from the navigation bar');
      assert.ok(nav && auth && auth.x + auth.width >= nav.x + nav.width - 2, 'auth controls should be flush with the navigation bar');
      assert.ok(link.fontSize >= 17 && link.height >= 46, 'navigation controls should be larger'); await p.close();
    });

    await check('watch filters', async () => {
      const p = await page(); await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.getByRole('button', { name: 'Watch', exact: true }).click(); await p.locator('#watch').waitFor({ state: 'visible' });
      assert.deepStrictEqual(await p.locator('#watch .watch-filter:not([data-category="all"])').evaluateAll((els) => els.map((el) => el.dataset.category)), ['bullet', 'blitz', 'rapid', 'classical']); await p.close();
    });

    await check('leaderboard layout and crowns', async () => {
      const p = await page(); await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.getByRole('button', { name: 'Leaderboard', exact: true }).click(); await p.locator('#leaderboard').waitFor({ state: 'visible' });
      assert.strictEqual(await p.locator('.leaderboard-panel .time-control-symbol').count(), 4, 'each leaderboard heading should have a time-control symbol');
      assert.ok(await p.locator('.leaderboard-panel h2 .time-control-symbol').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize)) >= 24, 'leaderboard heading symbols should be large enough to read');
      const box = await p.locator('#leaderboard').boundingBox(); assert.ok(box && box.height >= 600, 'leaderboard page should fill the available page');
      await p.locator('.leaderboard-panel tbody tr').first().locator('.leaderboard-player').click(); await p.locator('.profile-card').waitFor({ state: 'visible' });
      assert.ok(await p.locator('.profile-crown').count() >= 1, 'leaderboard leader should have a profile crown'); assert.ok(await p.locator('.profile-crown[title]').count() >= 1, 'profile crown should identify its category on hover'); await p.close();
    });

    await check('live analysis history, book, branching, highlights', async () => {
      const p = await page(); await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.getByRole('button', { name: 'Analysis', exact: true }).click(); await p.locator('#explorerBoard .sq').first().waitFor({ state: 'visible' });
      assert.ok(await p.locator('#explorerHistory').isVisible(), 'live analysis should show paired game history'); assert.ok(await p.locator('#explorerMoves').isVisible(), 'opening book should remain below game history');
      await playFirstLegalMove(p, 'blue', '#explorerBoard'); await playFirstLegalMove(p, 'red', '#explorerBoard');
      assert.strictEqual(await p.locator('#explorerHistory .move').count(), 2, 'analysis should collect moves in numbered history'); assert.strictEqual(await p.locator('#explorerBoard .lastmove').count(), 2, 'analysis should highlight the current move');
      assert.ok(await p.locator('#explorerMoves').evaluate((el) => !!document.querySelector('#explorerHistory') && document.querySelector('#explorerHistory').compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING), 'opening book must be below game history');
      await p.locator('#explorerHistory .move[data-step="0"]').click(); await p.locator('#explorerBoard .lastmove').nth(1).waitFor({ state: 'visible' }); assert.strictEqual(await p.locator('#explorerBoard .lastmove').count(), 2, 'back navigation should update the highlighted move');
      assert.ok(await p.locator('#explorerMoves .explorer-move').count() > 0, 'earlier position should have branch choices'); await p.locator('#explorerMoves .explorer-move').first().click(); await p.locator('#explorerHistory .move[data-step="1"]').waitFor({ state: 'visible' }); assert.strictEqual(await p.locator('#explorerBoard .lastmove').count(), 2, 'branching should update the highlighted move'); await p.close();
    });

    await check('board editor cursor and paint gestures', async () => {
      const p = await page();
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await p.getByRole('button', { name: 'Board editor', exact: true }).click();
      await p.getByRole('button', { name: 'Clear board', exact: true }).click();

      await check('editor piece cursor geometry', async () => {
        await p.getByRole('button', { name: 'Blue Rock', exact: true }).click();
        const square = p.locator('#editorBoard .sq[data-c="4"][data-r="4"]');
        await square.hover();
        assert.strictEqual(await p.locator('#editorBoard .editor-cursor-piece').count(), 1, 'piece cursor should follow pointer');
        const sqCenter = await centerOf(square); const pieceCenter = await centerOf(p.locator('#editorBoard .editor-cursor-piece'));
        assert.ok(Math.abs(sqCenter.x - pieceCenter.x) < 2 && Math.abs(sqCenter.y - pieceCenter.y) < 2, 'piece cursor should be centered');
      });

      const squares = [2, 3, 4].map((c) => p.locator(`#editorBoard .sq[data-c="${c}"][data-r="3"]`));
      const points = []; for (const s of squares) points.push(await centerOf(s));
      await check('editor continuous piece painting', async () => {
        await p.getByRole('button', { name: 'Clear board', exact: true }).click(); await p.getByRole('button', { name: 'Blue Rock', exact: true }).click();
        await p.mouse.move(points[0].x, points[0].y); await p.mouse.down();
        for (const point of points.slice(1)) await p.mouse.move(point.x, point.y, { steps: 3 }); await p.mouse.up();
        assert.strictEqual(await p.locator('#editorBoard .piece').count(), 3, 'paint drag should fill every crossed square');
        assert.strictEqual(await p.locator('#editorBoard .piece').first().getAttribute('draggable'), 'false', 'painting should not enable dragging');
        const cursor = await centerOf(p.locator('#editorBoard .editor-cursor-piece'));
        assert.ok(Math.abs(cursor.x - points[2].x) < 2 && Math.abs(cursor.y - points[2].y) < 2, 'piece cursor should track final hover');
      });

      await check('editor continuous erase and cursor', async () => {
        await p.getByRole('button', { name: 'Clear board', exact: true }).click(); await p.getByRole('button', { name: 'Blue Rock', exact: true }).click();
        for (const square of squares) await square.click();
        await p.getByRole('button', { name: 'Delete piece', exact: true }).first().click();
        await p.mouse.move(points[0].x, points[0].y); await p.mouse.down();
        for (const point of points.slice(1)) await p.mouse.move(point.x, point.y, { steps: 3 }); await p.mouse.up();
        assert.strictEqual(await p.locator('#editorBoard .piece').count(), 0, 'erase drag should clear every crossed square');
        const cursor = await centerOf(p.locator('#editorBoard .editor-cursor-piece'));
        assert.ok(Math.abs(cursor.x - points[2].x) < 2 && Math.abs(cursor.y - points[2].y) < 2, 'erase cursor should be centered');
      });

      await check('editor paint stroke resets outside-board interpolation', async () => {
        await p.getByRole('button', { name: 'Clear board', exact: true }).click();
        await p.getByRole('button', { name: 'Blue Rock', exact: true }).click();
        const boardBox = await p.locator('#editorBoard').boundingBox();
        assert.ok(boardBox, 'editor board should have geometry');
        await p.mouse.move(points[0].x, points[0].y);
        await p.mouse.down();
        await p.mouse.move(boardBox.x - 20, boardBox.y - 20);
        await p.mouse.move(points[2].x, points[2].y);
        await p.mouse.up();
        assert.strictEqual(await p.locator('#editorBoard .piece').count(), 2, 're-entry should start a new paint segment');
        assert.strictEqual(await squares[1].locator('.piece').count(), 0, 'outside-board travel must not smear through intermediate squares');
      });

      await check('editor select movement without duplicate ghost', async () => {
        await p.getByRole('button', { name: 'Clear board', exact: true }).click(); await p.getByRole('button', { name: 'Blue Rock', exact: true }).click(); await squares[0].click();
        await p.getByRole('button', { name: 'Select and move pieces', exact: true }).first().click();
        const from = await centerOf(squares[0]); const to = await centerOf(p.locator('#editorBoard .sq[data-c="5"][data-r="3"]'));
        await p.mouse.move(from.x, from.y); await p.mouse.down(); await p.mouse.move(to.x, to.y, { steps: 4 }); await p.mouse.up();
        assert.strictEqual(await p.locator('#editorBoard .sq[data-c="5"][data-r="3"] .piece').count(), 1, 'select tool should move pieces');
        assert.strictEqual(await p.locator('.drag-ghost').count(), 0, 'editor should not leave duplicate ghosts');
      });
      await p.close();
    });

    await check('analysis preserves capture notation', async () => {
      const p = await page();
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await p.getByRole('button', { name: 'Board editor', exact: true }).click();
      await p.getByRole('button', { name: 'Clear board', exact: true }).click();
      await p.getByRole('button', { name: 'Blue Rock', exact: true }).click();
      await p.locator('#editorBoard .sq[data-c="0"][data-r="0"]').click();
      await p.getByRole('button', { name: 'Red Scissors', exact: true }).click();
      await p.locator('#editorBoard .sq[data-c="1"][data-r="1"]').click();
      await p.getByRole('button', { name: 'Analysis board', exact: true }).click();
      await p.getByText('Custom position').waitFor({ state: 'visible' });
      await p.locator('#explorerBoard .sq[data-c="0"][data-r="0"] .piece').click();
      await p.locator('#explorerBoard .sq[data-c="1"][data-r="1"]').click();
      await p.locator('#explorerHistory .move').first().waitFor({ state: 'visible' });
      assert.match(await p.locator('#explorerHistory').innerText(), /x/, 'captured analysis moves should retain x notation');
      await p.close();
    });

    await check('Intransitive title preserves active game and history', async () => {
      const cc = await browser.newContext(); const oc = await browser.newContext();
      let creator = null; let opponent = null;
      try {
        creator = await register(cc); opponent = await register(oc);
        const gameUrl = await createGame(creator.page, opponent.page);
        const gameId = new URL(gameUrl).searchParams.get('game');

        await creator.page.locator('#navBrand').click();
        await creator.page.locator('#home').waitFor({ state: 'visible' });
        assert.strictEqual(new URL(creator.page.url()).search, '?', 'title should route to the lobby');
        assert.strictEqual(await creator.page.locator('#inGameNotice').innerText(), 'You are in a game\nReturn to game\nClose', 'active game notice should be shown after title navigation');

        await creator.page.getByRole('button', { name: 'Return to game', exact: true }).click();
        await creator.page.locator('#game').waitFor({ state: 'visible' });
        assert.strictEqual(new URL(creator.page.url()).searchParams.get('game'), gameId, 'return should restore the active game URL');
        assert.strictEqual(await creator.page.locator('#gameStatus').isVisible(), true, 'return should restore the player game view');

        await creator.page.getByRole('button', { name: 'Analysis', exact: true }).click();
        await creator.page.locator('#explorer').waitFor({ state: 'visible' });
        assert.strictEqual(new URL(creator.page.url()).searchParams.get('view'), 'analysis', 'analysis should be a browser-history route');
        await creator.page.locator('#navBrand').click();
        await creator.page.locator('#home').waitFor({ state: 'visible' });
        await creator.page.goBack();
        await creator.page.locator('#explorer').waitFor({ state: 'visible' });
        assert.strictEqual(new URL(creator.page.url()).searchParams.get('view'), 'analysis', 'Back should restore the non-game route');
        await creator.page.goBack();
        await creator.page.locator('#game').waitFor({ state: 'visible' });
        assert.strictEqual(new URL(creator.page.url()).searchParams.get('game'), gameId, 'Back should restore the active game route');
      } finally {
        await Promise.allSettled([
          creator && creator.page ? creator.page.close() : Promise.resolve(),
          opponent && opponent.page ? opponent.page.close() : Promise.resolve(),
          cc.close(), oc.close(),
        ]);
      }
    });

    await check('profiles, notice, browser history, post-game analysis', async () => {
      const cc = await browser.newContext(); const oc = await browser.newContext(); const vc = await browser.newContext();
      let creator = null; let opponent = null; let viewer = null;
      try {
      creator = await register(cc); opponent = await register(oc); viewer = await vc.newPage({ viewport: { width: 1366, height: 768 } });
      const gameUrl = await createGame(creator.page, opponent.page); const gameId = new URL(gameUrl).searchParams.get('game');
      await check('opponent name opens profile', async () => { await creator.page.locator('#opponentName').click(); assert.strictEqual(new URL(creator.page.url()).searchParams.get('view'), 'profile'); });
      await check('participant active game restores own seat', async () => { await creator.page.locator('.profile-active-games [data-game-id]').waitFor({ state: 'visible' }); await creator.page.locator('.profile-active-games [data-game-id]').first().click(); assert.strictEqual(new URL(creator.page.url()).searchParams.get('game'), gameId, 'participant should restore own game seat'); });
      await check('third-party active game opens spectator view', async () => { await viewer.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await viewer.getByRole('button', { name: 'Players', exact: true }).click(); await viewer.locator('#playersSearch').fill(opponent.username); await viewer.locator(`.player-directory-row[data-player-username="${opponent.username}"]`).click(); await viewer.locator('.profile-active-games [data-game-id]').waitFor({ state: 'visible' }); await viewer.locator('.profile-active-games [data-game-id]').first().click(); assert.strictEqual(new URL(viewer.url()).searchParams.get('spectate'), gameId); });
      await creator.page.goto(gameUrl, { waitUntil: 'domcontentloaded' }); await creator.page.locator('#game').waitFor({ state: 'visible' });
      await check('live lobby notice and close dismissal', async () => { await creator.page.getByRole('button', { name: 'Play', exact: true }).click(); await creator.page.locator('#inGameNotice').waitFor({ state: 'visible' }); assert.strictEqual(await creator.page.locator('#inGameNotice').innerText(), 'You are in a game\nReturn to game\nClose'); await creator.page.getByRole('button', { name: 'Return to game', exact: true }).click(); await creator.page.locator('#game').waitFor({ state: 'visible' }); await creator.page.getByRole('button', { name: 'Play', exact: true }).click(); await creator.page.locator('#inGameNotice').waitFor({ state: 'visible' }); await creator.page.getByRole('button', { name: 'Close', exact: true }).click(); await creator.page.locator('#inGameNotice').waitFor({ state: 'hidden' }); assert.strictEqual(await creator.page.locator('#game').isVisible(), false, 'Close should only dismiss the notice'); });
      await check('browser Back restores live game', async () => { await creator.page.goto(gameUrl, { waitUntil: 'domcontentloaded' }); await creator.page.locator('#game').waitFor({ state: 'visible' }); await creator.page.getByRole('button', { name: 'Play', exact: true }).click(); await creator.page.goBack(); await creator.page.locator('#game').waitFor({ state: 'visible' }); assert.strictEqual(new URL(creator.page.url()).searchParams.get('game'), gameId); await creator.page.goForward(); await creator.page.locator('#home').waitFor({ state: 'visible' }); });
      await creator.page.goto(gameUrl, { waitUntil: 'domcontentloaded' }); await creator.page.locator('#game').waitFor({ state: 'visible' }); await playFirstLegalMove(creator.page, 'blue'); await playFirstLegalMove(opponent.page, 'red'); await opponent.page.locator('#resign').click(); await opponent.page.getByRole('button', { name: 'Yes', exact: true }).click(); await creator.page.locator('#gameStatus').filter({ hasText: 'resign' }).waitFor();
      await check('finished game notice and browser Back', async () => { await creator.page.getByRole('button', { name: 'Play', exact: true }).click(); assert.strictEqual(await creator.page.locator('#inGameNotice').isVisible(), false, 'finished games must not show notice'); await creator.page.goBack(); await creator.page.locator('#game').waitFor({ state: 'visible' }); assert.match(await creator.page.locator('#gameStatus').innerText(), /finished|resign/i, 'Back should restore finished game'); });
      await check('post-game analysis parity', async () => { await creator.page.getByRole('button', { name: 'Analysis board', exact: true }).click(); await creator.page.locator('#explorerHistory .move').nth(1).waitFor({ state: 'visible' }); assert.strictEqual(await creator.page.locator('#explorerHistory .move').count(), 2, 'post-game analysis should retain full history'); assert.ok(await creator.page.locator('#explorerMoves').isVisible(), 'post-game opening book should be below history'); assert.strictEqual(await creator.page.locator('#explorerBoard .lastmove').count(), 2, 'post-game analysis should highlight last move'); });
      } finally {
        await Promise.allSettled([
          creator && creator.page ? creator.page.close() : Promise.resolve(),
          opponent && opponent.page ? opponent.page.close() : Promise.resolve(),
          viewer ? viewer.close() : Promise.resolve(),
          cc.close(), oc.close(), vc.close(),
        ]);
      }
    });
  } finally { await browser.close(); }
  if (failures.length) throw new Error(failures.join(' | '));
  console.log('PASS requested Intransitive UI regressions');
})().catch((error) => { console.error('REQUESTED UI REGRESSION FAILED:', error.message); process.exitCode = 1; });
