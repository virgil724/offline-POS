import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initDatabase } from './db';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductForm } from './pages/ProductForm';
import { VariantProductForm } from './pages/VariantProductForm';
import { BundleProductForm } from './pages/BundleProductForm';
import { BarcodeExport } from './pages/BarcodeExport';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import './index.css';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initDb = async () => {
      try {
        // Always call initDatabase() - it handles deduplication internally
        // and returns the same promise if already initializing
        await initDatabase();

        // Only update state if component is still mounted
        if (!cancelled) {
          setDbReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to initialize database:', error);
          setDbError('資料庫初始化失敗，請重新整理頁面重試');
        }
      }
    };

    initDb();

    // Cleanup to prevent state updates on unmounted component
    return () => {
      cancelled = true;
    };
  }, []);

  if (dbError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            出錯了
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{dbError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            重新整理頁面
          </button>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">正在初始化資料庫...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/new-variant" element={<VariantProductForm />} />
          <Route path="/products/new-bundle" element={<BundleProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/barcode-export" element={<BarcodeExport />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PWAInstallPrompt />
      </>
    </BrowserRouter>
  );
}

export default App;
