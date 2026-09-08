'use strict';

/* Black-box tests for the next editor/analysis workflow. These intentionally
 * run against the configured public deployment before implementation review. */
const assert = require('assert');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');

async function editor(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Board editor', exact: true }).click();
  await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor({ state: 'visible' });
}

async function analysis(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Analysis', exact: true }).click();
  await page.getByText(/to move · .* games/).waitFor({ state: 'visible' });
}

(async () => {
  const browser = await firefox.launch({ headless: true });
  const failures = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.setDefaultTimeout(3000);
    page.setDefaultNavigationTimeout(5000);
    await editor(page);
    const icons = {
      'Starting position': '\ue078',
      'Clear board': '\ue04f',
      'Flip board': '\ue020',
      'Analysis board': '\ue01f',
      // Lichess deliberately renders Continue from here without a data-icon.
      'Continue from here': null,
    };
    for (const [label, icon] of Object.entries(icons)) {
      try {
        const button = page.getByRole('button', { name: new RegExp(label) });
        assert.strictEqual(await button.getAttribute('data-icon'), icon, `${label} should use the reference icon glyph`);
      } catch (error) { failures.push(error.message); }
    }
    for (const palette of ['#editorPaletteTop', '#editorPaletteBottom']) {
      try {
        assert.match(await page.locator(`${palette} [data-tool="cursor"] img`).getAttribute('src'), /lichess-pointer\.svg$/);
        assert.match(await page.locator(`${palette} [data-tool="erase"] img`).getAttribute('src'), /lichess-trash\.svg$/);
      } catch (error) { failures.push(`${palette} should use the reference pointer/trash assets: ${error.message}`); }
    }

    try {
      await page.getByRole('button', { name: 'Blue Rock' }).click();
      await page.locator('#editorBoard .sq[data-c="4"][data-r="4"]').click();
      await page.getByRole('button', { name: 'Analysis board' }).click();
      await page.getByText('Custom position').waitFor({ state: 'visible', timeout: 3000 });
    } catch (error) { failures.push('Analysis board should preserve the current editor position: ' + error.message); }

    await page.goBack();
    await page.getByRole('heading', { name: 'Board editor', exact: true }).waitFor({ state: 'visible' });
    try {
      await page.getByRole('button', { name: 'Continue from here' }).click();
      await page.locator('#home').waitFor({ state: 'visible', timeout: 3000 });
      await page.locator('#playFromPositionPreview').waitFor({ state: 'visible', timeout: 3000 });
      assert.strictEqual(await page.locator('#playFromPositionPreview .piece[data-c="4"][data-r="4"]').count(), 1,
        'Continue from here should carry the editor position into the lobby');
    } catch (error) { failures.push('Continue from here should return to the lobby: ' + error.message); }

      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    try {
      const setting = page.getByRole('checkbox', { name: 'Play from position' });
      await setting.check();
      await page.locator('#playFromPositionPreview').waitFor({ state: 'visible', timeout: 3000 });
      assert.strictEqual(await page.locator('#playFromPositionPreview .piece').count(), 20,
        'directly enabling Play from position should default to the starting position');
      const previewSource = page.locator('#playFromPositionPreview .piece').first();
      const sourceC = await previewSource.getAttribute('data-c');
      const sourceR = await previewSource.getAttribute('data-r');
      await previewSource.dragTo(page.locator('#playPositionBoard .sq[data-c="0"][data-r="0"]'));
      assert.strictEqual(await page.locator(`#playPositionBoard .piece[data-c="${sourceC}"][data-r="${sourceR}"]`).count(), 0,
        'preview pieces should be movable');
    } catch (error) { failures.push('Play from position should enable a movable preview: ' + error.message); }

    await analysis(page);
    try {
      const source = page.locator('#explorerBoard .piece[data-color="blue"]').first();
      await source.click();
      const target = page.locator('#explorerBoard .mv-dot').first().locator('..');
      await target.waitFor({ state: 'visible', timeout: 3000 });
      const from = await source.boundingBox();
      const to = await target.boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2);
      const ghost = page.locator('.drag-ghost');
      await ghost.waitFor({ state: 'visible', timeout: 3000 });
      const ghostBox = await ghost.boundingBox();
      assert.ok(Math.abs((ghostBox.x + ghostBox.width / 2) - (to.x + to.width / 2)) < 2, 'analysis drag ghost should be centered horizontally');
      assert.ok(Math.abs((ghostBox.y + ghostBox.height / 2) - (to.y + to.height / 2)) < 2, 'analysis drag ghost should be centered vertically');
      await page.mouse.up();
      await page.waitForFunction(() => document.getElementById('explorerPath').textContent !== 'Initial position');
      assert.notStrictEqual(await page.locator('#explorerPath').textContent(), 'Initial position',
        'dragging a legal analysis move should advance the path');
    } catch (error) { failures.push('Analysis pieces should support legal drag/drop: ' + error.message); }

    if (failures.length) throw new Error(failures.join(' | '));
    console.log('PASS next editor/analysis UI workflow');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error('EDITOR NEXT UI REGRESSION FAILED:', error.message);
  process.exitCode = 1;
});
