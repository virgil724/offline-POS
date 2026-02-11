// SQLite Worker for OPFS persistence
// This worker runs in a separate thread where Atomics.wait() is available

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;
let sqlite3: any = null;

// Message types
interface WorkerRequest {
  id: number;
  type: 'init' | 'exec' | 'selectObjects' | 'selectObject' | 'selectValue' | 'close' | 'export' | 'import';
  payload: any;
}

interface WorkerResponse {
  id: number;
  success: boolean;
  result?: any;
  error?: string;
}

// Send response back to main thread
function respond(id: number, success: boolean, result?: any, error?: string) {
  self.postMessage({ id, success, result, error } as WorkerResponse);
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'init':
        await initDatabase();
        respond(id, true, { success: true });
        break;

      case 'exec':
        if (!db) throw new Error('Database not initialized');
        if (typeof payload === 'string') {
          db.exec(payload);
        } else {
          db.exec(payload);
        }
        respond(id, true, { success: true });
        break;

      case 'selectObjects':
        if (!db) throw new Error('Database not initialized');
        const { sql: selectSql, bind: selectBind } = payload;
        const rows = db.selectObjects(selectSql, selectBind);
        respond(id, true, rows);
        break;

      case 'selectObject':
        if (!db) throw new Error('Database not initialized');
        const { sql: objSql, bind: objBind } = payload;
        const obj = db.selectObject(objSql, objBind);
        respond(id, true, obj);
        break;

      case 'selectValue':
        if (!db) throw new Error('Database not initialized');
        const { sql: valSql, bind: valBind } = payload;
        const val = db.selectValue(valSql, valBind);
        respond(id, true, val);
        break;

      case 'export':
        if (!db) throw new Error('Database not initialized');
        // Serialize database to Uint8Array using C API
        const pOutSize = sqlite3.wasm.alloc(4);
        try {
          const pData = sqlite3.capi.sqlite3_serialize(db.pointer, 'main', pOutSize, 0);
          if (!pData) throw new Error('Failed to serialize database');
          const outSize = sqlite3.wasm.getMemValue(pOutSize, 'i32');
          const exported = new Uint8Array(sqlite3.wasm.memory.buffer, pData, outSize).slice();
          sqlite3.capi.sqlite3_free(pData);
          respond(id, true, exported);
        } finally {
          sqlite3.wasm.dealloc(pOutSize);
        }
        break;

      case 'import':
        if (!db) throw new Error('Database not initialized');
        // Deserialize database from Uint8Array using C API
        const data = payload as Uint8Array;
        const pData = sqlite3.wasm.allocFromTypedArray(data);
        try {
          const rc = sqlite3.capi.sqlite3_deserialize(db.pointer, 'main', pData, data.length, data.length, 0);
          if (rc !== 0) throw new Error(`Failed to deserialize database: ${rc}`);
          respond(id, true, { success: true });
        } finally {
          sqlite3.wasm.dealloc(pData);
        }
        break;

      case 'close':
        if (db) {
          db.close();
          db = null;
        }
        respond(id, true, { success: true });
        break;

      default:
        respond(id, false, undefined, `Unknown message type: ${type}`);
    }
  } catch (error) {
    respond(id, false, undefined, String(error));
  }
};

// Initialize database with OPFS
async function initDatabase() {
  if (db) return;

  console.log('[Worker] Loading SQLite3 module...');
  sqlite3 = await sqlite3InitModule();
  console.log('[Worker] SQLite3 loaded, version:', sqlite3.version.libVersion);

  const vfsList = sqlite3.capi.sqlite3_js_vfs_list();
  console.log('[Worker] Available VFS:', vfsList);

  // Try OPFS first
  if (vfsList.includes('opfs')) {
    console.log('[Worker] Using OPFS VFS');
    try {
      db = new sqlite3.oo1.OpfsDb('/offline-pos.db', 'c');
      console.log('[Worker] Database opened with OPFS');
    } catch (e) {
      console.warn('[Worker] Failed to open OPFS:', e);
    }
  }

  // Fall back to kvvfs
  if (!db && vfsList.includes('kvvfs')) {
    console.log('[Worker] Using kvvfs');
    db = new sqlite3.oo1.JsStorageDb('local');
    console.log('[Worker] Database opened with kvvfs');
  }

  // Last resort - memory
  if (!db) {
    console.warn('[Worker] Using in-memory database');
    db = new sqlite3.oo1.DB(':memory:');
  }

  // Initialize schema
  initSchema();
  console.log('[Worker] Database initialized');
}

function initSchema() {
  if (!db) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      barcode TEXT UNIQUE NOT NULL,
      image TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      total INTEGER NOT NULL,
      originalTotal INTEGER,
      discountAmount INTEGER,
      discountLabel TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transactionId TEXT NOT NULL,
      productId TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transaction_items_transactionId ON transaction_items(transactionId);
  `);

  // 組合商品項目表（連動庫存）
  db.exec(`
    CREATE TABLE IF NOT EXISTS bundle_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundleId TEXT NOT NULL,
      productId TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (bundleId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bundle_items_bundleId ON bundle_items(bundleId);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bundle_items_productId ON bundle_items(productId);
  `);
}
