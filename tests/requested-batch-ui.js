'use strict';

/* Real-site behavioral coverage for the current requested batch. These cases
 * deliberately use the browser UI for auth, studies, games, and navigation. */
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

async function openStudies(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Study', exact: true }).click();
  await page.locator('#study').waitFor({ state: 'visible' });
}

async function createStudy(page, name) {
  await openStudies(page);
  await page.getByRole('button', { name: 'Create study', exact: true }).click();
  await page.locator('#studyName').fill(name);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.locator('#studyPage').waitFor({ state: 'visible' });
  return new URL(page.url()).searchParams.get('study');
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

    await check('Study entry and route', async () => {
      const page = await newPage(browser);
      try {
        await openStudies(page);
        assert.strictEqual(new URL(page.url()).searchParams.get('view'), 'studies');
        assert.strictEqual(await page.locator('#studyList').isVisible(), true);
        assert.strictEqual(await page.locator('#studyPublicList').isVisible(), true);
      } finally { await page.close(); }
    });

    await check('Study create/delete and analysis position', async () => {
      const context = await browser.newContext();
      let account = null;
      try {
        account = await register(context);
        const name = 'Batch study ' + Date.now().toString(36);
        const studyId = await createStudy(account.page, name);
        assert.ok(studyId, 'created study should have a route id');
        assert.strictEqual(await account.page.locator('#studyNameHeading').innerText(), name);
        assert.ok(await account.page.locator('#studyPage .study-position').count() >= 1,
          'a study should start with an analysis-board position');
        assert.strictEqual(await account.page.locator('#studyDelete').isVisible(), true,
          'owner should be able to delete the study');
        account.page.once('dialog', (dialog) => dialog.accept());
        await account.page.locator('#studyDelete').click();
        await account.page.locator('#study').waitFor({ state: 'visible' });
        assert.strictEqual(await account.page.locator('#studyList [data-study-id="' + studyId + '"]').count(), 0,
          'deleted study should leave the owner list');
      } finally {
        await Promise.allSettled([account && account.page.close(), context.close()]);
      }
    });

    await check('Study sharing private link public list and authorization', async () => {
      const ownerContext = await browser.newContext();
      const recipientContext = await browser.newContext();
      let owner = null; let recipient = null;
      try {
        owner = await register(ownerContext);
        recipient = await register(recipientContext);
        const name = 'Shared study ' + Date.now().toString(36);
        await createStudy(owner.page, name);
        await owner.page.locator('#studyShare').click();
        await owner.page.locator('#studySharePanel').waitFor({ state: 'visible' });
        await owner.page.locator('#studyShareUsername').fill(recipient.username);
        await owner.page.locator('#studyShareSubmit').click();
        await owner.page.locator('#studyShareStatus').filter({ hasText: /shared/i }).waitFor();
        const privateLink = await owner.page.locator('#studyPrivateLink').inputValue();
        assert.match(privateLink, /[?&]study=/);
        assert.match(privateLink, /[?&]token=[A-Za-z0-9_-]{16,}/,
          'private study link should contain an unguessable bearer token');
        await owner.page.locator('#studyPublish').click();
        await owner.page.locator('#studyPublicStatus').filter({ hasText: /public/i }).waitFor();

        await openStudies(recipient.page);
        await recipient.page.locator('#studySharedList [data-study-id]').filter({ hasText: name }).waitFor();
        await recipient.page.locator('#studySharedList [data-study-id]').filter({ hasText: name }).click();
        await recipient.page.locator('#studyPage').waitFor({ state: 'visible' });
        assert.strictEqual(await recipient.page.locator('#studyDelete').isVisible(), false,
          'shared readers must not see owner delete controls');

        await recipient.page.goto(privateLink, { waitUntil: 'domcontentloaded' });
        await recipient.page.locator('#studyPage').waitFor({ state: 'visible' });
        assert.strictEqual(await recipient.page.locator('#studyNameHeading').innerText(), name);

        const outsider = await newPage(browser);
        try {
          await outsider.goto(BASE + '/?view=study&study=' + encodeURIComponent(new URL(owner.page.url()).searchParams.get('study')), { waitUntil: 'domcontentloaded' });
          await outsider.waitForTimeout(700);
          assert.strictEqual(await outsider.locator('#studyPage').isVisible(), false,
            'a private study without its token must not be exposed');
        } finally { await outsider.close(); }
      } finally {
        await Promise.allSettled([owner && owner.page.close(), recipient && recipient.page.close(), ownerContext.close(), recipientContext.close()]);
      }
    });

    await check('Board editor adds a position to a chosen study', async () => {
      const context = await browser.newContext();
      let account = null;
      try {
        account = await register(context);
        const name = 'Editor study ' + Date.now().toString(36);
        await createStudy(account.page, name);
        await account.page.getByRole('button', { name: 'Board editor', exact: true }).click();
        await account.page.locator('#editorBoard .sq').first().waitFor({ state: 'visible' });
        await account.page.locator('#editorAddToStudy').click();
        await account.page.locator('#studyChooser').waitFor({ state: 'visible' });
        await account.page.locator('#studyChooser [data-study-id]').filter({ hasText: name }).click();
        await account.page.locator('#studyPage').waitFor({ state: 'visible' });
        assert.ok(await account.page.locator('#studyPage .study-position').count() >= 2,
          'editor position should be added to the selected study');
      } finally { await Promise.allSettled([account && account.page.close(), context.close()]); }
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
        await watch.locator('#featuredGame').waitFor({ state: 'visible' });
        await watch.locator('#watchList .watch-game').nth(1).waitFor({ state: 'visible' });
        const featured = await watch.locator('#featuredGame').boundingBox();
        const cards = await watch.locator('#watchList .watch-game').evaluateAll((els) => els.map((el) => {
          const box = el.getBoundingClientRect();
          return { bottom: box.bottom, top: box.top, height: box.height };
        }));
        assert.ok(featured && cards.length >= 2, 'featured and multiple small games should be visible');
        assert.ok(featured.bottom <= VIEWPORT.height + 2, 'featured game should fit in the desktop viewport');
        assert.ok(Math.max(...cards.map((card) => card.bottom)) <= VIEWPORT.height + 2,
          'small Watch games should fit in the desktop viewport');
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
          ['Study', '#studyBack'],
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
