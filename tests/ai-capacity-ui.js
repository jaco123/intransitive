#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');

const BASE_URL = process.env.INTRANSITIVE_URL || 'http://141.95.142.131';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('button', { name: 'Play against AI', exact: true }).click();
    await page.locator('#game').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#gameMode').filter({ hasText: 'Computer' }).waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('#playBtn').click();
    await page.locator('#home').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('button', { name: 'Play against AI', exact: true }).click();

    const error = page.locator('#toast.show');
    await error.waitFor({ state: 'visible', timeout: 10000 });
    if (!/already in an AI game/i.test(await error.innerText())) {
      throw new Error(`unexpected repeated-create error: ${await error.innerText()}`);
    }
    if (consoleErrors.length) throw new Error(`browser console errors: ${consoleErrors.join(' | ')}`);
    console.log('AI repeated-create UI guard passed');
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
