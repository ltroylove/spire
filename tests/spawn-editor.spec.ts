import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const ZONES = [
  { short_name: 'qeynos', long_name: 'South Qeynos', zoneidnumber: 1, expansion: 0, version: 0 },
  { short_name: 'halas',  long_name: 'Halas',         zoneidnumber: 2, expansion: 0, version: 0 },
  { short_name: 'grobb',  long_name: 'Grobb',          zoneidnumber: 3, expansion: 0, version: 0 },
  { short_name: 'rivervale', long_name: 'Rivervale',   zoneidnumber: 4, expansion: 0, version: 0 },
  { short_name: 'crushbone', long_name: 'Crushbone',   zoneidnumber: 5, expansion: 0, version: 0 },
];

const NPCS = [
  { id: 101, name: 'Guard_Morgan', level: 20, race: 1, class: 1 },
  { id: 102, name: 'Guard_Hana',   level: 20, race: 1, class: 1 },
  { id: 201, name: 'Mammoth',      level: 30, race: 46, class: 1 },
];

const SPAWNGROUPS = [
  { id: 10, name: 'qeynos_guard_1', spawn_limit: 1, dist: 0, delay: 45000, mindelay: 15000,
    despawn: 0, despawn_timer: 100, wp_spawns: 0, min_x: 0, max_x: 0, min_y: 0, max_y: 0 },
];

const SPAWN2 = [
  { id: 1, spawngroup_id: 10, zone: 'qeynos', version: 0, x: 100, y: 200, z: 5, heading: 0,
    respawntime: 1200, pathgrid: 0, animation: 0, _condition: 0, cond_value: 1,
    min_expansion: -1, max_expansion: -1, content_flags: '', content_flags_disabled: '' },
];

const SPAWN_ENTRIES = [
  { spawngroup_id: 10, npc_id: 101, chance: 100, content_flags: '', content_flags_disabled: '',
    min_expansion: -1, max_expansion: -1, min_time: 0, max_time: 0, condition_value_filter: 0 },
  { spawngroup_id: 10, npc_id: 102, chance: 100, content_flags: '', content_flags_disabled: '',
    min_expansion: -1, max_expansion: -1, min_time: 0, max_time: 0, condition_value_filter: 0 },
];

// ---------------------------------------------------------------------------
// Helper: install API mocks on the page
// ---------------------------------------------------------------------------

async function mockApis(page: Page) {
  // IMPORTANT: Playwright processes route handlers in LIFO order — the LAST registered
  // handler is checked FIRST. Register the catch-all first so specific handlers
  // (registered after) take priority.

  // Catch-all: suppress unknown /api/v1 calls (registered first = checked last)
  await page.route('**/api/v1/**', route => {
    if (!route.request().isNavigationRequest()) {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    } else {
      route.continue();
    }
  });

  // Abort GitHub API requests (triggered by checkForSpireUpdate on env=local)
  await page.route('https://api.github.com/**', route => route.abort());

  // Specific handlers (registered last = checked first in LIFO)
  await page.route('**/api/v1/spawngroups**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SPAWNGROUPS) })
  );

  await page.route('**/api/v1/spawnentries**', route => {
    const url = route.request().url();
    let entries = SPAWN_ENTRIES;
    const match = url.match(/npcID__(\d+)/);
    if (match) {
      const id = parseInt(match[1]);
      entries = SPAWN_ENTRIES.filter(e => e.npc_id === id);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) });
  });

  // The generated Spawn2Api uses path /spawn_2s (with underscore)
  await page.route('**/api/v1/spawn_2**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SPAWN2) })
  );

  // The generated NpcTypeApi uses path /npc_types (with underscore, not hyphen)
  await page.route('**/api/v1/npc_type**', route => {
    const url = route.request().url();
    let npcs = NPCS;
    // name like filter (text search): where=name_like_%25Guard%25
    const likeMatch = url.match(/name_like_([^&]+)/i);
    if (likeMatch) {
      const raw = decodeURIComponent(likeMatch[1]).replace(/%/g, '').toLowerCase();
      if (raw) npcs = NPCS.filter(n => n.name.toLowerCase().includes(raw));
    }
    // id search (numeric query): where=id__101
    const idMatch = url.match(/[?&]where=id__(\d+)/);
    if (idMatch) {
      const id = parseInt(idMatch[1]);
      npcs = NPCS.filter(n => n.id === id);
    }
    // whereOr id lookup (zone filter direct ID paging)
    if (url.includes('whereOr=')) {
      const orMatches = [...url.matchAll(/id__(\d+)/g)];
      if (orMatches.length > 0) {
        const ids = orMatches.map(m => parseInt(m[1]));
        npcs = NPCS.filter(n => ids.includes(n.id));
      }
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(npcs) });
  });

  await page.route('**/api/v1/zones**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ZONES) })
  );

  // App env — must be last registered (= first checked in LIFO).
  // settings must be an array (not {}): AppEnv.isLocalAuthEnabled() iterates
  // over settings with for...of, which throws on a plain object.
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

