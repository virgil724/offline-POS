import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Package, Search, Sparkles, X } from 'lucide-react';
import { useProductStore, MAX_PRODUCTS } from '../stores/productStore';
import { barcodeExists, searchProducts } from '../db/products';
import { generateBarcode, formatPrice, parsePrice } from '../utils/barcode';
import { generateBundleProduct, calculateBundleOriginalTotal, calculateBundleSavings, type BundleItem } from '../utils/productVariants';
import type { Product } from '../types';

export function BundleProductForm() {
  const navigate = useNavigate();
  const { addProduct, totalCount } = useProductStore();

  // 基本資訊
  const [name, setName] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [stock, setStock] = useState('10');

  // 組合項目
  const [items, setItems] = useState<BundleItem[]>([]);

  // 搜尋
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 生成條碼
  const generateNewBarcode = useCallback(async () => {
    let newBarcode = generateBarcode();
    while (await barcodeExists(newBarcode)) {
      newBarcode = generateBarcode();
    }
    return newBarcode;
  }, []);

  // 搜尋商品
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (searchQuery.trim()) {
        const results = await searchProducts(searchQuery, 10);
        // 過濾已選擇的商品
        const filtered = results.filter(p => !items.some(i => i.productId === p.id));
        setSearchResults(filtered);
      } else {
        setSearchResults([]);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [searchQuery, items]);

  // 新增項目到組合
  const addItem = (product: Product) => {
    const existingItem = items.find(i => i.productId === product.id);
    if (existingItem) {
      // 已存在，增加數量
      setItems(items.map(i => 
        i.productId === product.id 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      // 新增
      setItems([...items, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      }]);
    }
    setSearchQuery('');
    setShowSearch(false);
  };

  // 移除項目
  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  // 更新數量
  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(items.map(i => 
      i.productId === productId 
        ? { ...i, quantity }
        : i
    ));
  };

  // 計算原價
  const originalTotal = calculateBundleOriginalTotal(items);
  
  // 計算折扣
  const bundlePriceNum = parsePrice(bundlePrice);
  const savings = calculateBundleSavings(items, bundlePriceNum);

  // 快速設定組合價
  const applyDiscountPercent = (percent: number) => {
    if (originalTotal === 0) return;
    const newPrice = Math.round(originalTotal * percent / 100);
    setBundlePrice(formatPrice(newPrice));
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 驗證
    if (!name.trim()) {
      setError('請輸入組合名稱');
      return;
    }

    if (items.length === 0) {
      setError('請至少添加一個商品到組合');
      return;
    }

    const price = parsePrice(bundlePrice);
    if (price <= 0) {
      setError('請輸入有效的組合價格');
      return;
    }

    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setError('請輸入有效的庫存數量');
      return;
    }

    // 檢查上限
    if (totalCount >= MAX_PRODUCTS) {
      setError(`商品數量已達上限 (${MAX_PRODUCTS})`);
      return;
    }

    setLoading(true);

    try {
      const product = await generateBundleProduct(
        {
          name: name.trim(),
          bundlePrice: price,
          stock: stockNum,
          items,
        },
        generateNewBarcode
      );

      await addProduct(product);
      navigate('/products');
    } catch (err) {
      setError('建立失敗，請重試');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/products')}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            新增組合商品
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto">
        {error && (
          <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本資訊 */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">基本資訊</h2>
            </div>

            <div className="space-y-4">
              {/* 名稱 */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  組合名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="如：超值套餐 A、情人節組合"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              {/* 組合價格 */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  組合價格（元） <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={bundlePrice}
                    onChange={(e) => setBundlePrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                  {originalTotal > 0 && (
                    <div className="absolute right-3 top-2.5 text-sm">
                      {savings > 0 ? (
                        <span className="text-green-600 font-medium">
                          省 ${formatPrice(savings)}
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          原價 ${formatPrice(originalTotal)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* 快速折扣按鈕 */}
                {originalTotal > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs text-gray-500 py-1">快速設定：</span>
                    {[95, 90, 85, 80].map(percent => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => applyDiscountPercent(percent)}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
                      >
                        {percent}折
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setBundlePrice(formatPrice(originalTotal))}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    >
                      原價
                    </button>
                  </div>
                )}
              </div>

              {/* 庫存 */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  組合庫存 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500">組合庫存獨立計算，不與內含商品連動</p>
              </div>
            </div>
          </div>

          {/* 組合內容 */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" />
                <h2 className="font-semibold text-gray-900 dark:text-white">組合內容</h2>
                <span className="text-sm text-gray-500">({items.length} 項)</span>
              </div>
            </div>

            {/* 已選商品列表 */}
            {items.length > 0 ? (
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-700/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        ${formatPrice(item.price)} / 個
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* 價格摘要 */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">原價總計</span>
                    <span className="text-lg text-gray-500 line-through">${formatPrice(originalTotal)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-green-600 dark:text-green-400">組合優惠</span>
                      <span className="text-lg font-medium text-green-600">-${formatPrice(savings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-medium text-gray-900 dark:text-white">組合價</span>
                    <span className="text-2xl font-bold text-blue-600">${formatPrice(bundlePriceNum)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg dark:border-gray-700 mb-4">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>尚未添加商品</p>
                <p className="text-sm">搜尋並添加商品到此組合</p>
              </div>
            )}

            {/* 添加商品 */}
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearch(true);
                    }}
                    onFocus={() => setShowSearch(true)}
                    placeholder="搜尋商品名稱..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                {showSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* 搜尋結果下拉 */}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addItem(product)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 dark:hover:bg-gray-700 dark:border-gray-700"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 dark:text-white truncate pr-2">
                          {product.name}
                        </span>
                        <span className="text-blue-600 font-medium">
                          ${formatPrice(product.price)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        庫存: {product.stock}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showSearch && searchQuery && searchResults.length === 0 && (
                <div className="absolute z-20 w-full mt-1 p-4 bg-white border border-gray-200 rounded-lg shadow-lg text-center text-gray-500 dark:bg-gray-800 dark:border-gray-700">
                  未找到匹配的商品
                </div>
              )}
            </div>
          </div>

          {/* 提示 */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              <strong>說明：</strong>組合商品是一個獨立的商品，購買時會扣減此組合的庫存。
              內含商品的庫存不會自動連動，請自行管理。
            </p>
          </div>

          {/* 提交按鈕 */}
          <div className="flex gap-3 pt-4 pb-safe sticky bottom-0 bg-gray-50 dark:bg-gray-900 py-4 -mx-4 px-4">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="flex-1 px-4 py-3 min-h-[48px] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || totalCount >= MAX_PRODUCTS}
              className="flex-1 px-4 py-3 min-h-[48px] text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '建立中...' : '建立組合商品'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
