import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Package, QrCode, RefreshCw } from 'lucide-react';
import { useProductStore } from '../stores/productStore';
import { barcodeExists } from '../db/products';
import type { Product } from '../types';
import { generateUUID, generateBarcode, formatPrice, parsePrice } from '../utils/barcode';
import { compressImage, getBase64Size, formatFileSize } from '../utils/image';

export function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { addProduct, updateProduct, products } = useProductStore();

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    barcode: '',
    image: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<number>(0);

  // Generate new barcode (defined before useEffect)
  const generateNewBarcode = useCallback(async () => {
    let newBarcode = generateBarcode();
    // Ensure uniqueness
    while (await barcodeExists(newBarcode, id)) {
      newBarcode = generateBarcode();
    }
    setFormData((prev) => ({ ...prev, barcode: newBarcode }));
  }, [id]);

  // Load product data for editing
  useEffect(() => {
    const initForm = async () => {
      if (isEdit && id) {
        const product = products.find((p) => p.id === id);
        if (product) {
          setFormData({
            name: product.name,
            price: formatPrice(product.price),
            stock: String(product.stock),
            barcode: product.barcode,
            image: product.image || '',
          });
          if (product.image) {
            setImageSize(getBase64Size(product.image));
          }
        } else {
          navigate('/products');
        }
      } else {
        // Generate barcode for new product
        await generateNewBarcode();
      }
    };

    initForm();
  }, [id, isEdit, products, generateNewBarcode, navigate]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('請上傳圖片檔案');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('圖片大小不能超過 5MB');
      return;
    }

    try {
      setLoading(true);
      const compressedImage = await compressImage(file, 300, 0.7);
      setFormData((prev) => ({ ...prev, image: compressedImage }));
      setImageSize(getBase64Size(compressedImage));
      setError(null);
    } catch (err) {
      setError('圖片處理失敗');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('請輸入商品名稱');
      return;
    }

    const price = parsePrice(formData.price);
    if (price <= 0) {
      setError('請輸入有效的售價');
      return;
    }

    const stock = parseInt(formData.stock, 10);
    if (isNaN(stock) || stock < 0) {
      setError('請輸入有效的庫存數量');
      return;
    }

    if (!formData.barcode.trim()) {
      setError('請產生條碼');
      return;
    }

    // Check barcode uniqueness
    const exists = await barcodeExists(formData.barcode, id);
    if (exists) {
      setError('該條碼已被使用，請重新產生');
      return;
    }

    const now = new Date().toISOString();
    const productData: Product = {
      id: isEdit ? id! : generateUUID(),
      name: formData.name.trim(),
      price,
      stock,
      barcode: formData.barcode,
      image: formData.image || undefined,
      createdAt: isEdit
        ? products.find((p) => p.id === id)?.createdAt || now
        : now,
      updatedAt: now,
    };

    try {
      setLoading(true);
      if (isEdit) {
        await updateProduct(productData);
      } else {
        await addProduct(productData);
      }
      navigate('/products');
    } catch (err) {
      setError('儲存失敗，請重試');
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
            {isEdit ? '編輯商品' : '新增商品'}
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
          {/* Image upload */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              商品圖片
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-32 overflow-hidden bg-gray-100 border-2 border-gray-300 border-dashed rounded-lg dark:bg-gray-800 dark:border-gray-600">
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                    <Package className="w-8 h-8 mb-1" />
                    <span className="text-xs">暫無圖片</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
                  <Camera className="w-4 h-4" />
                  {formData.image ? '更換圖片' : '上傳圖片'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {formData.image && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, image: '' }));
                      setImageSize(0);
                    }}
                    className="px-4 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 dark:bg-gray-800 dark:border-red-700 dark:text-red-400"
                  >
                    刪除圖片
                  </button>
                )}
                {imageSize > 0 && (
                  <span className="text-xs text-gray-500">
                    大小: {formatFileSize(imageSize)}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              支援 JPG、PNG 格式，最大 5MB，上傳後會自動壓縮
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              商品名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="請輸入商品名稱"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                售價（元） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                庫存數量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.stock}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stock: e.target.value }))
                }
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Barcode */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              店內條碼
            </label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <QrCode className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.barcode}
                  readOnly
                  className="w-full px-4 py-2 pl-10 bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={generateNewBarcode}
                className="flex items-center gap-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <RefreshCw className="w-4 h-4" />
                重新產生
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              8位數字，以2開頭（店內碼格式）
            </p>
          </div>

          {/* Submit buttons - fixed at bottom for mobile */}
          <div className="flex gap-3 pt-4 pb-safe sticky bottom-0 bg-gray-50 dark:bg-gray-900 py-4 -mx-4 px-4">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="flex-1 px-4 py-3 min-h-[48px] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:active:bg-gray-500 touch-manipulation select-none"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 min-h-[48px] text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation select-none"
            >
              {loading ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
