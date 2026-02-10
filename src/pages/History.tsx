import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Receipt, TrendingUp, Trash2, Edit2, X, Plus, Minus, AlertCircle, Check } from 'lucide-react';
import { getTodayTransactions, getTodayStats, getTransactionById, deleteTransaction, updateTransaction } from '../db/transactions';
import { getProductByBarcode } from '../db/products';
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithItems | null>(null);
  const [editItems, setEditItems] = useState<TransactionItem[]>([]);
  const [newBarcode, setNewBarcode] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Handle delete transaction
  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await deleteTransaction(deletingId);
      setTransactions((prev) => prev.filter((t) => t.id !== deletingId));
      setShowDeleteConfirm(false);
      setDeletingId(null);
      setSuccess('訂單已刪除');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh stats
      const todayStats = await getTodayStats();
      setStats(todayStats);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setError('刪除失敗，請重試');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Open edit modal
  const openEditModal = async (transaction: TransactionWithItems) => {
    let items = transaction.items;
    if (!items) {
      try {
        const fullTrans = await getTransactionById(transaction.id);
        if (fullTrans) {
          items = fullTrans.items;
          setTransactions((prev) =>
            prev.map((t) =>
              t.id === transaction.id ? { ...t, items: fullTrans.items } : t
            )
          );
        }
      } catch (error) {
        console.error('Failed to load transaction items:', error);
      }
    }

    if (items) {
      setEditingTransaction(transaction);
      setEditItems([...items]);
      setShowEditModal(true);
    }
  };

  // Update item quantity in edit mode
  const updateEditItemQuantity = (index: number, delta: number) => {
    setEditItems((prev) => {
      const newItems = [...prev];
      const newQuantity = newItems[index].quantity + delta;
      if (newQuantity <= 0) {
        // Remove item if quantity becomes 0 or less
        newItems.splice(index, 1);
      } else {
        newItems[index] = { ...newItems[index], quantity: newQuantity };
      }
      return newItems;
    });
  };

  // Add new item by barcode
  const addItemByBarcode = async () => {
    if (!newBarcode.trim()) return;

    try {
      const product = await getProductByBarcode(newBarcode.trim());
      if (!product) {
        setError('未找到該條碼的商品');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Check if item already exists
      const existingIndex = editItems.findIndex((item) => item.productId === product.id);
      if (existingIndex >= 0) {
        // Update existing item
        updateEditItemQuantity(existingIndex, 1);
      } else {
        // Add new item
        setEditItems((prev) => [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
          },
        ]);
      }
      setNewBarcode('');
      setSuccess('商品已加入');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to add item:', err);
      setError('添加商品失敗');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Save edited transaction
  const saveEdit = async () => {
    if (!editingTransaction || editItems.length === 0) return;

    setSaving(true);
    try {
      const total = editItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await updateTransaction({
        ...editingTransaction,
        items: editItems,
        total,
      });

      // Update local state
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTransaction.id
            ? { ...t, items: editItems, total }
            : t
        )
      );

      setShowEditModal(false);
      setEditingTransaction(null);
      setEditItems([]);
      setSuccess('訂單已更新');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh stats
      const todayStats = await getTodayStats();
      setStats(todayStats);
    } catch (err) {
      console.error('Failed to update transaction:', err);
      setError('更新失敗，請重試');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Calculate edit total
  const calculateEditTotal = () => {
    return editItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
        {/* Alerts */}
        {error && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg flex items-center gap-2 dark:bg-red-900/30 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 mb-4 text-green-700 bg-green-100 rounded-lg flex items-center gap-2 dark:bg-green-900/30 dark:text-green-300">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}

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

                      {/* Action buttons */}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(transaction);
                          }}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                        >
                          <Edit2 className="w-4 h-4" />
                          修改
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(transaction.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              確認刪除
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              確定要刪除此訂單嗎？刪除後將恢復商品庫存。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingId(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                修改訂單
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTransaction(null);
                  setEditItems([]);
                  setNewBarcode('');
                }}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Add item by barcode */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                掃描條碼新增商品
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addItemByBarcode();
                    }
                  }}
                  placeholder="輸入條碼..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <button
                  onClick={addItemByBarcode}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                商品明細
              </h3>
              {editItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  沒有商品，請掃描條碼新增
                </p>
              ) : (
                <div className="space-y-2">
                  {editItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-900"
                    >
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          ${formatPrice(item.price)} / 件
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateEditItemQuantity(index, -1)}
                          className="p-1 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateEditItemQuantity(index, 1)}
                          className="p-1 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          ${formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">
                  訂單總計
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  ${formatPrice(calculateEditTotal())}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTransaction(null);
                  setEditItems([]);
                  setNewBarcode('');
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                disabled={editItems.length === 0 || saving}
                className="flex-1 px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '儲存中...' : '儲存修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
