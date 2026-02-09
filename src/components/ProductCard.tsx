import { Package, QrCode, Trash2 } from 'lucide-react';
import type { Product } from '../types';
import { formatPrice } from '../utils/barcode';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onAddToCart?: () => void;
  onDelete?: () => void;
}

export function ProductCard({ product, onClick, onAddToCart, onDelete }: ProductCardProps) {
  return (
    <div
      className="flex gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700"
    >
      {/* Image */}
      <div
        className="flex-shrink-0 w-20 h-20 overflow-hidden bg-gray-100 rounded-md cursor-pointer"
        onClick={onClick}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-grow min-w-0">
        <h3
          className="font-medium text-gray-900 truncate cursor-pointer dark:text-white"
          onClick={onClick}
        >
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
          <QrCode className="w-3 h-3" />
          <span>{product.barcode}</span>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-lg font-bold text-blue-600">
            ${formatPrice(product.price)}
          </span>
          <span className={`text-sm ${product.stock > 0 ? 'text-gray-500' : 'text-red-500'}`}>
            庫存: {product.stock}
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col justify-between items-end gap-2">
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
            title="刪除商品"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        
        {onAddToCart && (
          <button
            onClick={onAddToCart}
            disabled={product.stock <= 0}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            新增
          </button>
        )}
      </div>
    </div>
  );
}
