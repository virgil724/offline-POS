import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  History,
  Settings,
  Search,
  Camera,
  ShoppingCart,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useProductStore } from '../stores/productStore';
import { getProductByBarcode } from '../db/products';
import { createTransaction } from '../db/transactions';
import { CartItem } from '../components/CartItem';
import { ProductCard } from '../components/ProductCard';
import { BarcodeScanner } from '../components/BarcodeScanner';
import type { Transaction, TransactionItem } from '../types';
import { generateUUID, formatPrice } from '../utils/barcode';

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const processingBarcodeRef = useRef<string | null>(null);

  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
  } = useCartStore();

  // Wrapper for updateQuantity with feedback
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    const result = updateQuantity(productId, quantity);
    if (result.success) {
      if (result.limited) {
        setError(result.message);
        setTimeout(() => setError(null), 2000);
      }
      // Don't show success for normal updates to avoid too many messages
    }
  };

  const { products, loading, searchProducts } = useProductStore();

  // Handle search - show all products when no search query
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery.trim()) {
        searchProducts(searchQuery);
      } else {
        // Load all products when no search query
        searchProducts('');
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    // Prevent duplicate scans within 2 seconds
    if (processingBarcodeRef.current === barcode) {
      return;
    }
    processingBarcodeRef.current = barcode;

    // Clear the processing flag after 2 seconds
    setTimeout(() => {
      processingBarcodeRef.current = null;
    }, 2000);

    const product = await getProductByBarcode(barcode);
    if (product) {
      const result = useCartStore.getState().addToCart(product);
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 2000);
    } else {
      setError('未找到該條碼的商品');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (items.length === 0) return;

    try {
      const transactionItems: TransactionItem[] = items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      const transaction: Transaction = {
        id: generateUUID(),
        items: transactionItems,
        total: getTotal(),
        createdAt: new Date().toISOString(),
      };

      await createTransaction(transaction);
      clearCart();
      setShowCheckout(false);
      setSuccess('交易完成！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('交易失敗，請重試');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              銷售開單
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/products"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-400 dark:hover:bg-gray-700"
              title="商品管理"
            >
              <Package className="w-5 h-5" />
            </Link>
            <Link
              to="/history"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-400 dark:hover:bg-gray-700"
              title="交易記錄"
            >
              <History className="w-5 h-5" />
            </Link>
            <Link
              to="/settings"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-400 dark:hover:bg-gray-700"
              title="設定"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-4xl mx-auto">
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

        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋商品名稱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Camera className="w-5 h-5" />
            <span className="hidden sm:inline">掃描</span>
          </button>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column - Product search results */}
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {searchQuery ? `搜尋結果 (${products.length})` : '點擊掃描或搜尋新增商品'}
            </h2>

            {loading ? (
              <div className="py-8 text-center text-gray-500">載入中...</div>
            ) : searchQuery ? (
              products.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  未找到匹配的商品
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => {
                        const result = useCartStore.getState().addToCart(product);
                        if (result.success) {
                          setSuccess(result.message);
                        } else {
                          setError(result.message);
                        }
                        setTimeout(() => {
                          setSuccess(null);
                          setError(null);
                        }, 2000);
                      }}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="py-12 text-center text-gray-400">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>掃描條碼或搜尋商品名稱<br/>新增到購物車</p>
              </div>
            )}
          </div>

          {/* Right column - Cart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                購物車 ({getItemCount()})
              </h2>
              {items.length > 0 && (
                <button
                  onClick={() => clearCart()}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  清空
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg dark:border-gray-700">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>購物車是空的</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {items.map((item) => (
                    <CartItem
                      key={item.product.id}
                      item={item}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>

                {/* Cart total */}
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      合計
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${formatPrice(getTotal())}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    完成交易
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Checkout Confirmation Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              確認交易
            </h2>
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>商品數量</span>
                <span>{getItemCount()} 件</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900 dark:text-white">總計金額</span>
                <span className="text-blue-600">${formatPrice(getTotal())}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
