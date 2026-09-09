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

async function dragWithinSquare(page, board, color) {
  const piece = page.locator(`${board} .piece[data-color="${color}"]`).first();
  const box = await piece.boundingBox();
  assert.ok(box, 'expected a selectable piece');
  const x = box.x + box.width / 2; const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 8, y + 8);
  await page.mouse.up();
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

    await check('opening book blue-win segment is blue', async () => {
      const p = await page();
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await p.getByRole('button', { name: 'Analysis', exact: true }).click();
      await p.locator('#explorerMoves .explorer-move').first().waitFor({ state: 'visible' });
      const segment = p.locator('#explorerMoves .explorer-move .stat-bar .seg.win').first();
      await segment.waitFor({ state: 'visible' });
      const color = await segment.evaluate((el) => getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number));
      assert.ok(color[2] > color[0] * 1.15 && color[2] > color[1] * 1.15,
        'blue-win segment should render blue, got rgb(' + color.join(', ') + ')');
      await p.close();
    });

    await check('lobby games box fills below How to play', async () => {
      const p = await page();
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      const games = p.locator('.lobby__app__content');
      const howToPlay = p.locator('.lobby__side .lobby__box').first();
      await games.waitFor({ state: 'visible' }); await howToPlay.waitFor({ state: 'visible' });
      const gamesBox = await games.boundingBox(); const howBox = await howToPlay.boundingBox();
      assert.ok(gamesBox && howBox, 'home boxes should have geometry');
      assert.ok(Math.abs(gamesBox.y - howBox.y) <= 2, 'Games and How to play boxes should share their top edge');
      assert.ok(gamesBox.height > howBox.height, 'Games box should extend farther down than How to play');
      await p.close();
    });

    await check('new game control has vertical spacing', async () => {
      const p = await page();
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      const playFromPosition = p.locator('label').filter({ hasText: 'Play from position' }).first();
      const create = p.locator('#queueBtn');
      await playFromPosition.waitFor({ state: 'visible' }); await create.waitFor({ state: 'visible' });
      const controlBox = await playFromPosition.boundingBox(); const createBox = await create.boundingBox();
      assert.ok(controlBox && createBox, 'New game controls should have geometry');
      assert.ok(createBox.y - (controlBox.y + controlBox.height) >= 10, 'Create lobby game should have vertical space below Play from position');
      await p.close();
    });

    await check('settings sound-volume control is interactive', async () => {
      const context = await browser.newContext();
      const account = await register(context);
      const p = account.page;
      try {
        const settingsButton = p.getByRole('button', { name: 'Settings', exact: true });
        assert.strictEqual(await settingsButton.count(), 1, 'top bar should have one Settings button');
        const profileButton = p.locator('#profileBtn');
        const profileBox = await profileButton.boundingBox(); const settingsBox = await settingsButton.boundingBox();
        assert.ok(profileBox && settingsBox && settingsBox.x >= profileBox.x + profileBox.width - 2,
          'Settings should be next to the profile button');
        await settingsButton.click();
        const settings = p.getByRole('dialog', { name: 'Settings', exact: true });
        await settings.waitFor({ state: 'visible' });
        const volume = settings.getByRole('slider', { name: /Sound volume/i });
        await volume.waitFor({ state: 'visible' });
        const before = await volume.inputValue();
        const next = before === '0' ? '0.75' : '0';
        await volume.fill(next);
        assert.strictEqual(await volume.inputValue(), next, 'sound-volume slider should change through the UI');
        await p.waitForFunction((value) => localStorage.getItem('rps_sound_volume') === value, next);
        await p.reload({ waitUntil: 'domcontentloaded' });
        await p.getByRole('button', { name: 'Settings', exact: true }).click();
        const reloadedVolume = p.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('slider', { name: /Sound volume/i });
        await reloadedVolume.waitFor({ state: 'visible' });
        assert.strictEqual(await reloadedVolume.inputValue(), next, 'sound volume should persist across reloads');
      } finally {
        await Promise.allSettled([p.close(), context.close()]);
      }
    });

    await check('private game rejects self-join', async () => {
      const context = await browser.newContext();
      let creator = null; let joiner = null;
      try {
        const account = await register(context);
        creator = account.page;
        joiner = await context.newPage({ viewport: { width: 1366, height: 768 } });
        await creator.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await creator.locator('#createBtn').click();
        await creator.locator('#gameStatus').filter({ hasText: 'Waiting for opponent' }).waitFor();
        const gameUrl = creator.url();
        await joiner.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await joiner.locator('#joinInput').fill(gameUrl);
        await joiner.locator('#joinBtn').click();
        await joiner.waitForTimeout(1000);
        assert.strictEqual(await joiner.locator('#game').isVisible(), false, 'a user must not start a private game against themselves');
        assert.match(await creator.locator('#gameStatus').innerText(), /Waiting for opponent/, 'self-join must leave the private game waiting');
        assert.strictEqual(await joiner.locator('#home').isVisible(), true, 'rejected self-join should remain in the lobby');
      } finally {
        await Promise.allSettled([creator && creator.close(), joiner && joiner.close(), context.close()]);
      }
    });

    await check('lobby seek rejects self-acceptance', async () => {
      const context = await browser.newContext();
      let owner = null; let accepter = null;
      try {
        const account = await register(context);
        owner = account.page;
        accepter = await context.newPage({ viewport: { width: 1366, height: 768 } });
        await owner.getByRole('button', { name: 'Play', exact: true }).click();
        await owner.locator('#queueBtn').click();
        await owner.locator('#queueStatus').waitFor({ state: 'visible' });
        await owner.locator('#lobbyList .lpool').first().waitFor({ state: 'visible' });
        await accepter.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await accepter.locator('#lobbyList .lpool').first().waitFor({ state: 'visible' });
        await accepter.locator('#lobbyList .lpool').first().click();
        await accepter.waitForTimeout(1000);
        assert.strictEqual(await owner.locator('#game').isVisible(), false, 'a lobby seek must not pair a user with themselves');
        assert.strictEqual(await accepter.locator('#game').isVisible(), false, 'self-accepted lobby seek must be rejected');
      } finally {
        await Promise.allSettled([owner && owner.close(), accepter && accepter.close(), context.close()]);
      }
    });

    await check('challenge rejects self-acceptance', async () => {
      const context = await browser.newContext();
      let sender = null; let target = null;
      try {
        const account = await register(context);
        sender = account.page;
        target = await context.newPage({ viewport: { width: 1366, height: 768 } });
        await target.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await sender.locator('#profileBtn').click();
        await sender.locator('#profilePanel').waitFor({ state: 'visible' });
        await sender.locator('#profileChallenge').click();
        await sender.locator('#challengeSend').click();
        await target.waitForTimeout(1000);
        if (await target.locator('#challengeInbox').isVisible()) {
          await target.locator('.challenge-incoming').first().getByRole('button', { name: 'Accept', exact: true }).click();
        }
        await target.waitForTimeout(1000);
        assert.strictEqual(await sender.locator('#game').isVisible(), false, 'a challenge must not create a self-game');
        assert.strictEqual(await target.locator('#game').isVisible(), false, 'self-challenge acceptance must be rejected');
      } finally {
        await Promise.allSettled([sender && sender.close(), target && target.close(), context.close()]);
      }
    });

    await check('disconnected waiting private game cannot be joined', async () => {
      const ownerContext = await browser.newContext(); const joinerContext = await browser.newContext();
      let owner = null; let joiner = null;
      try {
        owner = await ownerContext.newPage({ viewport: { width: 1366, height: 768 } });
        await owner.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await owner.locator('#createBtn').click();
        await owner.locator('#gameStatus').filter({ hasText: 'Waiting for opponent' }).waitFor();
        const gameUrl = owner.url();
        await owner.close(); owner = null;
        await new Promise((resolve) => setTimeout(resolve, 500));
        joiner = await joinerContext.newPage({ viewport: { width: 1366, height: 768 } });
        await joiner.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await joiner.locator('#joinInput').fill(gameUrl);
        await joiner.locator('#joinBtn').click();
        await joiner.waitForTimeout(1000);
        assert.strictEqual(await joiner.locator('#game').isVisible(), false, 'a disconnected waiting private game must be removed');
      } finally {
        await Promise.allSettled([owner && owner.close(), joiner && joiner.close(), ownerContext.close(), joinerContext.close()]);
      }
    });

    await check('waiting private game has server-backed cancel button', async () => {
      const ownerContext = await browser.newContext(); const joinerContext = await browser.newContext();
      let owner = null; let joiner = null;
      try {
        owner = await ownerContext.newPage({ viewport: { width: 1366, height: 768 } });
        await owner.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await owner.locator('#createBtn').click();
        await owner.locator('#gameStatus').filter({ hasText: 'Waiting for opponent' }).waitFor();
        const gameUrl = owner.url();
        const cancel = owner.getByRole('button', { name: 'Cancel game', exact: true });
        assert.strictEqual(await cancel.count(), 1, 'waiting private games should expose one Cancel game button');
        await cancel.click();
        await owner.locator('#home').waitFor({ state: 'visible' });
        assert.strictEqual(new URL(owner.url()).searchParams.has('game'), false, 'cancel should return to the lobby route');
        joiner = await joinerContext.newPage({ viewport: { width: 1366, height: 768 } });
        await joiner.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await joiner.locator('#joinInput').fill(gameUrl);
        await joiner.locator('#joinBtn').click();
        await joiner.waitForTimeout(1000);
        assert.strictEqual(await joiner.locator('#game').isVisible(), false, 'a cancelled private game must not be joinable');
      } finally {
        await Promise.allSettled([owner && owner.close(), joiner && joiner.close(), ownerContext.close(), joinerContext.close()]);
      }
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
      const duplicatePath = p.locator('#explorerPath');
      assert.ok(await duplicatePath.count() === 0 || !(await duplicatePath.isVisible()), 'analysis should not show the obsolete duplicate move bar');
      assert.strictEqual(await p.locator('#explorerHistory .move').count(), 2, 'only the intended paired move history should remain');
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
      await p.locator('#explorerBoard .sq').first().waitFor({ state: 'visible' });
      assert.strictEqual(await p.locator('#explorerBoard .piece[data-c="0"][data-r="0"][data-color="blue"]').count(), 1,
        'analysis board should preserve the custom editor position');
      await p.locator('#explorerBoard .sq[data-c="0"][data-r="0"] .piece').click();
      await p.locator('#explorerBoard .sq[data-c="1"][data-r="1"]').click();
      await p.locator('#explorerHistory .move').first().waitFor({ state: 'visible' });
      assert.match(await p.locator('#explorerHistory').innerText(), /x/, 'captured analysis moves should retain x notation');
      await p.close();
    });

    await check('same-square drag selects pieces in game and analysis', async () => {
      const cc = await browser.newContext(); const oc = await browser.newContext();
      let creator = null; let opponent = null;
      try {
        creator = await register(cc); opponent = await register(oc);
        await createGame(creator.page, opponent.page);
        await dragWithinSquare(creator.page, '#board', 'blue');
        assert.strictEqual(await creator.page.locator('#board .sq.selected').count(), 1, 'same-square drag should select a live-game piece');
        await creator.page.getByRole('button', { name: 'Analysis', exact: true }).click();
        await creator.page.locator('#explorerBoard .sq').first().waitFor({ state: 'visible' });
        await dragWithinSquare(creator.page, '#explorerBoard', 'blue');
        assert.strictEqual(await creator.page.locator('#explorerBoard .sq.selected').count(), 1, 'same-square drag should select an analysis piece');
      } finally {
        await Promise.allSettled([
          creator && creator.page ? creator.page.close() : Promise.resolve(),
          opponent && opponent.page ? opponent.page.close() : Promise.resolve(),
          cc.close(), oc.close(),
        ]);
      }
    });

    await check('profile layout, shared game rows, and controls', async () => {
      const tc = await browser.newContext(); const to = await browser.newContext(); const tv = await browser.newContext();
      let creator = null; let opponent = null; let viewer = null;
      try {
        creator = await register(tc); opponent = await register(to); viewer = await register(tv);
        const gameUrl = await createGame(creator.page, opponent.page);
        const gameId = new URL(gameUrl).searchParams.get('game');

        await opponent.page.locator('#opponentName').click();
        await opponent.page.locator('#profilePanel').waitFor({ state: 'visible' });
        const issues = [];
        const record = (label, condition) => { if (!condition) issues.push(label); };
        const activeRow = opponent.page.locator('#profileHistory [data-game-id]').first();
        record('profile should not show an Active games heading', await opponent.page.locator('#profileHistory h2').count() === 0);
        record('profile should show the active game', await activeRow.count() === 1);
        if (await activeRow.count()) {
          record('active games should use the finished-game history row class', await activeRow.evaluate((el) => el.classList.contains('history-row')));
          record('active history rows should use the finished-game row structure', await activeRow.locator('.history-main').count() > 0);
        }
        const ratings = opponent.page.locator('#profileRatings');
        const history = opponent.page.locator('#profileHistory');
        const hasRatings = await ratings.count() === 1;
        record('profile ratings should be rendered in a side panel', hasRatings);
        const ratingBox = hasRatings ? await ratings.boundingBox() : null;
        const historyBox = await history.boundingBox();
        record('ratings should sit beside profile history on desktop', !!(ratingBox && historyBox && ratingBox.x > historyBox.x + historyBox.width * 0.55));
        const participantWatch = opponent.page.locator('#profileWatch');
        record('profile should provide a Watch control', await participantWatch.count() === 1);
        record('profile should provide a Challenge control', await opponent.page.locator('#profileChallenge').count() === 1);

        await opponent.page.setViewportSize({ width: 390, height: 844 });
        await opponent.page.goto(BASE + '/?view=profile&player=' + encodeURIComponent(creator.username), { waitUntil: 'domcontentloaded' });
        await opponent.page.locator('#profilePanel').waitFor({ state: 'visible' });
        const mobileRatings = await opponent.page.locator('#profileRatings').boundingBox();
        const mobileHistory = await opponent.page.locator('#profileHistory').boundingBox();
        record('profile ratings and history should stack on mobile', !!(mobileRatings && mobileHistory && Math.abs(mobileRatings.x - mobileHistory.x) < 2));
        await opponent.page.setViewportSize({ width: 1366, height: 768 });
        await opponent.page.goto(BASE + '/?view=profile&player=' + encodeURIComponent(creator.username), { waitUntil: 'domcontentloaded' });
        await opponent.page.locator('#profilePanel').waitFor({ state: 'visible' });

        if (await participantWatch.count() === 1) {
          try {
            await participantWatch.click();
            await opponent.page.locator('#game').waitFor({ state: 'visible' });
            await opponent.page.waitForFunction((name) => document.querySelector('#playerName')?.textContent.includes(name), opponent.username);
            record('participant Watch should restore their own seat', new URL(opponent.page.url()).searchParams.get('game') === gameId && await opponent.page.locator('#gameMode').innerText() !== 'Spectating');
          } catch (error) {
            issues.push('participant Watch should restore their own seat: ' + error.message);
          }
        }

        await viewer.page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await viewer.page.getByRole('button', { name: 'Players', exact: true }).click();
        await viewer.page.locator('#playersSearch').fill(creator.username);
        await viewer.page.locator(`.player-directory-row[data-player-username="${creator.username}"]`).click();
        await viewer.page.locator('#profilePanel').waitFor({ state: 'visible' });
        const spectatorWatch = viewer.page.locator('#profileWatch');
        record('third-party profile should provide a Watch control', await spectatorWatch.count() === 1);
        if (await spectatorWatch.count() === 1) {
          try {
            await spectatorWatch.click();
            await viewer.page.locator('#game').waitFor({ state: 'visible' });
            record('third-party Watch should open spectator mode', new URL(viewer.page.url()).searchParams.get('spectate') === gameId);
          } catch (error) {
            issues.push('third-party Watch should open spectator mode: ' + error.message);
          }
        }
        assert.strictEqual(issues.length, 0, issues.join(' | '));
      } finally {
        await Promise.allSettled([
          creator && creator.page ? creator.page.close() : Promise.resolve(),
          opponent && opponent.page ? opponent.page.close() : Promise.resolve(),
          viewer && viewer.page ? viewer.page.close() : Promise.resolve(),
          tc.close(), to.close(), tv.close(),
        ]);
      }
    });

    await check('profile Challenge sends and accepts a real game', async () => {
      const tc = await browser.newContext(); const to = await browser.newContext();
      let target = null; let challenger = null;
      try {
        target = await register(tc); challenger = await register(to);
        await challenger.page.getByRole('button', { name: 'Players', exact: true }).click();
        await challenger.page.locator('#playersSearch').fill(target.username);
        await challenger.page.locator(`.player-directory-row[data-player-username="${target.username}"]`).click();
        await challenger.page.locator('#profilePanel').waitFor({ state: 'visible' });
        await challenger.page.locator('#profileChallenge').click();
        await challenger.page.locator('#challengeModal').waitFor({ state: 'visible' });
        assert.strictEqual(await challenger.page.locator('#challengeTarget').innerText(), target.username, 'challenge should name the target player');
        await challenger.page.locator('#challengeMinutes').fill('3');
        await challenger.page.locator('#challengeIncrement').fill('2');
        await challenger.page.locator('#challengeRated').click();
        await challenger.page.locator('#challengeSend').click();
        await target.page.locator('#challengeInbox').waitFor({ state: 'visible' });
        await target.page.locator('.challenge-incoming').filter({ hasText: challenger.username }).getByRole('button', { name: 'Accept', exact: true }).click();
        await challenger.page.locator('#game').waitFor({ state: 'visible' });
        await target.page.locator('#game').waitFor({ state: 'visible' });
        await challenger.page.locator('#gameStatus').filter({ hasText: /move|to move/ }).waitFor();
        assert.strictEqual(new URL(challenger.page.url()).searchParams.get('game'), new URL(target.page.url()).searchParams.get('game'), 'accepted challenge should open one shared game');
        const acceptedMode = await challenger.page.locator('#gameMode').innerText();
        assert.match(acceptedMode, /^rated$/i, 'accepted challenge should preserve rated mode (got ' + acceptedMode + ')');
        assert.match(await challenger.page.locator('#playerClock').innerText(), /^3:00$/, 'accepted challenge should preserve the selected 3+2 time control');
      } finally {
        await Promise.allSettled([
          target && target.page ? target.page.close() : Promise.resolve(),
          challenger && challenger.page ? challenger.page.close() : Promise.resolve(),
          tc.close(), to.close(),
        ]);
      }
    });

    await check('profile history uses one shared row presentation', async () => {
      const cc = await browser.newContext(); const oc = await browser.newContext();
      let creator = null; let opponent = null;
      try {
        creator = await register(cc); opponent = await register(oc);
        const gameUrl = await createGame(creator.page, opponent.page);
        await opponent.page.locator('#opponentName').click();
        await opponent.page.locator('#profileHistory [data-game-id]').first().waitFor({ state: 'visible' });

        const activeRow = opponent.page.locator('#profileHistory [data-game-id]').first();
        const activeText = await activeRow.innerText();
        const activeStructure = await activeRow.evaluate((el) => [...el.children].map((child) => ({
          tag: child.tagName,
          classes: [...child.classList].filter((name) => !['playing', 'win', 'loss', 'draw'].includes(name)).sort(),
        })));
        assert.strictEqual((activeText.match(/\bPlaying\b/g) || []).length, 1,
          'active profile rows should show Playing once, not duplicate it');
        assert.strictEqual(await activeRow.locator('.hist-tc .time-control-symbol').count(), 1,
          'active profile rows should show the time-control symbol');

        await opponent.page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
        await opponent.page.locator('#game').waitFor({ state: 'visible' });
        await opponent.page.locator('#resign').click();
        await opponent.page.getByRole('button', { name: 'Yes', exact: true }).click();
        await creator.page.locator('#gameStatus').filter({ hasText: /resign/ }).waitFor();
        await opponent.page.goto(BASE + '/?view=profile&player=' + encodeURIComponent(creator.username), { waitUntil: 'domcontentloaded' });
        await opponent.page.locator('#profileHistory .history-row').first().waitFor({ state: 'visible' });

        const finishedRow = opponent.page.locator('#profileHistory .history-row').first();
        const finishedOutcome = await finishedRow.locator('.hist-outcome').innerText();
        const finishedStructure = await finishedRow.evaluate((el) => [...el.children].map((child) => ({
          tag: child.tagName,
          classes: [...child.classList].filter((name) => !['playing', 'win', 'loss', 'draw'].includes(name)).sort(),
        })));
        assert.deepStrictEqual(finishedStructure, activeStructure, 'active and finished profile rows should share one structure');
        assert.match(finishedOutcome, /^(Win|Loss|Draw)$/, 'finished outcome should be relative to the profiled player');
        assert.doesNotMatch(finishedOutcome, /Blue|Red/, 'finished profile outcome should not expose board colors');
        assert.strictEqual(await finishedRow.locator('.hist-tc .time-control-symbol').count(), 1,
          'finished profile rows should show the same time-control symbol');
      } finally {
        await Promise.allSettled([
          creator && creator.page ? creator.page.close() : Promise.resolve(),
          opponent && opponent.page ? opponent.page.close() : Promise.resolve(),
          cc.close(), oc.close(),
        ]);
      }
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
        const lobbyUrl = new URL(creator.page.url());
        assert.strictEqual(lobbyUrl.searchParams.get('game'), null, 'title should leave the game route');
        assert.strictEqual(lobbyUrl.searchParams.get('view'), null, 'title should leave the analysis route');
        assert.strictEqual(lobbyUrl.searchParams.get('spectate'), null, 'title should leave the spectator route');
        await creator.page.locator('#inGameNotice').waitFor({ state: 'visible' });
        assert.strictEqual(await creator.page.locator('#inGameNotice').innerText(), 'You are in a game\nReturn to game\nClose', 'active game notice should be shown after title navigation');

        await creator.page.getByRole('button', { name: 'Return to game', exact: true }).click();
        await creator.page.locator('#game').waitFor({ state: 'visible' });
        assert.strictEqual(new URL(creator.page.url()).searchParams.get('game'), gameId, 'return should restore the active game URL');
        await creator.page.waitForFunction((username) => {
          const player = document.querySelector('#playerName');
          const status = document.querySelector('#gameStatus');
          return player && player.textContent.includes(username) && status && !/Connecting|Waiting/.test(status.textContent);
        }, creator.username);
        assert.notStrictEqual(await creator.page.locator('#gameMode').innerText(), 'Spectating', 'return should restore the participant view, not spectating');
        assert.ok((await creator.page.locator('#playerName').innerText()).includes(creator.username), 'return should restore the creator seat');

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
      await check('participant active game restores own seat', async () => { await creator.page.locator('#profileHistory [data-game-id]').waitFor({ state: 'visible' }); await creator.page.locator('#profileHistory [data-game-id]').first().click(); assert.strictEqual(new URL(creator.page.url()).searchParams.get('game'), gameId, 'participant should restore own game seat'); });
      await check('third-party active game opens spectator view', async () => { await viewer.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await viewer.getByRole('button', { name: 'Players', exact: true }).click(); await viewer.locator('#playersSearch').fill(opponent.username); await viewer.locator(`.player-directory-row[data-player-username="${opponent.username}"]`).click(); await viewer.locator('#profileHistory [data-game-id]').waitFor({ state: 'visible' }); await viewer.locator('#profileHistory [data-game-id]').first().click(); assert.strictEqual(new URL(viewer.url()).searchParams.get('spectate'), gameId); });
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
