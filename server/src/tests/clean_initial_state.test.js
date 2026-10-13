import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

test('Empty accounts, staff and inventory survive process restarts and cannot be reimported implicitly', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edgewforce-clean-test-'));
  const databaseUrl = new URL('../config/database.js', import.meta.url).href;
  const inventoryUrl = new URL('../services/inventoryService.js', import.meta.url).href;
  const staffUrl = new URL('../services/staffImportService.js', import.meta.url).href;
  const code = `
    import assert from 'node:assert/strict';
    const { db } = await import(${JSON.stringify(databaseUrl)});
    const { inventoryService } = await import(${JSON.stringify(inventoryUrl)});
    const { staffImportService } = await import(${JSON.stringify(staffUrl)});
    for (const table of ['users', 'employees', 'schedules', 'products']) assert.deepEqual(await db.find(table), []);
    assert.deepEqual(await inventoryService.getProducts(1), []);
    assert.deepEqual(await inventoryService.getWarehouses(1), []);
    assert.equal((await inventoryService.getInventorySummary(1)).totalSKUs, 0);
    assert.equal((await staffImportService.importAuthoritativeStaff()).processed, 0);
    assert.deepEqual(await db.find('employees'), []);
  `;
  try {
    const env = { ...process.env, NODE_ENV: 'test', EDGEWFORCE_DATA_DIR: dataDir };
    execFileSync(process.execPath, ['--input-type=module', '--eval', code], { env });
    const storePath = path.join(dataDir, 'store.json');
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    for (const table of ['users', 'employees', 'schedules', 'products']) assert.deepEqual(store[table], []);
    execFileSync(process.execPath, ['--input-type=module', '--eval', code], { env });
  } finally {
    assert.equal(path.dirname(path.resolve(dataDir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dataDir).startsWith('edgewforce-clean-test-'));
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
