'use strict';

/* Real-browser smoke test for the deployed site. Set RPS_LIVE_BASE to verify
 * another explicitly configured deployment; default is the server's public IP. */
const assert = require('assert');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const websocketUrls = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('requestfailed', (request) => failedRequests.push(request.url() + ': ' + request.failure().errorText));
  page.on('websocket', (websocket) => websocketUrls.push(websocket.url()));

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await assert.doesNotReject(() => page.waitForTimeout(750));
  assert.strictEqual(await page.title(), 'RPS2');
  assert.strictEqual(await page.locator('#home').isVisible(), true);
  assert.strictEqual(websocketUrls.some((url) => /\/ws$/.test(url)), true, 'UI should open its WebSocket');

  const iconLink = await page.locator('link[rel="icon"]').getAttribute('href');
  assert.ok(iconLink, 'page should declare a favicon');
  const iconResponse = await page.request.get(new URL(iconLink, BASE + '/').href);
  assert.strictEqual(iconResponse.status(), 200);
  assert.match(await iconResponse.text(), /<svg/);

  // Exercise a second UI view and its API-backed rendering on the deployed URL.
  await page.locator('#analysisBtn').click();
  await page.waitForFunction(() => {
    const status = document.getElementById('explorerStatus');
    return status && status.textContent && status.textContent !== 'Loading…';
  });
  assert.strictEqual(await page.locator('#explorer').isVisible(), true);
  assert.deepStrictEqual(consoleErrors, [], 'browser console should have no errors');
  assert.deepStrictEqual(pageErrors, [], 'page should have no uncaught errors');
  assert.deepStrictEqual(failedRequests, [], 'page resources should load successfully');

  console.log('PASS live deployment UI, WebSocket, favicon, and console/page-error checks');
  await browser.close();
})().catch((error) => {
  console.error('LIVE DEPLOYMENT TEST FAILED:', error.message);
  process.exitCode = 1;
});
