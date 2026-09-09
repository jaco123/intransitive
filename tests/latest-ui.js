'use strict';

/* Real-IP black-box regressions for the latest UI requirements. */
const assert = require('assert');
const WebSocket = require('ws');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');

function customBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(null));
  board[4][4] = { color: 'red', type: 'rock' };
  return board;
}

function wsMessages(message) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BASE.replace(/^http/, 'ws') + '/ws');
    const timer = setTimeout(() => { ws.close(); reject(new Error('protocol response timeout')); }, 4000);
    ws.on('open', () => ws.send(JSON.stringify(message)));
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'created' || msg.type === 'error') {
        clearTimeout(timer);
        ws.close();
        resolve(msg);
      }
    });
    ws.on('error', reject);
  });
}

async function gotoEditor(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Board editor', exact: true }).click();
  await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor({ state: 'visible' });
}

async function dragWithPointer(page, boardSelector, sourceSelector, targetSelector) {
  const source = page.locator(sourceSelector).first();
  const sourceBox = await source.boundingBox();
  assert.ok(sourceBox, 'drag source should be visible');
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(100);
  const target = page.locator(targetSelector);
  const targetBox = await target.boundingBox();
  assert.ok(targetBox, 'drag target should be visible');
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 });
  const ghost = page.locator('.drag-ghost');
  await ghost.waitFor({ state: 'visible', timeout: 1000 });
  const ghostBox = await ghost.boundingBox();
  assert.ok(Math.abs(ghostBox.x + ghostBox.width / 2 - (targetBox.x + targetBox.width / 2)) < 2,
    `${boardSelector}: drag ghost must be centered horizontally`);
  assert.ok(Math.abs(ghostBox.y + ghostBox.height / 2 - (targetBox.y + targetBox.height / 2)) < 2,
    `${boardSelector}: drag ghost must be centered vertically`);
  const tint = await source.evaluate((el) => getComputedStyle(el.closest('.sq')).backgroundImage);
  assert.notStrictEqual(tint, 'none', `${boardSelector}: source square should be visibly tinted during drag`);
  await page.mouse.up();
}

