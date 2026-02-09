import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem as CartItemType } from '../types';
import { formatPrice } from '../utils/barcode';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const { product, quantity } = item;
  const subtotal = product.price * quantity;

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
      {/* Product info */}
      <div className="flex-grow min-w-0">
        <h4 className="font-medium text-gray-900 truncate dark:text-white">
          {product.name}
        </h4>
        <p className="text-sm text-gray-500">
          ${formatPrice(product.price)} / 件
        </p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
          className="p-1 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="w-8 text-center font-medium">
          {quantity}
        </span>

        <button
          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
          disabled={quantity >= product.stock}
          className="p-1 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Subtotal */}
      <div className="w-20 text-right">
        <p className="font-semibold text-blue-600">
          ${formatPrice(subtotal)}
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(product.id)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-md dark:hover:bg-red-900/20"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
