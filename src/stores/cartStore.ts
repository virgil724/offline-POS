import { create } from 'zustand';
import type { Product, CartItem } from '../types';

interface AddToCartResult {
  success: boolean;
  message: string;
  limited?: boolean;
}

interface CartState {
  items: CartItem[];
  addToCart: (product: Product) => AddToCartResult;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => AddToCartResult;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addToCart: (product: Product) => {
    const { items } = get();
    const existingItem = items.find((item) => item.product.id === product.id);

    if (existingItem) {
      // Check stock limit
      if (existingItem.quantity >= product.stock) {
        return {
          success: false,
          message: `已達庫存上限（${product.stock}個）`,
        };
      }

      set({
        items: items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
      return {
        success: true,
        message: `已新增: ${product.name} (${existingItem.quantity + 1}/${product.stock})`,
      };
    } else {
      if (product.stock <= 0) {
        return {
          success: false,
          message: '此商品暫無庫存',
        };
      }
      set({ items: [...items, { product, quantity: 1 }] });
      return {
        success: true,
        message: `已新增: ${product.name} (1/${product.stock})`,
      };
    }
  },

  removeFromCart: (productId: string) => {
    const { items } = get();
    set({ items: items.filter((item) => item.product.id !== productId) });
  },

  updateQuantity: (productId: string, quantity: number) => {
    const { items } = get();

    const item = items.find((i) => i.product.id === productId);
    if (!item) {
      return { success: false, message: '商品不存在' };
    }

    if (quantity <= 0) {
      set({ items: items.filter((item) => item.product.id !== productId) });
      return { success: true, message: '已移除商品' };
    }

    // Cap at stock limit
    if (quantity > item.product.stock) {
      quantity = item.product.stock;
      set({
        items: items.map((i) =>
          i.product.id === productId ? { ...i, quantity } : i
        ),
      });
      return {
        success: true,
        message: `已達庫存上限（${item.product.stock}個）`,
        limited: true,
      };
    }

    set({
      items: items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    });
    return {
      success: true,
      message: `已更新數量: ${item.product.name} (${quantity}/${item.product.stock})`,
    };
  },

  clearCart: () => {
    set({ items: [] });
  },

  getTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
}));
