import { exec, selectObject, selectObjects, selectValue } from './index';
import type { Transaction, TransactionItem } from '../types';
import { updateStock } from './products';

// Create a new transaction with items (within a database transaction)
export async function createTransaction(transaction: Transaction): Promise<void> {
  await exec({ sql: 'BEGIN TRANSACTION' });

  try {
    // Insert transaction
    await exec({
      sql: `
        INSERT INTO transactions (id, total, originalTotal, discountAmount, discountLabel, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      bind: [
        transaction.id,
        transaction.total,
        transaction.originalTotal ?? null,
        transaction.discountAmount ?? null,
        transaction.discountLabel ?? null,
        transaction.createdAt,
      ],
    });

    // Insert transaction items and update stock
    for (const item of transaction.items || []) {
      await exec({
        sql: `
          INSERT INTO transaction_items (transactionId, productId, name, price, quantity)
          VALUES (?, ?, ?, ?, ?)
        `,
        bind: [
          transaction.id,
          item.productId,
          item.name,
          item.price,
          item.quantity,
        ],
      });

      // Update stock (handles both regular products and bundles)
      await updateStock(item.productId, -item.quantity);
    }

    // Commit the transaction
    await exec({ sql: 'COMMIT' });
  } catch (error) {
    // Rollback on error
    await exec({ sql: 'ROLLBACK' });
    throw error;
  }
}

// Get a transaction by ID with items
export async function getTransactionById(id: string): Promise<(Transaction & { items: TransactionItem[] }) | null> {
  // Get transaction
  const transaction = await selectObject(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  ) as unknown as Transaction | undefined;

  if (!transaction) return null;

  // Get items
  const items = await selectObjects(
    'SELECT * FROM transaction_items WHERE transactionId = ?',
    [id]
  ) as unknown as TransactionItem[];

  return { ...transaction, items };
}

// Get transactions with pagination
export async function getTransactions(page: number = 1, pageSize: number = 20): Promise<Transaction[]> {
  const offset = (page - 1) * pageSize;
  const results = await selectObjects(
    `
      SELECT * FROM transactions
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `,
    [pageSize, offset]
  );

  return results as unknown as Transaction[];
}

// Get today's transactions
export async function getTodayTransactions(): Promise<Transaction[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const results = await selectObjects(
    `
      SELECT * FROM transactions
      WHERE createdAt >= ?
      ORDER BY createdAt DESC
    `,
    [todayStr]
  );

  return results as unknown as Transaction[];
}

// Get today's statistics
export async function getTodayStats(): Promise<{ total: number; count: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const total = Number(await selectValue(
    `
      SELECT COALESCE(SUM(total), 0) as total
      FROM transactions
      WHERE createdAt >= ?
    `,
    [todayStr]
  )) || 0;

  const count = Number(await selectValue(
    `
      SELECT COUNT(*) as count
      FROM transactions
      WHERE createdAt >= ?
    `,
    [todayStr]
  )) || 0;

  return { total, count };
}

// Get total transaction count
export async function getTransactionCount(): Promise<number> {
  const result = await selectValue('SELECT COUNT(*) as count FROM transactions');
  return Number(result) || 0;
}

// Delete a transaction and restore stock
export async function deleteTransaction(id: string): Promise<void> {
  await exec({ sql: 'BEGIN TRANSACTION' });

  try {
    // Get transaction items to restore stock
    const items = await selectObjects(
      'SELECT * FROM transaction_items WHERE transactionId = ?',
      [id]
    ) as unknown as TransactionItem[];

    // Restore stock for each item
    for (const item of items) {
      await updateStock(item.productId, item.quantity);
    }

    // Delete transaction items
    await exec({
      sql: 'DELETE FROM transaction_items WHERE transactionId = ?',
      bind: [id],
    });

    // Delete transaction
    await exec({
      sql: 'DELETE FROM transactions WHERE id = ?',
      bind: [id],
    });

    await exec({ sql: 'COMMIT' });
  } catch (error) {
    await exec({ sql: 'ROLLBACK' });
    throw error;
  }
}

// Update a transaction (delete old items and create new ones)
export async function updateTransaction(transaction: Transaction): Promise<void> {
  await exec({ sql: 'BEGIN TRANSACTION' });

  try {
    // Get old items to restore stock
    const oldItems = await selectObjects(
      'SELECT * FROM transaction_items WHERE transactionId = ?',
      [transaction.id]
    ) as unknown as TransactionItem[];

    // Restore stock for old items
    for (const item of oldItems) {
      await updateStock(item.productId, item.quantity);
    }

    // Delete old transaction items
    await exec({
      sql: 'DELETE FROM transaction_items WHERE transactionId = ?',
      bind: [transaction.id],
    });

    // Update transaction total, discount and timestamp
    await exec({
      sql: `
        UPDATE transactions
        SET total = ?, originalTotal = ?, discountAmount = ?, discountLabel = ?, createdAt = ?
        WHERE id = ?
      `,
      bind: [
        transaction.total,
        transaction.originalTotal ?? null,
        transaction.discountAmount ?? null,
        transaction.discountLabel ?? null,
        transaction.createdAt,
        transaction.id,
      ],
    });

    // Insert new transaction items and update stock
    for (const item of transaction.items || []) {
      await exec({
        sql: `
          INSERT INTO transaction_items (transactionId, productId, name, price, quantity)
          VALUES (?, ?, ?, ?, ?)
        `,
        bind: [
          transaction.id,
          item.productId,
          item.name,
          item.price,
          item.quantity,
        ],
      });

      // Update stock
      await updateStock(item.productId, -item.quantity);
    }

    await exec({ sql: 'COMMIT' });
  } catch (error) {
    await exec({ sql: 'ROLLBACK' });
    throw error;
  }
}