(async () => {
  const failures = [];
  const ratedResponse = await wsMessages({ type: 'create', timeControl: { initial: 60, increment: 0 }, rated: true, board: customBoard(), turn: 'red' });
  try {
    assert.notStrictEqual(ratedResponse.type, 'created', 'crafted rated custom create must be rejected or explicitly unrated');
  } catch (error) { failures.push('rated custom protocol guard: ' + error.message); }
  const ratedQueueResponse = await wsMessages({ type: 'queue', timeControl: { initial: 60, increment: 0 }, rated: true, board: customBoard(), turn: 'red' });
  try {
    assert.strictEqual(ratedQueueResponse.type, 'error', 'crafted rated custom queue must be rejected');
  } catch (error) { failures.push('rated custom queue guard: ' + error.message); }

  const browser = await firefox.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.setDefaultTimeout(3000);
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const check = page.getByRole('checkbox', { name: 'Play from position' });
    await check.check();
    try {
      assert.strictEqual(await page.locator('#modeCasual').evaluate((el) => el.classList.contains('active')), true);
      assert.strictEqual(await page.locator('#modeRated').isDisabled(), true);
    } catch (error) { failures.push('custom position must force Casual and disable Rated: ' + error.message); }

    await page.locator('#queueBtn').click();
    await page.getByText('Waiting for an opponent…').waitFor({ state: 'visible' });
    await page.locator('#queueBtn').click();
    await page.getByText('Seek cancelled.').waitFor({ state: 'visible' });
    await page.waitForTimeout(4000);
    try { assert.strictEqual(await page.getByText('Seek cancelled.').isVisible(), false, 'Seek cancelled should auto-disappear'); }
    catch (error) { failures.push(error.message); }

    await gotoEditor(page);
    const actionIds = ['#editorReset', '#editorClear', '#editorFlip', '#editorAnalysis', '#editorToAnalysis', '#editorAddToStudy'];
    try {
      const boxes = await Promise.all(actionIds.map((id) => page.locator(id).boundingBox()));
      assert.ok(boxes.every((box) => box), 'all editor actions should be visible');
      assert.ok(boxes.every((box, i) => i === 0 || box.y > boxes[i - 1].y), 'editor actions should be vertically stacked');
      const styles = await Promise.all(actionIds.map((id) => page.locator(id).evaluate((el) => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, border: s.borderColor, outline: s.outlineStyle + ':' + s.outlineWidth };
      })));
      assert.ok(styles.every((s) => s.background === styles[0].background), 'Continue should use the neutral action color');
      assert.ok(styles.every((s) => s.border === 'transparent' || s.border === 'rgba(0, 0, 0, 0)'), 'editor action borders should be invisible');
      assert.ok(styles.every((s) => s.outline.endsWith(':0px')), 'editor action outlines should be invisible until keyboard focus');
    } catch (error) { failures.push('editor action layout/style: ' + error.message); }

    try {
      await page.getByRole('button', { name: 'Blue Rock' }).click();
      await page.locator('#editorBoard .sq[data-c="4"][data-r="4"]').click();
      await page.getByRole('button', { name: 'Select and move pieces' }).first().click();
      await dragWithPointer(page, '#editorBoard', '#editorBoard .piece[data-c="4"][data-r="4"]', '#editorBoard .sq[data-c="5"][data-r="5"]');
    } catch (error) { failures.push('editor pointer drag: ' + error.message); await page.mouse.up(); }

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await check.check();
    try {
      await dragWithPointer(page, '#playPositionBoard', '#playPositionBoard .piece', '#playPositionBoard .sq[data-c="0"][data-r="0"]');
    } catch (error) { failures.push('lobby preview pointer drag: ' + error.message); await page.mouse.up(); }

    await page.locator('#analysisBtn').click();
    await page.locator('#explorerBoard .sq').first().waitFor({ state: 'visible' });
    try {
      await dragWithPointer(page, '#explorerBoard', '#explorerBoard .piece[data-color="blue"]', '#explorerBoard .sq[data-c="0"][data-r="5"]');
    } catch (error) { failures.push('analysis pointer drag: ' + error.message); await page.mouse.up(); }

    try {
      for (const label of ['Jump to first move', 'Previous move', 'Next move', 'Jump to last move', 'Settings']) {
        assert.strictEqual(await page.getByRole('button', { name: label, exact: true }).count(), 1, label + ' control missing');
      }
      assert.strictEqual(await page.locator('#explorer .move-nav').count(), 1, 'Analysis should have one navigation set');
      assert.strictEqual(await page.locator('#explorerPrev, #explorerNext, #explorerReset').count(), 0,
        'legacy Analysis navigation buttons should be absent');
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      assert.strictEqual(await page.locator('#explorerMoveSettings').isVisible(), true, 'analysis settings should open a real panel');
      await page.getByRole('checkbox', { name: 'Show coordinates' }).uncheck();
      assert.strictEqual(await page.locator('#explorerBoard').evaluate((el) => el.classList.contains('hide-coordinates')), true,
        'analysis settings should change the board');
    } catch (error) { failures.push('analysis move navigation/settings: ' + error.message); }

    // Finish a real guest game to cover the game-only actions and live review controls.
    try {
      const opponent = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      await opponent.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.locator('#createBtn').click();
      await page.locator('#gameStatus').filter({ hasText: /Waiting for opponent/ }).waitFor();
      const gameUrl = page.url();
      await opponent.locator('#joinInput').fill(gameUrl);
      await opponent.locator('#joinBtn').click();
      await page.locator('#gameStatus').filter({ hasText: /Your move/ }).waitFor();
      const source = page.locator('#board .piece[data-color="blue"]').first();
      const sourceBox = await source.boundingBox();
      const target = page.locator('#board .sq[data-c="0"][data-r="5"]');
      const targetBox = await target.boundingBox();
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 });
      const liveGhost = page.locator('.drag-ghost');
      await liveGhost.waitFor({ state: 'visible' });
      const liveGhostBox = await liveGhost.boundingBox();
      assert.ok(Math.abs(liveGhostBox.x + liveGhostBox.width / 2 - (targetBox.x + targetBox.width / 2)) < 2,
        'live drag ghost should stay centered horizontally');
      assert.ok(Math.abs(liveGhostBox.y + liveGhostBox.height / 2 - (targetBox.y + targetBox.height / 2)) < 2,
        'live drag ghost should stay centered vertically');
      assert.notStrictEqual(await page.locator('#board .sq[data-c="1"][data-r="4"]').evaluate((el) => getComputedStyle(el).backgroundImage), 'none',
        'live source square should be tinted during drag');
      await page.mouse.up();
      await page.locator('#gameStatus').filter({ hasText: /Red to move/ }).waitFor();
      await page.getByRole('button', { name: 'Jump to first move', exact: true }).click();
      assert.strictEqual(await page.getByRole('button', { name: 'Next move', exact: true }).isDisabled(), false,
        'live review should enable next after jumping to start');
      await page.getByRole('button', { name: 'Next move', exact: true }).click();
      await opponent.locator('#resign').click();
      await opponent.locator('#actionConfirmYes').click();
      await page.locator('#gameStatus').filter({ hasText: /wins by resignation/ }).waitFor();
      const actionBoxes = await page.locator('#finishedActions .btn').evaluateAll((els) => els.map((el) => {
        const s = getComputedStyle(el);
        return { y: el.getBoundingClientRect().y, border: s.borderColor, outline: s.outlineWidth };
      }));
      assert.strictEqual(actionBoxes.length, 3, 'finished game should expose three actions');
      assert.ok(actionBoxes[0].y < actionBoxes[1].y && actionBoxes[1].y < actionBoxes[2].y, 'finished actions should stack');
      assert.ok(actionBoxes.every((s) => /rgba\(0, 0, 0, 0\)|transparent/.test(s.border) && s.outline === '0px'),
        'finished actions should have invisible default outlines');
      assert.strictEqual(await page.locator('#gameStatus').evaluate((el) => getComputedStyle(el).borderStyle), 'none',
        'finished result should have no visible border');
      assert.strictEqual(await page.locator('#moves').evaluate((el) => getComputedStyle(el).borderRadius), '0px',
        'move list should have sharp corners');
      await page.locator('#finishedAnalysis').click();
      await page.locator('#explorerBoard .sq').first().waitFor();
      await opponent.close();
    } catch (error) { failures.push('finished game actions/review: ' + error.message); }
    try { assert.deepStrictEqual(errors, [], 'affected views should have no console/page errors'); }
    catch (error) { failures.push(error.message); }
  } finally { await browser.close(); }
  if (failures.length) throw new Error(failures.join(' | '));
  console.log('PASS latest UI/protocol regressions');
})().catch((error) => { console.error('LATEST UI REGRESSION FAILED:', error.message); process.exitCode = 1; });
