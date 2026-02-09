// Database interface using Web Worker for OPFS support
// OPFS requires Worker thread because it needs Atomics.wait()

let worker: Worker | null = null;
let messageId = 0;
const pendingMessages = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
let initPromise: Promise<void> | null = null;

// Initialize database via Worker
export async function initDatabase(): Promise<void> {
  if (initPromise) return initPromise;
  if (worker) return Promise.resolve();

  initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create worker
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = (event) => {
        const { id, success, result, error } = event.data;

        // Handle initialization completion (init uses id = 1 as first message)
        if (id === 1 && success) {
          console.log('Database worker initialized with OPFS');
          resolve();
          return;
        }

        // Handle other responses
        const pending = pendingMessages.get(id);
        if (pending) {
          pendingMessages.delete(id);
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error));
          }
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        reject(error);
      };

      // Initialize database in worker
      sendMessage('init', {});
    } catch (error) {
      reject(error);
    }
  });
}

// Send message to worker and wait for response
function sendMessage(type: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('Worker not initialized'));
      return;
    }

    messageId++;
    pendingMessages.set(messageId, { resolve, reject });
    worker.postMessage({ id: messageId, type, payload });
  });
}

// Check if database is initialized
export function isDatabaseInitialized(): boolean {
  return worker !== null;
}

// Execute SQL
export function exec(options: { sql: string; bind?: any[] }): void {
  if (!worker) throw new Error('Database not initialized');
  sendMessage('exec', options);
}

// Select multiple rows as objects
export function selectObjects(sql: string, bind?: any[]): Promise<any[]> {
  if (!worker) throw new Error('Database not initialized');
  return sendMessage('selectObjects', { sql, bind });
}

// Select single row as object
export function selectObject(sql: string, bind?: any[]): Promise<any | undefined> {
  if (!worker) throw new Error('Database not initialized');
  return sendMessage('selectObject', { sql, bind });
}

// Select single value
export function selectValue(sql: string, bind?: any[]): Promise<any> {
  if (!worker) throw new Error('Database not initialized');
  return sendMessage('selectValue', { sql, bind });
}

// Export database
export function exportDb(): Promise<Uint8Array> {
  if (!worker) throw new Error('Database not initialized');
  return sendMessage('export', {});
}

// Import database
export function importDb(data: Uint8Array): Promise<void> {
  if (!worker) throw new Error('Database not initialized');
  return sendMessage('import', data);
}

// Close database
export function closeDatabase(): void {
  if (worker) {
    sendMessage('close', {});
    worker.terminate();
    worker = null;
    initPromise = null;
    pendingMessages.clear();
  }
}

// Get database instance (for compatibility, returns a proxy)
export function getDatabase(): any {
  if (!worker) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  // Return a proxy object that matches the Database interface
  return {
    exec: (options: { sql: string; bind?: any[] }) => exec(options),
    selectObjects: (sql: string, bind?: any[]) => selectObjects(sql, bind),
    selectObject: (sql: string, bind?: any[]) => selectObject(sql, bind),
    selectValue: (sql: string, bind?: any[]) => selectValue(sql, bind),
    close: () => closeDatabase(),
  };
}