// ---------------------------------------------------------------------------
// Helper: navigate to spawn editor
// ---------------------------------------------------------------------------

async function gotoSpawnEditor(page: Page) {
  await mockApis(page);
  await page.goto('/spawns');
  await page.waitForSelector('.spawn-search-pane', { timeout: 20000 });
}

// ---------------------------------------------------------------------------
// Tests: zone filter UI
// ---------------------------------------------------------------------------

test.describe('Spawn Editor — Zone Filter', () => {

  test('zone filter row is visible with Zones label and All Zones button', async ({ page }) => {
    await gotoSpawnEditor(page);

    const row = page.locator('.zone-filter-row');
    await expect(row).toBeVisible();
    await expect(row.locator('.zone-filter-label')).toHaveText('Zones:');
    await expect(row.locator('.zone-filter-add-btn')).toContainText('All Zones');
  });

  test('no zone filter pills visible on initial load', async ({ page }) => {
    await gotoSpawnEditor(page);
    await expect(page.locator('.zone-filter-pill')).toHaveCount(0);
  });

  test('clicking Add button opens zone filter modal', async ({ page }) => {
    await gotoSpawnEditor(page);

    await page.locator('.zone-filter-add-btn').click();

    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.eq-window-title-bar')).toContainText('Filter by Zone');
    await expect(modal.locator('input[placeholder*="Search by zone"]')).toBeVisible();
    await expect(modal.locator('tbody tr')).toHaveCount(5);
    await expect(modal.locator('button:has-text("Add Selected")')).toBeDisabled();
  });

  test('zone filter modal search narrows zone list', async ({ page }) => {
    await gotoSpawnEditor(page);
    await page.locator('.zone-filter-add-btn').click();

    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    await modal.locator('input[placeholder*="Search by zone"]').fill('qeynos');
    await page.waitForTimeout(200);

    const rows = modal.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('qeynos');
  });

  test('selecting zones in modal enables Add Selected and shows count', async ({ page }) => {
    await gotoSpawnEditor(page);
    await page.locator('.zone-filter-add-btn').click();

    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    const rows = modal.locator('tbody tr');
    await rows.nth(0).click();
    await rows.nth(1).click();

    await expect(modal.locator('button:has-text("Add Selected")')).toBeEnabled();
    await expect(modal.locator('small')).toContainText('2 zones selected');
  });

  test('applying zone filter adds pills and changes Add button label', async ({ page }) => {
    await gotoSpawnEditor(page);
    await page.locator('.zone-filter-add-btn').click();

    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    await modal.locator('tbody tr').first().click();

    await modal.locator('button:has-text("Add Selected")').click();

    await expect(modal).not.toBeVisible();
    const pills = page.locator('.zone-filter-pill');
    await expect(pills).toHaveCount(1);
    await expect(pills.first()).toContainText('qeynos');
    await expect(page.locator('.zone-filter-add-btn')).toContainText('Add');
  });

  test('reopening modal pre-checks already active zones', async ({ page }) => {
    await gotoSpawnEditor(page);

    await page.locator('.zone-filter-add-btn').click();
    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    await modal.locator('tbody tr').first().click();
    await modal.locator('button:has-text("Add Selected")').click();
    await expect(modal).not.toBeVisible();

    await page.locator('.zone-filter-add-btn').click();
    await expect(modal).toBeVisible();

    const firstRowCheckbox = modal.locator('tbody tr').first().locator('input[type=checkbox]');
    await expect(firstRowCheckbox).toBeChecked();
    await expect(modal.locator('small')).toContainText('1 zone selected');
  });

  test('removing a zone pill via × clears the filter', async ({ page }) => {
    await gotoSpawnEditor(page);

    await page.locator('.zone-filter-add-btn').click();
    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    await modal.locator('tbody tr').nth(0).click();
    await modal.locator('tbody tr').nth(1).click();
    await modal.locator('button:has-text("Add Selected")').click();
    await expect(page.locator('.zone-filter-pill')).toHaveCount(2);

    await page.locator('.zone-filter-pill').first().locator('.zone-filter-pill-remove').click();
    await expect(page.locator('.zone-filter-pill')).toHaveCount(1);
    await expect(page.locator('.zone-filter-add-btn')).toContainText('Add');

    await page.locator('.zone-filter-pill').first().locator('.zone-filter-pill-remove').click();
    await expect(page.locator('.zone-filter-pill')).toHaveCount(0);
    await expect(page.locator('.zone-filter-add-btn')).toContainText('All Zones');
  });

  test('zone filter modal can be cancelled without applying changes', async ({ page }) => {
    await gotoSpawnEditor(page);

    await page.locator('.zone-filter-add-btn').click();
    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    await modal.locator('tbody tr').first().click();

    await modal.locator('button:has-text("Cancel")').click();
    await expect(modal).not.toBeVisible();
    await expect(page.locator('.zone-filter-pill')).toHaveCount(0);
  });

  test('NPC search results meta shows zone names when filter is active', async ({ page }) => {
    await gotoSpawnEditor(page);

    await page.locator('.zone-filter-add-btn').click();
    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    await modal.locator('tbody tr').first().click();
    await modal.locator('button:has-text("Add Selected")').click();

    await page.locator('input[placeholder*="Search NPC"]').fill('Guard');
    await page.waitForTimeout(600);

    const meta = page.locator('.spawn-results-meta');
    await expect(meta).toBeVisible();
    await expect(meta).toContainText('qeynos');
  });

  test('zone filter without search term shows NPC results for selected zone', async ({ page }) => {
    await gotoSpawnEditor(page);

    // Apply qeynos zone filter (no search term)
    await page.locator('.zone-filter-add-btn').click();
    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    await modal.locator('tbody tr').first().click(); // qeynos is first
    await modal.locator('button:has-text("Add Selected")').click();
    await expect(modal).not.toBeVisible();

    // Zone filter pill should be visible
    await expect(page.locator('.zone-filter-pill').first()).toContainText('qeynos');

    // Without any search term, the NPC list should show results from the qeynos zone
    const npcItems = page.locator('.spawn-list-item');
    await expect(npcItems.first()).toBeVisible({ timeout: 5000 });

    // Both NPCs in the qeynos zone (Guard_Morgan #101, Guard_Hana #102) should appear
    await expect(npcItems).toHaveCount(2);

    // Results meta should reflect the total and active zone
    const meta = page.locator('.spawn-results-meta');
    await expect(meta).toBeVisible();
    await expect(meta).toContainText('qeynos');
    await expect(meta).toContainText('2 NPCs');
  });

  test('search term further filters zone filter results', async ({ page }) => {
    await gotoSpawnEditor(page);

    // Apply qeynos zone filter
    await page.locator('.zone-filter-add-btn').click();
    const modal = page.locator('#zone-filter-modal .eq-window-simple');
    await modal.locator('tbody tr').first().click();
    await modal.locator('button:has-text("Add Selected")').click();
    await expect(modal).not.toBeVisible();

    // Wait for zone-filtered results to load (2 NPCs: Guard_Morgan and Guard_Hana)
    await expect(page.locator('.spawn-list-item')).toHaveCount(2, { timeout: 5000 });

    // Now type a search term to further filter — 'Mammoth' is not in qeynos
    await page.locator('input[placeholder*="Search NPC"]').fill('Mammoth');
    await page.waitForTimeout(600);

    // Mammoth (id 201) is not in qeynos zone, so no results should be shown
    await expect(page.locator('.spawn-list-item')).toHaveCount(0);
  });

});

