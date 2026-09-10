'use strict';

/* Real-site behavioral coverage for the current requested batch. These cases
 * deliberately use the browser UI for auth, games, and navigation. */
const assert = require('assert');
const crypto = require('crypto');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');
const VIEWPORT = { width: 1366, height: 768 };

async function newPage(owner) {
  const page = await owner.newPage({ viewport: VIEWPORT });
  page.setDefaultTimeout(7000);
  return page;
}

async function register(context) {
  const page = await newPage(context);
  const username = 'batch' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
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

async function createLiveGame(context) {
  const creator = await newPage(context);
  const joiner = await newPage(context);
  await creator.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await creator.locator('#createBtn').click();
  await creator.locator('#gameStatus').filter({ hasText: 'Waiting for opponent' }).waitFor();
  const url = creator.url();
  await joiner.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await joiner.locator('#joinInput').fill(url);
  await joiner.locator('#joinBtn').click();
  await creator.locator('#gameStatus').filter({ hasText: 'Your move' }).waitFor();
  await joiner.locator('#gameStatus').waitFor({ state: 'visible' });
  return { creator, joiner };
}

(async () => {
  const browser = await firefox.launch({ headless: true });
  const failures = [];

  async function check(label, fn) {
    try {
      await fn();
      console.log('PASS [' + label + ']');
    } catch (error) {
      failures.push(label + ': ' + error.message);
      console.error('FAIL [' + label + ']: ' + error.message);
    }
  }

  try {
    await check('home Discord link', async () => {
      const page = await newPage(browser);
      try {
        await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        const discord = page.getByRole('link', { name: 'Discord', exact: true });
        await discord.waitFor({ state: 'visible' });
        assert.strictEqual(await discord.getAttribute('href'), 'https://discord.gg/8wUcgkRFRC');
        assert.match(await discord.getAttribute('rel') || '', /noopener/);
        assert.match(await discord.getAttribute('rel') || '', /noreferrer/);
      } finally { await page.close(); }
    });

    await check('Watch featured geometry fits viewport', async () => {
      const context = await browser.newContext();
      const games = [];
      let watch = null;
      try {
        for (let i = 0; i < 3; i++) games.push(await createLiveGame(context));
        watch = await newPage(context);
        await watch.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await watch.getByRole('button', { name: 'Watch', exact: true }).click();
        await watch.locator('#watch').waitFor({ state: 'visible' });
        await watch.locator('#watchList .watch-game').nth(1).waitFor({ state: 'visible' });
        const cards = await watch.locator('#watchList .watch-game').evaluateAll((els) => els.map((el) => {
          const box = el.getBoundingClientRect();
          return { bottom: box.bottom, top: box.top, height: box.height };
        }));
        assert.ok(cards.length >= 2, 'multiple Watch games should be visible');
        const firstRow = cards.filter((card) => card.top < VIEWPORT.height && card.bottom <= VIEWPORT.height + 2);
        assert.ok(firstRow.length >= 2, 'multiple small Watch games should fit in the desktop viewport');
      } finally {
        await Promise.allSettled([
          watch && watch.close(),
          ...games.flatMap((game) => [game.creator.close(), game.joiner.close()]),
          context.close(),
        ]);
      }
    });

    await check('back controls show arrows without visible Back text', async () => {
      const page = await newPage(browser);
      try {
        const screens = [
          ['Leaderboard', '#leaderboardBack'],
          ['Watch', '#watchBack'],
          ['Players', '#playersBack'],
          ['Analysis', '#explorerBack'],
          ['Board editor', '#editorBack'],
        ];
        for (const [entry, selector] of screens) {
          await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
          await page.getByRole('button', { name: entry, exact: true }).click();
          const back = page.locator(selector);
          await back.waitFor({ state: 'visible' });
          assert.doesNotMatch(await back.innerText(), /\bBack\b/i, entry + ' back control should not show text');
          assert.match((await back.getAttribute('aria-label')) || '', /Back/i, entry + ' back control should remain accessible');
          assert.ok((await back.getAttribute('title')) || (await back.getAttribute('aria-label')),
            entry + ' back control should retain a tooltip or accessible label');
        }
      } finally { await page.close(); }
    });

    await check('New game category symbol and rating update with controls', async () => {
      const context = await browser.newContext();
      let account = null;
      try {
        account = await register(context);
        await account.page.getByRole('button', { name: 'Play', exact: true }).click();
        const summary = account.page.locator('#timeControlSummary');
        await summary.waitFor({ state: 'visible' });
        for (const category of ['bullet', 'blitz', 'rapid', 'classical']) {
          await account.page.locator('#tcPresets [data-category="' + category + '"]').first().click();
          await account.page.locator('#timeControlCategory').filter({ hasText: new RegExp('^' + category + '$', 'i') }).waitFor();
          assert.strictEqual(await account.page.locator('#timeControlCategory').innerText(), category[0].toUpperCase() + category.slice(1));
          assert.strictEqual(await account.page.locator('#timeControlSummary .time-control-symbol').count(), 1);
          const rating = await account.page.locator('#timeControlRating').innerText();
          assert.match(rating, /^\d+$/, 'logged-in category rating should be numeric');
        }
      } finally { await Promise.allSettled([account && account.page.close(), context.close()]); }
    });

    await check('logged-out New game rating is unavailable', async () => {
      const page = await newPage(browser);
      try {
        await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Play', exact: true }).click();
        await page.locator('#timeControlSummary').waitFor({ state: 'visible' });
        assert.doesNotMatch(await page.locator('#timeControlRating').innerText(), /^\d+$/,
          'logged-out users should not see a bogus numeric rating');
      } finally { await page.close(); }
    });
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error('REQUESTED BATCH UI REGRESSION FAILED: ' + failures.join(' | '));
    process.exitCode = 1;
  } else {
    console.log('PASS requested batch UI regressions');
  }
})();
