import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const AA_ABILITIES = [
  { id: 1, name: 'Combat Agility', first_rank_id: 100, category: 1, charges: 0,
    classes: 65535, deities: 131071, drakkin_heritage: 0, enabled: 1,
    grant_only: 0, auto_grant_enabled: 0, races: 65535, reset_on_death: 0,
    status: 0, type: 1 },
  { id: 2, name: 'Combat Stability', first_rank_id: 200, category: 1, charges: 0,
    classes: 65535, deities: 131071, drakkin_heritage: 0, enabled: 1,
    grant_only: 0, auto_grant_enabled: 0, races: 65535, reset_on_death: 0,
    status: 0, type: 1 },
];

const AA_RANKS = [
  { id: 100, cost: 3, desc_sid: 400, expansion: 0, level_req: 51,
    lower_hotkey_sid: 0, next_id: 101, prev_id: 0, recast_time: 0,
    spell: 0, spell_type: 0, title_sid: 300, upper_hotkey_sid: 0 },
  { id: 101, cost: 3, desc_sid: 400, expansion: 0, level_req: 51,
    lower_hotkey_sid: 0, next_id: 0, prev_id: 100, recast_time: 0,
    spell: 0, spell_type: 0, title_sid: 300, upper_hotkey_sid: 0 },
  { id: 200, cost: 3, desc_sid: 402, expansion: 0, level_req: 51,
    lower_hotkey_sid: 0, next_id: 0, prev_id: 0, recast_time: 0,
    spell: 0, spell_type: 0, title_sid: 301, upper_hotkey_sid: 0 },
];

const DB_STRS = [
  // type 1 — AA Name
  { id: 300, type: 1, value: 'Combat Agility' },
  { id: 301, type: 1, value: 'Combat Stability' },
  // type 4 — AA Desc
  { id: 400, type: 4, value: 'Increases your ability to avoid melee attacks.' },
  { id: 402, type: 4, value: 'Increases your ability to absorb damage from melee attacks.' },
];

// ---------------------------------------------------------------------------
// Helper: install API mocks
// ---------------------------------------------------------------------------

async function mockApis(page: Page) {
  // Catch-all first (checked last in LIFO)
  await page.route('**/api/v1/**', route => {
    if (!route.request().isNavigationRequest()) {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    } else {
      route.continue();
    }
  });

  await page.route('https://api.github.com/**', route => route.abort());

  await page.route('**/api/v1/aa_abilities**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AA_ABILITIES) })
  );

  await page.route('**/api/v1/aa_ranks**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AA_RANKS) })
  );

  await page.route('**/api/v1/db_strs**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DB_STRS) })
  );

  await page.route('**/api/v1/aa_rank_effects**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  await page.route('**/api/v1/aa_rank_prereqs**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  // App env — registered last = checked first in LIFO
  await page.route('**/api/v1/app/env**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          is_spire_initialized: true,
          env: 'local',
          version: '1.0.0',
          features: {},
          settings: [],
          os: 'linux',
        }
      })
    })
  );
}

async function gotoAaEditor(page: Page) {
  await mockApis(page);
  await page.goto('/aa');
  // Wait for the AA list table to appear
  await page.waitForSelector('#aa-editor-table', { timeout: 20000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('AA Editor — Basic Tab Title & Description', () => {

  test('AA list loads and shows ability rows', async ({ page }) => {
    await gotoAaEditor(page);

    const rows = page.locator('#aa-editor-table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Combat Agility');
    await expect(rows.nth(1)).toContainText('Combat Stability');
  });

  test('selecting an AA shows the Basic tab', async ({ page }) => {
    await gotoAaEditor(page);

    await page.locator('#aa-editor-table tbody tr').nth(0).click();

    // The right panel title bar updates to include the ability name
    await expect(page.locator('.eq-window-title-bar').filter({ hasText: 'Combat Agility' })).toBeVisible({ timeout: 10000 });
  });

  test('Basic tab shows Title field resolved from dbstr type 1', async ({ page }) => {
    await gotoAaEditor(page);

    await page.locator('#aa-editor-table tbody tr').nth(0).click();

    // Wait for ranks to load (title field becomes visible)
    const titleInput = page.locator('input[placeholder="(no title)"]');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await expect(titleInput).toHaveValue('Combat Agility');
  });

  test('Basic tab shows Description field resolved from dbstr type 4', async ({ page }) => {
    await gotoAaEditor(page);

    await page.locator('#aa-editor-table tbody tr').nth(0).click();

    const descTextarea = page.locator('textarea[placeholder="(no description)"]');
    await expect(descTextarea).toBeVisible({ timeout: 10000 });
    await expect(descTextarea).toHaveValue('Increases your ability to avoid melee attacks.');
  });

  test('Title and Description update when a different AA is selected', async ({ page }) => {
    await gotoAaEditor(page);

    // Select first AA
    await page.locator('#aa-editor-table tbody tr').nth(0).click();
    await expect(page.locator('input[placeholder="(no title)"]')).toHaveValue('Combat Agility', { timeout: 10000 });

    // Select second AA
    await page.locator('#aa-editor-table tbody tr').nth(1).click();
    await expect(page.locator('input[placeholder="(no title)"]')).toHaveValue('Combat Stability', { timeout: 10000 });
    await expect(page.locator('textarea[placeholder="(no description)"]')).toHaveValue(
      'Increases your ability to absorb damage from melee attacks.',
      { timeout: 10000 }
    );
  });

  test('Title and Description fields are read-only', async ({ page }) => {
    await gotoAaEditor(page);

    await page.locator('#aa-editor-table tbody tr').nth(0).click();

    const titleInput = page.locator('input[placeholder="(no title)"]');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await expect(titleInput).toBeDisabled();

    const descTextarea = page.locator('textarea[placeholder="(no description)"]');
    await expect(descTextarea).toBeDisabled();
  });

  test('Title and Description are not shown before an AA is selected', async ({ page }) => {
    await gotoAaEditor(page);

    await expect(page.locator('input[placeholder="(no title)"]')).toHaveCount(0);
    await expect(page.locator('textarea[placeholder="(no description)"]')).toHaveCount(0);
  });

});
