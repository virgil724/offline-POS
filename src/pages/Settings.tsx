import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Download,
  Upload,
  Database,
  AlertTriangle,
  Check,
  CreditCard,
} from 'lucide-react';
import { exportDb, importDb } from '../db';
import type { TwPayAccount } from '../utils/twpay';
import { loadTwPayAccount, saveTwPayAccount, BANK_NAMES } from '../utils/twpay';

export function Settings() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Payment settings
  const [twPayAccount, setTwPayAccount] = useState<TwPayAccount>({
    bankCode: '',
    accountNumber: '',
    accountName: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Load saved account on mount
  useEffect(() => {
    const saved = loadTwPayAccount();
    if (saved) {
      setTwPayAccount(saved);
    }
  }, []);

  // Save payment settings
  const handleSavePayment = () => {
    setSavingPayment(true);
    try {
      saveTwPayAccount(twPayAccount);
      setMessage({ type: 'success', text: '支付設定已儲存！' });
    } catch (error) {
      setMessage({ type: 'error', text: '儲存失敗，請重試' });
    } finally {
      setSavingPayment(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Export database file
  const handleExport = async () => {
    try {
      setExporting(true);
      setMessage(null);

      // Export from SQLite via Worker
      const data = await exportDb();
      const blob = new Blob([data as unknown as BlobPart], { type: 'application/x-sqlite3' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offline-pos-backup-${new Date().toISOString().slice(0, 10)}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: '資料匯出成功！' });
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: '匯出失敗: ' + (error as Error).message });
    } finally {
      setExporting(false);
    }
  };

  // Import database file
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setMessage(null);

      // Validate file type
      if (!file.name.endsWith('.db')) {
        throw new Error('請選擇 .db 格式的資料庫檔案');
      }

      // Read file content
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // Import to SQLite via Worker
      await importDb(data);

      setMessage({
        type: 'success',
        text: '資料匯入成功！請重新整理頁面以使用新資料。',
      });

      // Clear file input
      e.target.value = '';
    } catch (error) {
      console.error('Import failed:', error);
      setMessage({ type: 'error', text: '匯入失敗: ' + (error as Error).message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3 px-4 py-3 max-w-4xl mx-auto">
          <Link
            to="/"
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">設定</h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300'
                : 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Data Management */}
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">資料管理</h2>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg dark:bg-gray-900">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">匯出資料</h3>
                <p className="text-sm text-gray-500">下載資料庫檔案作為備份</p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {exporting ? '匯出中...' : '匯出'}
              </button>
            </div>

            {/* Import */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg dark:bg-gray-900">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">匯入資料</h3>
                <p className="text-sm text-gray-500">從備份檔案恢復資料</p>
              </div>
              <label className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-50">
                <Upload className="w-4 h-4" />
                <span>{importing ? '匯入中...' : '匯入'}</span>
                <input
                  type="file"
                  accept=".db"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Payment Settings */}
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">支付設定</h2>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              設定線上支付帳號，顧客可掃描 QR 碼進行轉帳付款
            </p>

            {/* Bank Code */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                銀行代碼
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={twPayAccount.bankCode}
                  onChange={(e) =>
                    setTwPayAccount((prev) => ({
                      ...prev,
                      bankCode: e.target.value.replace(/\D/g, '').slice(0, 3),
                    }))
                  }
                  placeholder="例如：013"
                  maxLength={3}
                  className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <div className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">
                  {BANK_NAMES[twPayAccount.bankCode] || '請輸入銀行代碼'}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                請輸入 3 位數銀行代碼（如：013 為國泰世華）
              </p>
            </div>

            {/* Account Number */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                銀行帳號
              </label>
              <input
                type="text"
                value={twPayAccount.accountNumber}
                onChange={(e) =>
                  setTwPayAccount((prev) => ({
                    ...prev,
                    accountNumber: e.target.value,
                  }))
                }
                placeholder="請輸入銀行帳號"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            {/* Account Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                戶名
              </label>
              <input
                type="text"
                value={twPayAccount.accountName}
                onChange={(e) =>
                  setTwPayAccount((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }))
                }
                placeholder="請輸入帳戶名稱"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSavePayment}
              disabled={savingPayment}
              className="w-full px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingPayment ? '儲存中...' : '儲存支付設定'}
            </button>
          </div>
        </section>

        {/* Warning */}
        <div className="p-4 text-yellow-800 bg-yellow-100 rounded-lg dark:bg-yellow-900/30 dark:text-yellow-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">注意事項</h3>
              <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                <li>匯入資料將覆蓋目前所有資料，請謹慎操作</li>
                <li>建議定期匯出備份，以防資料遺失</li>
                <li>資料檔案格式為 SQLite .db 檔案</li>
                <li>部分瀏覽器（如 iOS Safari）可能限制檔案操作</li>
              </ul>
            </div>
          </div>
        </div>

        {/* About */}
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">關於</h2>
          </div>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-white">離線零售 POS 系統</h3>
            <p className="mt-1 text-sm text-gray-500">版本: MVP 1.0</p>
            <p className="text-sm text-gray-500">技術堆疊: React + TypeScript + SQLite WASM + PWA</p>
            <p className="mt-2 text-sm text-gray-500">
              純前端實作，資料儲存在瀏覽器本地，支援離線使用。
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
