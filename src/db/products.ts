import { exec, selectObject, selectObjects, selectValue } from './index';
import type { Product } from '../types';

// Create a new product
export async function createProduct(product: Product): Promise<void> {
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
}

// Update a product
export async function updateProduct(product: Product): Promise<void> {
  await exec({
    sql: `
      UPDATE products
      SET name = ?, price = ?, stock = ?, barcode = ?, image = ?, updatedAt = ?
      WHERE id = ?
    `,
    bind: [
      product.name,
      product.price,
      product.stock,
      product.barcode,
      product.image || null,
      product.updatedAt,
      product.id,
    ],
  });
}

// Delete a product
export async function deleteProduct(id: string): Promise<void> {
  await exec({
    sql: 'DELETE FROM products WHERE id = ?',
    bind: [id],
  });
}

// Get a product by ID
export async function getProductById(id: string): Promise<Product | null> {
  const result = await selectObject('SELECT * FROM products WHERE id = ?', [id]);
  return (result as unknown as Product) || null;
}

// Get a product by barcode
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const result = await selectObject('SELECT * FROM products WHERE barcode = ?', [barcode]);
  return (result as unknown as Product) || null;
}

// Get all products with pagination
export async function getProducts(page: number = 1, pageSize: number = 20): Promise<Product[]> {
  const offset = (page - 1) * pageSize;
  const results = await selectObjects(
    `
      SELECT * FROM products
      ORDER BY updatedAt DESC
      LIMIT ? OFFSET ?
    `,
    [pageSize, offset]
  );
  return results as unknown as Product[];
}

// Search products by name
export async function searchProducts(query: string, limit: number = 20): Promise<Product[]> {
  const results = await selectObjects(
    `
      SELECT * FROM products
      WHERE name LIKE ?
      ORDER BY name ASC
      LIMIT ?
    `,
    [`%${query}%`, limit]
  );
  return results as unknown as Product[];
}

// Get total product count
export async function getProductCount(): Promise<number> {
  const result = await selectValue('SELECT COUNT(*) as count FROM products');
  return Number(result) || 0;
}

// Check if barcode exists
export async function barcodeExists(barcode: string, excludeId?: string): Promise<boolean> {
  if (excludeId) {
    const result = await selectValue(
      'SELECT COUNT(*) as count FROM products WHERE barcode = ? AND id != ?',
      [barcode, excludeId]
    );
    return Number(result) > 0;
  } else {
    const result = await selectValue(
      'SELECT COUNT(*) as count FROM products WHERE barcode = ?',
      [barcode]
    );
    return Number(result) > 0;
  }
}

// Update product stock
export async function updateStock(productId: string, quantity: number): Promise<void> {
  await exec({
    sql: `
      UPDATE products
      SET stock = stock + ?, updatedAt = ?
      WHERE id = ?
    `,
    bind: [quantity, new Date().toISOString(), productId],
  });
}
