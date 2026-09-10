'use strict';

/* Real-site TFV coverage for Discord copy, Watch rendering, and the requested
 * home layout. These cases intentionally run independently. */
const assert = require('assert');
const { firefox } = require('playwright');

const BASE = (process.env.RPS_LIVE_BASE || 'http://141.95.142.131').replace(/\/$/, '');
const DESKTOP = { width: 1366, height: 768 };

async function register(context) {
  const page = await context.newPage({ viewport: DESKTOP });
  page.setDefaultTimeout(15000);
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const username = 'rat' + suffix;
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await page.locator('#authUsername').fill(username);
  await page.locator('#authPassword').fill(require('crypto').randomBytes(18).toString('base64url'));
  await page.locator('#authForm').press('Enter');
  await page.locator('#navUser').waitFor({ state: 'visible' });
  return { page, username };
}

async function createWaitingGame(browser) {
  const page = await browser.newPage({ viewport: DESKTOP });
  page.setDefaultTimeout(10000);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.locator('#createBtn').click();
  await page.locator('#gameStatus').filter({ hasText: 'Waiting for opponent' }).waitFor();
  return page;
}

async function createRatedGame(creator, opponent, preset) {
  await creator.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await creator.getByRole('button', { name: 'Play', exact: true }).click();
  await creator.locator('#tcPresets button').filter({ hasText: preset }).click();
  await creator.locator('#modeRated').click();
  await creator.locator('#createBtn').click();
  await creator.locator('#gameStatus').filter({ hasText: 'Waiting for opponent' }).waitFor();
  const url = creator.url();
  await opponent.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await opponent.locator('#joinInput').fill(url);
  await opponent.locator('#joinBtn').click();
  await creator.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor();
  await opponent.locator('#gameStatus').filter({ hasText: /Your move|to move/ }).waitFor();
}

async function finishByResignation(winner, loser) {
  await loser.locator('#resign').click();
  await loser.getByRole('button', { name: 'Yes', exact: true }).click();
  await winner.locator('#gameStatus').filter({ hasText: /resignation|resign/ }).waitFor();
}

async function readProfileRatings(page) {
  await page.locator('#profileBtn').click();
  await page.locator('#profilePanel').waitFor({ state: 'visible' });
  return page.locator('#profileRatings .profile-rating-value').evaluateAll((els) => els.map((el) => Number(el.textContent.trim())));
}

