'use strict';

/* Real-site regression: profile ratings must be explicitly time-control
 * scoped, so a legacy top-level rating cannot silently become the display. */
const assert = require('assert');
const crypto = require('crypto');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');
const CATEGORIES = ['bullet', 'blitz', 'rapid', 'classical'];

(async () => {
  const browser = await firefox.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.setDefaultTimeout(15000);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Sign up', exact: true }).click();
    await page.locator('#authUsername').fill('legacy' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'));
    await page.locator('#authPassword').fill(crypto.randomBytes(18).toString('base64url'));
    await page.locator('#authForm').press('Enter');
    await page.locator('#navUser').waitFor({ state: 'visible' });
    await page.locator('#profileBtn').click();
    await page.locator('#profilePanel').waitFor({ state: 'visible' });

    const ratings = page.locator('#profileRatings .profile-rating');
    assert.strictEqual(await ratings.count(), 4, 'profile should display four ratings');
    assert.deepStrictEqual(await ratings.evaluateAll((els) => els.map((el) => el.dataset.category)), CATEGORIES,
      'each profile rating must declare its time-control category');
    for (const category of CATEGORIES) {
      const cell = page.locator('#profileRatings .profile-rating[data-category="' + category + '"]');
      assert.strictEqual(await cell.locator('.profile-rating-value').count(), 1,
        category + ' should have one scoped rating value');
      assert.match(await cell.innerText(), new RegExp(category, 'i'), category + ' label missing');
    }
    assert.strictEqual(await page.locator('#profilePanel > .profile-rating-value').count(), 0,
      'profile must not render an unscoped legacy rating value');
    console.log('PASS requested legacy-rating UI regression');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error('REQUESTED LEGACY-RATING UI REGRESSION FAILED:', error.message);
  process.exitCode = 1;
});
