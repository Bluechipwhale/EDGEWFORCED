import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryService } from '../services/inventoryService.js';
import { db } from '../config/database.js';

test('Inventory starts empty and reads never recreate deleted stock', async () => {
  db.resetToSeed();
  assert.deepEqual(await inventoryService.getProducts(1), []);
  assert.deepEqual(await inventoryService.getWarehouses(1), []);
  assert.deepEqual(await inventoryService.getInventorySummary(1), {
    totalSKUs: 0, totalQuantity: 0, totalValuation: 0, lowStockCount: 0
  });
  const product = await inventoryService.createProduct({
    name: 'Test chair', sku: 'TEST-CHAIR', price: 10, stock_quantity: 3,
    location_of_item: 'Test warehouse', shelf_number: 'T-01', condition: 'damaged', quantity_display: '3 pcs'
  }, { id: 1, company_id: 1 });
  assert.equal((await inventoryService.getProducts(1, { search: 'T-01' }))[0].id, product.id);
  assert.equal((await inventoryService.getProducts(1, { location: 'Test warehouse' }))[0].quantity_display, '3 pcs');
  assert.deepEqual(await inventoryService.getProducts(2), []);
  assert.equal((await inventoryService.getInventorySummary(1)).totalQuantity, 3);
  await db.delete('products', product.id);
  assert.deepEqual(await inventoryService.getProducts(1), []);
  assert.equal((await inventoryService.getInventorySummary(1)).totalSKUs, 0);
  assert.deepEqual(await inventoryService.getProducts(1), []);
});