async function assertNewGameRating(page, preset, category, expected) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.locator('#tcPresets button').filter({ hasText: preset }).click();
  await page.locator('#timeControlSummary').waitFor({ state: 'visible' });
  assert.strictEqual(await page.locator('#timeControlCategory').innerText(), category,
    'New game should identify the selected category');
  assert.match(await page.locator('#timeControlSummary .time-control-symbol').getAttribute('data-time-control') || '',
    new RegExp('^' + category.toLowerCase() + '$'), 'New game should show the selected time-control symbol');
  assert.strictEqual(Number(await page.locator('#timeControlRating').innerText()), expected,
    'New game should show the current selected-category rating');
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

  async function home() {
    const page = await browser.newPage({ viewport: DESKTOP });
    page.setDefaultTimeout(7000);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.locator('#home').waitFor({ state: 'visible' });
    return page;
  }

  try {
    await check('Discord box has exact invitation copy and one link', async () => {
      const page = await home();
      try {
        const invitation = page.getByText('Come join us:', { exact: true });
        await invitation.waitFor({ state: 'visible' });
        assert.strictEqual(await page.getByText('Come join us:', { exact: true }).count(), 1);
        const links = page.getByRole('link', { name: 'Discord', exact: true });
        assert.strictEqual(await links.count(), 1, 'Discord should appear as one link');
        assert.strictEqual(await links.getAttribute('href'), 'https://discord.gg/8wUcgkRFRC');
      } finally {
        await page.close();
      }
    });

    await check('Watch renders one uniform game grid without a featured duplicate', async () => {
      const waiting = await createWaitingGame(browser);
      const page = await home();
      try {
        await page.getByRole('button', { name: 'Watch', exact: true }).click();
        await page.locator('#watch').waitFor({ state: 'visible' });
        assert.strictEqual(await page.locator('#featuredGame').count(), 0,
          'Watch must not render a separately featured copy');
        const cards = page.locator('#watchList > .watch-game');
        assert.ok(await cards.count() >= 1, 'Watch should render games in the grid');
        const structures = await cards.evaluateAll((elements) => elements.map((element) => ({
          className: element.className,
          childClasses: [...element.children].map((child) => child.className),
        })));
        assert.ok(structures.every((structure) => structure.className === structures[0].className),
          'all Watch cards should use one uniform card class');
        assert.ok(structures.every((structure) => JSON.stringify(structure.childClasses) === JSON.stringify(structures[0].childClasses)),
          'all Watch cards should use one uniform card structure');
        const ids = await cards.evaluateAll((elements) => elements.map((element) => element.dataset.gameId));
        assert.strictEqual(new Set(ids).size, ids.length, 'Watch game IDs must not be duplicated');
      } finally {
        await Promise.allSettled([page.close(), waiting.close()]);
      }
    });

    await check('home boxes are wider and game display sits below Chat', async () => {
      const waiting = await createWaitingGame(browser);
      const page = await home();
      try {
        const how = page.locator('.lobby__box').filter({ hasText: 'How to play' }).first();
        const discord = page.locator('.lobby__box').filter({ hasText: 'Come join us:' }).first();
        const chat = page.locator('.lobby__box').filter({ hasText: 'Chat' }).first();
        const featured = page.locator('#homeFeaturedGame');
        for (const box of [how, discord, chat, featured]) await box.waitFor({ state: 'visible' });
        const [howBox, discordBox, chatBox, featuredBox] = await Promise.all(
          [how, discord, chat, featured].map((locator) => locator.boundingBox()));
        assert.ok(howBox && discordBox && chatBox && featuredBox, 'home boxes should have geometry');
        assert.ok(howBox.width >= 320 && discordBox.width >= 320 && chatBox.width >= 320,
          'How to play, Discord, and Chat should be a little wider');
        assert.ok(howBox.height <= 240 && discordBox.height <= 180 && chatBox.height <= 240,
          'How to play, Discord, and Chat should not be overly tall');
        assert.ok(Math.abs(featuredBox.width - chatBox.width) <= 4,
          'home game display should match Chat width');
        assert.ok(featuredBox.y >= chatBox.y + chatBox.height - 2,
          'home game display should fit below Chat');
      } finally {
        await Promise.allSettled([page.close(), waiting.close()]);
      }
    });

    await check('rated games update only their selected category rating', async () => {
      const creatorContext = await browser.newContext();
      const opponentContext = await browser.newContext();
      let creator = null;
      let opponent = null;
      try {
        creator = await register(creatorContext);
        opponent = await register(opponentContext);
        const initial = await readProfileRatings(creator.page);
        assert.strictEqual(initial.length, 4, 'profile should expose four independent ratings');
        await assertNewGameRating(creator.page, '1+0', 'Bullet', initial[0]);

        await createRatedGame(creator.page, opponent.page, '1+0');
        await finishByResignation(creator.page, opponent.page);
        const afterBullet = await readProfileRatings(creator.page);
        assert.notStrictEqual(afterBullet[0], initial[0], 'bullet rating should change after a rated bullet game');
        assert.deepStrictEqual(afterBullet.slice(1), initial.slice(1),
          'blitz, rapid, and classical ratings must remain unchanged after bullet');
        await assertNewGameRating(creator.page, '1+0', 'Bullet', afterBullet[0]);

        await createRatedGame(creator.page, opponent.page, '10+0');
        await finishByResignation(creator.page, opponent.page);
        const afterRapid = await readProfileRatings(creator.page);
        assert.notStrictEqual(afterRapid[2], afterBullet[2], 'rapid rating should change after a rated rapid game');
        assert.strictEqual(afterRapid[1], afterBullet[1], 'blitz rating must remain independent');
        assert.strictEqual(afterRapid[3], afterBullet[3], 'classical rating must remain independent');
        await assertNewGameRating(creator.page, '10+0', 'Rapid', afterRapid[2]);
      } finally {
        await Promise.allSettled([
          creator && creator.page.close(), opponent && opponent.page.close(),
          creatorContext.close(), opponentContext.close(),
        ]);
      }
    });
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error('REQUESTED LAYOUT/RATING UI REGRESSIONS FAILED: ' + failures.join(' | '));
    process.exitCode = 1;
  } else {
    console.log('PASS requested layout/rating UI regressions');
  }
})();