// ---------------------------------------------------------------------------
// Tests: save button pulse on pending changes
// ---------------------------------------------------------------------------

test.describe('Spawn Editor — Save Button Pulse', () => {

  async function loadNpcAndCard(page: Page) {
    await gotoSpawnEditor(page);

    await page.locator('input[placeholder*="Search NPC"]').fill('Guard');
    await page.waitForTimeout(500);

    const firstItem = page.locator('.spawn-list-item').first();
    await firstItem.waitFor({ state: 'visible', timeout: 10000 });
    await firstItem.click();

    await page.waitForSelector('.eq-window-simple .btn-outline-success', { timeout: 10000 });
  }

  test('save button has no pulse class when no changes are pending', async ({ page }) => {
    await loadNpcAndCard(page);

    const saveBtn = page.locator('.btn-outline-success').filter({ hasText: 'Save' }).first();
    await expect(saveBtn).not.toHaveClass(/save-btn-pulse/);
  });

  test('save button gains pulse class after editing a spawngroup field', async ({ page }) => {
    await loadNpcAndCard(page);

    // Cards start collapsed — expand the first card by clicking its header text
    await page.locator('.spawn-group-name-text').first().click();

    // Wait for the card body (Group Name input) to become visible
    await page.locator('label.field-label').filter({ hasText: 'Group Name' }).first()
      .waitFor({ state: 'visible', timeout: 5000 });

    // Edit the Group Name field — find it via its container label
    const nameContainer = page.locator('.col-4.mb-2')
      .filter({ has: page.locator('label.field-label').filter({ hasText: 'Group Name' }) })
      .first();
    await nameContainer.locator('input').fill('Modified Name');

    // Save button should now have the pulse class
    const saveBtn = page.locator('.btn-outline-success').filter({ hasText: 'Save' }).first();
    await expect(saveBtn).toHaveClass(/save-btn-pulse/);
  });

});

// ---------------------------------------------------------------------------
// Tests: new / cloned spawn group green indicator
// ---------------------------------------------------------------------------

test.describe('Spawn Editor — New Spawn Group Indicator', () => {

  test('create form is accessible via New button', async ({ page }) => {
    await mockApis(page);

    await page.goto('/spawns');
    await page.waitForSelector('.spawn-search-pane', { timeout: 20000 });

    const newBtn = page.locator('button').filter({ hasText: /New|Create/ }).first();
    await expect(newBtn).toBeVisible();
  });

});
