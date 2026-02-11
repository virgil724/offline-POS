// Bundle product operations with linked inventory
import { exec, selectObjects, selectValue } from './index';
import type { Product } from '../types';

// Bundle item interface
export interface BundleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock?: number; // 用於前端顯示原始庫存
}

// Create a bundle product with linked items
export async function createBundleProduct(
  product: Product,
  items: BundleItem[]
): Promise<void> {
  // Insert the bundle product
  await exec({
    sql: `
      INSERT INTO products (id, name, price, stock, barcode, image, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    bind: [
      product.id,
      product.name,
      product.price,
      product.stock,
      product.barcode,
      product.image || null,
      product.createdAt,
      product.updatedAt,
    ],
  });

  // Insert bundle items
  for (const item of items) {
    await exec({
      sql: `
        INSERT INTO bundle_items (bundleId, productId, quantity)
        VALUES (?, ?, ?)
      `,
      bind: [product.id, item.productId, item.quantity],
    });
  }
}

// Get bundle items for a product
export async function getBundleItems(bundleId: string): Promise<BundleItem[]> {
  const results = await selectObjects(
    `
      SELECT bi.productId, p.name, p.price, bi.quantity
      FROM bundle_items bi
      JOIN products p ON bi.productId = p.id
      WHERE bi.bundleId = ?
    `,
    [bundleId]
  );
  return results as unknown as BundleItem[];
}

// Check if a product is a bundle
export async function isBundleProduct(productId: string): Promise<boolean> {
  const result = await selectValue(
    'SELECT COUNT(*) as count FROM bundle_items WHERE bundleId = ?',
    [productId]
  );
  return Number(result) > 0;
}

// Calculate available bundle quantity based on component stock
export async function calculateBundleStock(bundleId: string): Promise<number> {
  const results = await selectObjects(
    `
      SELECT 
        p.stock as available,
        bi.quantity as needed
      FROM bundle_items bi
      JOIN products p ON bi.productId = p.id
      WHERE bi.bundleId = ?
    `,
    [bundleId]
  );

  if (!results || results.length === 0) return 0;

  // Calculate how many bundles can be made
  let minBundles = Infinity;
  for (const row of results) {
    const available = Number(row.available);
    const needed = Number(row.needed);
    if (needed <= 0) continue;
    const possible = Math.floor(available / needed);
    if (possible < minBundles) {
      minBundles = possible;
    }
  }

  return minBundles === Infinity ? 0 : minBundles;
}

// Update bundle stock based on component changes
export async function updateBundleStockFromComponents(bundleId: string): Promise<void> {
  const newStock = await calculateBundleStock(bundleId);
  await exec({
    sql: `
      UPDATE products
      SET stock = ?, updatedAt = ?
      WHERE id = ?
    `,
    bind: [newStock, new Date().toISOString(), bundleId],
  });
}

// Delete a bundle product and its items
export async function deleteBundleProduct(bundleId: string): Promise<void> {
  // Delete bundle items first (CASCADE will handle this, but explicit is safer)
  await exec({
    sql: 'DELETE FROM bundle_items WHERE bundleId = ?',
    bind: [bundleId],
  });

  // Delete the product
  await exec({
    sql: 'DELETE FROM products WHERE id = ?',
    bind: [bundleId],
  });
}

// Get all bundles that contain a specific product
export async function getBundlesContainingProduct(productId: string): Promise<string[]> {
  const results = await selectObjects(
    'SELECT bundleId FROM bundle_items WHERE productId = ?',
    [productId]
  ) as { bundleId: string }[];
  return results.map((r) => r.bundleId);
}

// Update all bundle stocks when a component's stock changes
export async function updateAllBundleStocks(productId: string): Promise<void> {
  const bundleIds = await getBundlesContainingProduct(productId);
  for (const bundleId of bundleIds) {
    await updateBundleStockFromComponents(bundleId);
  }
}
