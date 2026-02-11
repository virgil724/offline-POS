import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Package, Layers } from 'lucide-react';
import { useProductStore, MAX_PRODUCTS } from '../stores/productStore';
import { barcodeExists } from '../db/products';
import { generateBarcode, parsePrice } from '../utils/barcode';
import { generateVariantProducts, type VariantOption } from '../utils/productVariants';

export function VariantProductForm() {
  const navigate = useNavigate();
  const { addProduct, totalCount } = useProductStore();

  // 基本資訊
  const [baseName, setBaseName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [baseStock, setBaseStock] = useState('10');

  // 變體選項
  const [options, setOptions] = useState<VariantOption[]>([
    { name: '顏色', values: ['紅', '藍', '黑'] },
  ]);

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

  // 計算預覽數量
  const calculatePreviewCount = useCallback(() => {
    if (options.length === 0 || options.some(opt => opt.values.length === 0)) {
      return 0;
    }
    return options.reduce((count, opt) => count * opt.values.length, 1);
  }, [options]);


  // 新增變體選項
  const addOption = () => {
    setOptions([...options, { name: '', values: [] }]);
  };

  // 移除變體選項
  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  // 更新選項名稱
  const updateOptionName = (index: number, name: string) => {
    const newOptions = [...options];
    newOptions[index].name = name;
    setOptions(newOptions);
  };

  // 更新選項值
  const updateOptionValues = (index: number, valuesText: string) => {
    const newOptions = [...options];
    // 以逗號分隔，去除空白
    newOptions[index].values = valuesText
      .split(/[,，]/)
      .map(v => v.trim())
      .filter(v => v.length > 0);
    setOptions(newOptions);
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 驗證
    if (!baseName.trim()) {
      setError('請輸入商品名稱');
      return;
    }

    const price = parsePrice(basePrice);
    if (price <= 0) {
      setError('請輸入有效的售價');
      return;
    }

    const stock = parseInt(baseStock, 10);
    if (isNaN(stock) || stock < 0) {
      setError('請輸入有效的庫存數量');
      return;
    }

    // 驗證變體選項
    if (options.length === 0) {
      setError('至少需要一個變體選項');
      return;
    }

    for (const opt of options) {
      if (!opt.name.trim()) {
        setError('請填寫所有變體選項名稱');
        return;
      }
      if (opt.values.length === 0) {
        setError(`變體「${opt.name}」至少需要一個選項值`);
        return;
      }
    }

    // 計算將生成的商品數量
    const variantCount = options.reduce((count, opt) => count * opt.values.length, 1);
    
    // 檢查上限
    const currentCount = totalCount;
    if (currentCount + variantCount > MAX_PRODUCTS) {
      setError(`將生成 ${variantCount} 個商品，超出上限（目前 ${currentCount}/${MAX_PRODUCTS}）`);
      return;
    }

    setLoading(true);

    try {
      // 生成變體商品
      const products = await generateVariantProducts(
        {
          baseName: baseName.trim(),
          basePrice: price,
          baseStock: stock,
          options,
        },
        generateNewBarcode
      );

      // 逐一儲存
      for (const product of products) {
        await addProduct(product);
      }

      navigate('/products');
    } catch (err) {
      setError('建立失敗，請重試');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 生成預覽範例
  const generatePreviewExamples = (): string[] => {
    if (!baseName.trim() || options.length === 0) return [];
    
    const maxExamples = 5;
    
    const generateCombinations = (opts: VariantOption[], prefix: string[] = []): string[] => {
      if (opts.length === 0) return [prefix.join(' / ')];
      const [first, ...rest] = opts;
      const results: string[] = [];
      for (const value of first.values.slice(0, 3)) { // 最多顯示3個
        results.push(...generateCombinations(rest, [...prefix, value]));
      }
      return results;
    };

    const combos = generateCombinations(options);
    return combos.slice(0, maxExamples).map(combo => `${baseName.trim()} (${combo})`);
  };

  const previewExamples = generatePreviewExamples();
  const totalVariants = calculatePreviewCount();

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
            新增變體商品
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
                  商品名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  placeholder="如：T恤、運動鞋"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500">系統會自動加上變體後綴，如「T恤 (紅 / S)」</p>
              </div>

              {/* 價格和庫存 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    售價（元） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    每個變體庫存 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={baseStock}
                    onChange={(e) => setBaseStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 變體選項 */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-gray-900 dark:text-white">變體選項</h2>
              </div>
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <Plus className="w-4 h-4" />
                新增選項
              </button>
            </div>

            <div className="space-y-4">
              {options.map((option, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg dark:bg-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={option.name}
                      onChange={(e) => updateOptionName(index, e.target.value)}
                      placeholder="選項名稱，如：顏色、尺寸"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={option.values.join(', ')}
                      onChange={(e) => updateOptionValues(index, e.target.value)}
                      placeholder="選項值，以逗號分隔，如：紅, 藍, 黑"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    {option.values.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {option.values.map((value, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full dark:bg-purple-900/30 dark:text-purple-400"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 預覽 */}
          {previewExamples.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                將生成 {totalVariants} 個商品：
              </h3>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                {previewExamples.map((example, i) => (
                  <li key={i} className="truncate">• {example}</li>
                ))}
                {totalVariants > 5 && (
                  <li className="text-blue-600 dark:text-blue-500">...還有 {totalVariants - 5} 個</li>
                )}
              </ul>
            </div>
          )}

          {/* 提示 */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              <strong>說明：</strong>系統會為每個變體組合建立獨立的商品，各自擁有不同的條碼和庫存。
              例如：顏色(紅,藍) × 尺寸(S,M) = 4 個商品。
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
              {loading ? '建立中...' : `建立 ${totalVariants} 個商品`}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
