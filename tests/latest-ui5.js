'use strict';

/* Real-IP regression: an unavailable premove target may become legal after the
 * opponent vacates it.  This deliberately uses the UI in two browser pages. */
const assert = require('assert');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');

async function setPosition(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Board editor', exact: true }).click();
  await page.getByRole('button', { name: 'Clear board', exact: true }).click();
  const put = async (name, c, r) => {
    await page.getByRole('button', { name, exact: true }).first().click();
    await page.locator('#editorBoard .sq[data-c="' + c + '"][data-r="' + r + '"]').click();
  };
  await put('Blue Rock', 4, 3);
  await put('Blue Paper', 0, 2);
  await put('Red Rock', 5, 3);
  await page.getByRole('button', { name: 'Continue from here', exact: true }).click();
  await page.locator('#playFromPosition').isChecked();
  await page.locator('#createBtn').click();
  await page.locator('#gameStatus').filter({ hasText: /Waiting for opponent/ }).waitFor();
  return page.url();
}

async function clickSquare(page, c, r) {
  await page.locator('#board .sq[data-c="' + c + '"][data-r="' + r + '"]').click();
}

(async () => {
  const failures = [];
  const browser = await firefox.launch({ headless: true });
  try {
    const blue = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const red = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    blue.setDefaultTimeout(10000);
    red.setDefaultTimeout(10000);

    const gameUrl = await setPosition(blue);
    await red.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await red.locator('#joinInput').fill(gameUrl);
    await red.locator('#joinBtn').click();
    await blue.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor();
    await red.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor();

    // Blue's first move is the paper at (0,2), freeing the turn while leaving
    // the rock at (4,3) next to an un-capturable red rock at (5,3).
    await clickSquare(blue, 0, 2);
    const firstTarget = await blue.locator('#board .mv-dot').first().boundingBox();
    assert.ok(firstTarget, 'Blue first move should have a legal target');
    await blue.mouse.click(firstTarget.x + firstTarget.width / 2, firstTarget.y + firstTarget.height / 2);
    await blue.locator('#moves .move').nth(0).waitFor();

    // Queue the currently unavailable move. It must be represented as a
    // premove and must not produce an invalid-move server response.
    await clickSquare(blue, 4, 3);
    assert.strictEqual(await blue.locator('#board .sq[data-c="5"][data-r="3"] .mv-dot').count(), 0,
      'the blocked destination must not be presented as a legal target');
    await clickSquare(blue, 5, 3);
    assert.strictEqual(await blue.locator('#board .sq[data-c="4"][data-r="3"].premove-from').count(), 1,
      'blocked move should be queued as a premove');
    assert.strictEqual(await blue.locator('#board .sq[data-c="5"][data-r="3"].premove-to').count(), 1,
      'queued destination should be shown');
    assert.doesNotMatch(await blue.locator('body').innerText(), /Invalid|illegal move/i,
      'blocked premove must not be sent prematurely');

    // Red vacates (5,3) to (6,3), making the queued Blue move legal.
    await clickSquare(red, 5, 3);
    await clickSquare(red, 6, 3);
    await blue.locator('#moves .move').nth(2).waitFor({ timeout: 10000 });
    assert.strictEqual(await blue.locator('#board .piece[data-c="5"][data-r="3"][data-color="blue"]').count(), 1,
      'queued move should execute after the destination becomes available');
    assert.doesNotMatch(await blue.locator('body').innerText(), /Invalid|illegal move/i,
      'executed premove must not report an invalid move');
    await blue.close();
    await red.close();
  } catch (error) {
    failures.push(error.message);
  } finally {
    await browser.close();
  }
  if (failures.length) throw new Error(failures.join(' | '));
  console.log('PASS latest UI5 unavailable-destination premove regression');
})().catch((error) => {
  console.error('LATEST UI5 REGRESSION FAILED:', error.message);
  process.exitCode = 1;
});
