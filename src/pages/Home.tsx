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
  Banknote,
  CreditCard,
  X,
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
import { loadTwPayAccount, generateBankTransferQR } from '../utils/twpay';

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const processingBarcodeRef = useRef<string | null>(null);

  // Payment modals
  const [showCashModal, setShowCashModal] = useState(false);
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);

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
      setSuccess('交易完成！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('交易失敗，請重試');
      console.error(err);
    }
  };

  // Handle online payment completion
  const handleOnlinePaymentComplete = async () => {
    await handleCheckout();
    setShowOnlineModal(false);
    setQrCodeData(null);
  };

  // Handle online payment
  const handleOnlinePayment = async () => {
    const account = loadTwPayAccount();
    
    setShowOnlineModal(true);
    
    // If bank account is configured, generate QR code
    if (account && account.bankCode && account.accountNumber) {
      setGeneratingQR(true);
      try {
        const qrData = await generateBankTransferQR(account, getTotal());
        setQrCodeData(qrData);
      } catch (err) {
        console.error('QR generation failed:', err);
        // Continue without QR code
      } finally {
        setGeneratingQR(false);
      }
    }
  };

  // Handle cash payment completion
  const handleCashPayment = async () => {
    const received = parseInt(cashReceived, 10);
    const total = Math.round(getTotal() / 100);

    if (isNaN(received) || received < total) {
      setError('收款金額不足');
      setTimeout(() => setError(null), 2000);
      return;
    }

    await handleCheckout();
    setShowCashModal(false);
    setCashReceived('');
  };

  // Calculate change
  const calculateChange = () => {
    const received = parseInt(cashReceived, 10) || 0;
    const total = Math.round(getTotal() / 100);
    return Math.max(0, received - total);
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
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowCashModal(true)}
                      className="flex items-center justify-center gap-2 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <Banknote className="w-5 h-5" />
                      現金交易
                    </button>
                    <button
                      onClick={handleOnlinePayment}
                      className="flex items-center justify-center gap-2 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      <CreditCard className="w-5 h-5" />
                      線上支付
                    </button>
                  </div>
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

      {/* Cash Payment Modal */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                現金交易
              </h2>
              <button
                onClick={() => {
                  setShowCashModal(false);
                  setCashReceived('');
                }}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  應收金額
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  ${formatPrice(getTotal())}
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  實收金額
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="輸入收款金額"
                  min="0"
                  step="1"
                  className="w-full px-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  autoFocus
                />
              </div>

              {cashReceived && parseInt(cashReceived, 10) > 0 && (
                <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    找零金額
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    ${calculateChange()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCashModal(false);
                  setCashReceived('');
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleCashPayment}
                disabled={!cashReceived || parseInt(cashReceived, 10) < Math.round(getTotal() / 100)}
                className="flex-1 px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                完成收款
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Payment Modal */}
      {showOnlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                線上支付
              </h2>
              <button
                onClick={() => {
                  setShowOnlineModal(false);
                  setQrCodeData(null);
                }}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 text-center">
              <div className="mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  應付金額
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  ${formatPrice(getTotal())}
                </div>
              </div>

              {generatingQR ? (
                <div className="py-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    產生 QR 碼中...
                  </p>
                </div>
              ) : qrCodeData ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img
                      src={qrCodeData}
                      alt="Payment QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    請掃描 QR 碼進行轉帳
                  </p>
                  <button
                    onClick={handleOnlinePaymentComplete}
                    className="w-full px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    確認已收款
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 py-4">
                    顧客完成線上支付後，點擊確認
                  </p>
                  <button
                    onClick={handleOnlinePaymentComplete}
                    className="w-full px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    確認已收款
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowOnlineModal(false);
                setQrCodeData(null);
              }}
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
