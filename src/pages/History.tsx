import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Receipt, TrendingUp } from 'lucide-react';
import { getTodayTransactions, getTodayStats, getTransactionById } from '../db/transactions';
import type { Transaction, TransactionItem } from '../types';
import { formatPrice, formatDate } from '../utils/barcode';

interface TransactionWithItems extends Transaction {
  items?: TransactionItem[];
}

export function History() {
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [stats, setStats] = useState({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const todayTrans = await getTodayTransactions();
      const todayStats = await getTodayStats();
      setTransactions(todayTrans);
      setStats(todayStats);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Load items if not already loaded
      const transaction = transactions.find((t) => t.id === id);
      if (transaction && !transaction.items) {
        try {
          const fullTrans = await getTransactionById(id);
          if (fullTrans) {
            setTransactions((prev) =>
              prev.map((t) =>
                t.id === id ? { ...t, items: fullTrans.items } : t
              )
            );
          }
        } catch (error) {
          console.error('Failed to load transaction items:', error);
        }
      }
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
            <Receipt className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              交易記錄
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto">
        {/* Today's stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-400">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">今日營收</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              ${formatPrice(stats.total)}
            </p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-400">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">今日訂單</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.count}</p>
          </div>
        </div>

        {/* Transactions list */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            今日交易 ({transactions.length})
          </h2>

          {loading ? (
            <div className="py-12 text-center text-gray-500">載入中...</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              今日暫無交易記錄
            </div>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(transaction.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        訂單號: {transaction.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        ${formatPrice(transaction.total)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.items ? `${transaction.items.length} 件商品` : '點擊檢視詳情'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === transaction.id && transaction.items && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        商品明細
                      </h4>
                      <div className="space-y-2">
                        {transaction.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <div className="flex-grow">
                              <span className="text-gray-900 dark:text-white">
                                {item.name}
                              </span>
                              <span className="text-gray-500 ml-2">
                                x{item.quantity}
                              </span>
                            </div>
                            <span className="text-gray-600 dark:text-gray-400">
                              ${formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between font-medium">
                        <span className="text-gray-700 dark:text-gray-300">
                          合計
                        </span>
                        <span className="text-blue-600">
                          ${formatPrice(transaction.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
