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
    await page.getByRole('button', { name: 'Intransitive AI', exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('#board .sq[data-c="3"][data-r="1"]').click();
    await page.locator('#board .sq[data-c="4"][data-r="0"]').click();
    await page.locator('#moves .move[data-step="0"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('#moves .move[data-step]').length >= 2,
      null, { timeout: 30000 });
    if (consoleErrors.length) throw new Error(`browser console errors: ${consoleErrors.join(' | ')}`);
    console.log('AI game UI flow passed');
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
