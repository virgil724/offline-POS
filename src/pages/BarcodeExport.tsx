import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, CheckSquare, Square, QrCode, Barcode } from 'lucide-react';
import { useProductStore } from '../stores/productStore';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import type { Product } from '../types';

interface ProductWithCode extends Product {
  selected: boolean;
  barcodeDataUrl?: string;
  qrcodeDataUrl?: string;
}

export function BarcodeExport() {
  const navigate = useNavigate();
  const { products, loading } = useProductStore();
  const [items, setItems] = useState<ProductWithCode[]>([]);
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>('barcode');
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(products.map(p => ({ ...p, selected: false })));
  }, [products]);

  const toggleSelectAll = () => {
    const allSelected = items.every(i => i.selected);
    setItems(items.map(i => ({ ...i, selected: !allSelected })));
  };

  const toggleSelect = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };

  const generateCodes = async () => {
    const selectedItems = items.filter(i => i.selected);
    if (selectedItems.length === 0) return;

    setGenerating(true);
    const updated = [...items];

    for (const item of selectedItems) {
      const index = updated.findIndex(i => i.id === item.id);
      if (index === -1) continue;

      if (codeType === 'barcode') {
        // Create canvas for barcode
        const canvas = document.createElement('canvas');
        try {
          JsBarcode(canvas, item.barcode, {
            format: 'CODE128',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 14,
            margin: 10,
          });
          updated[index] = {
            ...updated[index],
            barcodeDataUrl: canvas.toDataURL('image/png'),
          };
        } catch (e) {
          console.error('Barcode generation failed:', e);
        }
      } else {
        // Generate QR code
        try {
          const dataUrl = await QRCode.toDataURL(item.barcode, {
            width: 150,
            margin: 2,
          });
          updated[index] = {
            ...updated[index],
            qrcodeDataUrl: dataUrl,
          };
        } catch (e) {
          console.error('QR code generation failed:', e);
        }
      }
    }

    setItems(updated);
    setGenerating(false);
  };

  const handlePrint = () => {
    const selectedItems = items.filter(i => i.selected && (i.barcodeDataUrl || i.qrcodeDataUrl));
    if (selectedItems.length === 0) {
      alert('請先選擇商品並產生條碼');
      return;
    }
    window.print();
  };

  const selectedCount = items.filter(i => i.selected).length;
  const generatedCount = items.filter(i =>
    i.selected && (codeType === 'barcode' ? i.barcodeDataUrl : i.qrcodeDataUrl)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 print:hidden">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/products')}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              批次條碼匯出
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={generatedCount === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              列印
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto print:p-0">
        {/* Controls */}
        <div className="mb-6 space-y-4 print:hidden">
          {/* Code type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setCodeType('barcode')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                codeType === 'barcode'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              <Barcode className="w-4 h-4" />
              條碼 (CODE128)
            </button>
            <button
              onClick={() => setCodeType('qrcode')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                codeType === 'qrcode'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              <QrCode className="w-4 h-4" />
              QR 碼
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            >
              {items.every(i => i.selected) ? (
                <><CheckSquare className="w-4 h-4" /> 取消全選</>
              ) : (
                <><Square className="w-4 h-4" /> 全選</>
              )}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              已選擇 {selectedCount} 項
            </span>
            {selectedCount > 0 && (
              <button
                onClick={generateCodes}
                disabled={generating}
                className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {generating ? '產生中...' : `產生${codeType === 'barcode' ? '條碼' : 'QR碼'}`}
              </button>
            )}
          </div>
        </div>

        {/* Product list */}
        <div className="space-y-2 print:hidden">
          {loading ? (
            <div className="py-12 text-center text-gray-500">載入中...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              暫無商品，<Link to="/products/new" className="text-blue-600 hover:underline">新增商品</Link>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer dark:bg-gray-800 ${
                  item.selected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex-shrink-0">
                  {item.selected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {item.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    條碼: {item.barcode} | 售價: ${(item.price / 100).toFixed(2)}
                  </div>
                </div>
                {(codeType === 'barcode' && item.barcodeDataUrl) && (
                  <img src={item.barcodeDataUrl} alt="barcode" className="h-12" />
                )}
                {(codeType === 'qrcode' && item.qrcodeDataUrl) && (
                  <img src={item.qrcodeDataUrl} alt="qrcode" className="h-12 w-12" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Print view */}
        <div ref={printRef} className="hidden print:block">
          <div className="grid grid-cols-3 gap-4">
            {items
              .filter(i => i.selected && (i.barcodeDataUrl || i.qrcodeDataUrl))
              .map(item => (
                <div
                  key={item.id}
                  className="flex flex-col items-center p-4 border border-gray-300 rounded"
                >
                  <div className="text-sm font-medium text-center mb-2">
                    {item.name}
                  </div>
                  {codeType === 'barcode' && item.barcodeDataUrl && (
                    <img src={item.barcodeDataUrl} alt="barcode" className="max-w-full" />
                  )}
                  {codeType === 'qrcode' && item.qrcodeDataUrl && (
                    <img src={item.qrcodeDataUrl} alt="qrcode" className="w-32 h-32" />
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {item.barcode}
                  </div>
                  <div className="text-xs text-gray-500">
                    ${(item.price / 100).toFixed(2)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
