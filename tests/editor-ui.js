'use strict';

/* Real-IP UI regression and interaction coverage for analysis and editor. */
const assert = require('assert');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1366, height: 768 },
];

async function openAnalysis(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Analysis', exact: true }).click();
  await page.locator('#explorerBoard .sq').first().waitFor({ state: 'visible' });
}

async function assertFavicon(page) {
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  assert.ok(href, 'page should declare a favicon');
  const response = await page.request.get(new URL(href, BASE + '/').href);
  assert.strictEqual(response.status(), 200, 'favicon should be reachable');
}

async function pageHealth(page) {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

(async () => {
  const browser = await firefox.launch({ headless: true });
  const failures = [];
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const errors = await pageHealth(page);
      await openAnalysis(page);
      await assertFavicon(page);
      const metrics = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        documentScrollWidth: document.documentElement.scrollWidth,
        documentScrollHeight: document.documentElement.scrollHeight,
        bodyScrollWidth: document.body.scrollWidth,
        bodyScrollHeight: document.body.scrollHeight,
      }));
      try {
        assert.ok(metrics.documentScrollWidth <= metrics.innerWidth,
          `${viewport.name}: analysis is horizontally overflowing: ${JSON.stringify(metrics)}`);
        assert.ok(metrics.documentScrollHeight <= metrics.innerHeight,
          `${viewport.name}: analysis is vertically overflowing: ${JSON.stringify(metrics)}`);
      } catch (error) {
        failures.push(error.message);
      }
      try { assert.deepStrictEqual(errors, [], `${viewport.name}: analysis console/page errors: ${errors.join('; ')}`); }
      catch (error) { failures.push(error.message); }
      await page.close();
    }
    if (!failures.length) console.log('PASS analysis fits desktop and laptop viewports without page overflow');

    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errors = await pageHealth(page);
    await openAnalysis(page);
    await assertFavicon(page);
    await page.getByRole('button', { name: 'Board editor', exact: true }).click();
    await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor({ state: 'visible' });
    await assertFavicon(page);
    await page.goBack();
    await page.locator('#explorerBoard .sq').first().waitFor({ state: 'visible' });
    assert.strictEqual(await page.getByRole('heading', { name: 'Board editor', exact: true }).isVisible(), false,
      'browser Back should return directly to Analysis');
    await page.getByRole('button', { name: 'Board editor', exact: true }).click();
    await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor({ state: 'visible' });

    const controls = ['Starting position', 'Clear board', 'Flip board', 'Analysis board', 'Continue from here'];
    for (const label of controls) assert.strictEqual(await page.getByRole('button', { name: new RegExp(label) }).count(), 1, label + ' control missing');
    assert.deepStrictEqual(await page.locator('#editorTurn option').allTextContents(), ['Blue to play', 'Red to play']);
    assert.strictEqual(await page.locator('#editorPaletteTop button').count(), 5);
    assert.strictEqual(await page.locator('#editorPaletteBottom button').count(), 5);
    assert.ok(await page.getByRole('button', { name: 'Select and move pieces' }).count());
    assert.ok(await page.getByRole('button', { name: 'Delete piece' }).count());

    await page.getByRole('button', { name: 'Select and move pieces' }).first().click();
    assert.strictEqual(await page.getByRole('button', { name: 'Select and move pieces' }).first().evaluate((el) => el.classList.contains('active')), true);

    const pieces = page.locator('#editorBoard .editor-piece');
    const initialCount = await pieces.count();
    assert.ok(initialCount > 0, 'starting position should contain pieces');
    await page.getByRole('button', { name: 'Blue Rock' }).click();
    await page.locator('#editorBoard .sq[data-c="4"][data-r="4"]').click();
    assert.strictEqual(await page.locator('#editorBoard .piece[data-c="4"][data-r="4"]').count(), 1, 'clicked palette piece should be placed');

    await page.getByRole('button', { name: 'Red Paper' }).dragTo(page.locator('#editorBoard .sq[data-c="3"][data-r="3"]'));
    assert.strictEqual(await page.locator('#editorBoard .piece[data-c="3"][data-r="3"][data-color="red"]').count(), 1, 'dragged palette piece should be placed');

    await page.locator('#editorBoard .editor-piece[data-c="4"][data-r="4"]').dragTo(page.locator('#editorBoard .sq[data-c="5"][data-r="5"]'));
    assert.strictEqual(await page.locator('#editorBoard .piece[data-c="5"][data-r="5"]').count(), 1, 'existing piece should be draggable');
    await page.locator('#editorBoard .editor-piece[data-c="5"][data-r="5"]').dragTo(page.locator('#editorClear'));
    assert.strictEqual(await page.locator('#editorBoard .piece[data-c="5"][data-r="5"]').count(), 0, 'dragging a piece outside should delete it');

    await page.getByRole('button', { name: 'Blue Rock' }).click();
    await page.locator('#editorBoard .sq[data-c="6"][data-r="6"]').click();
    await page.getByRole('button', { name: 'Delete piece' }).first().click();
    await page.locator('#editorBoard .sq[data-c="6"][data-r="6"]').click();
    assert.strictEqual(await page.locator('#editorBoard .piece[data-c="6"][data-r="6"]').count(), 0, 'trash tool should delete a piece');

    await page.locator('#editorTurn').selectOption('red');
    assert.strictEqual(await page.locator('#editorTurn').inputValue(), 'red');
    await page.locator('#editorFlip').click();
    assert.strictEqual(await page.locator('#editorBoard').getAttribute('data-orientation'), 'red');
    await page.locator('#editorClear').click();
    assert.strictEqual(await page.locator('#editorBoard .piece').count(), 0, 'Clear board should remove all pieces');
    await page.locator('#editorReset').click();
    assert.strictEqual(await page.locator('#editorBoard .piece').count(), initialCount, 'Starting position should restore pieces');

    await page.locator('#editorAnalysis').click();
    await page.getByText('Custom position').waitFor({ state: 'visible' });
    assert.strictEqual(await page.locator('#explorer').isVisible(), true);
    await page.goBack();
    await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Blue Scissors' }).click();
    await page.locator('#editorBoard .sq[data-c="2"][data-r="2"]').click();
    await page.locator('#editorToAnalysis').click();
    await page.locator('#home').waitFor({ state: 'visible' });
    await page.locator('#playFromPosition').waitFor({ state: 'visible' });
    assert.strictEqual(await page.locator('#playFromPosition').isChecked(), true);

    await page.goBack();
    try {
      await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor({ state: 'visible', timeout: 3000 });
      assert.strictEqual(await page.locator('#editor').isVisible(), true,
        'browser Back should return from the lobby to the editor');
      console.log('PASS Analysis/editor history and Continue-from-position navigation');
    } catch (error) {
      failures.push(error.message);
    }
    try { assert.deepStrictEqual(errors, [], `editor console/page errors: ${errors.join('; ')}`); }
    catch (error) { failures.push(error.message); }
    await page.close();
  } finally {
    await browser.close();
  }
  if (failures.length) throw new Error(failures.join(' | '));
})().catch((error) => {
  console.error('EDITOR UI REGRESSION FAILED:', error.message);
  process.exitCode = 1;
});
