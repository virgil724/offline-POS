import { create } from 'zustand';
import type { Product, CartItem } from '../types';

interface AddToCartResult {
  success: boolean;
  message: string;
  limited?: boolean;
}

interface Discount {
  type: 'round_down_10' | 'round_down_100' | 'percent' | 'custom';
  amount: number; // 折扣金額（分）
  percent?: number; // 折扣百分比（如 95 表示 95 折）
  label: string;
}

interface CartState {
  items: CartItem[];
  discount: Discount | null;
  addToCart: (product: Product) => AddToCartResult;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => AddToCartResult;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  getDiscount: () => Discount | null;
  getFinalTotal: () => number;
  setDiscount: (discount: Discount | null) => void;
  applyRoundDown10: () => void; // 去個位數（如 123 -> 120）
  applyRoundDown100: () => void; // 去十位數（如 123 -> 100）
  applyPercentDiscount: (percent: number) => void; // 本單 n 折（如 95 表示 95 折）
  clearDiscount: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: null,

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
    set({ items: [], discount: null });
  },

  getDiscount: () => {
    return get().discount;
  },

  getFinalTotal: () => {
    const { items, discount } = get();
    const total = items.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);
    if (discount) {
      return Math.max(0, total - discount.amount);
    }
    return total;
  },

  setDiscount: (discount: Discount | null) => {
    set({ discount });
  },

  applyRoundDown10: () => {
    const total = get().getTotal();
    const remainder = total % 1000; // 個位數（分）
    if (remainder > 0) {
      set({
        discount: {
          type: 'round_down_10',
          amount: remainder,
          label: `去個位數 (-${remainder / 100}元)`,
        },
      });
    }
  },

  applyRoundDown100: () => {
    const total = get().getTotal();
    const remainder = total % 10000; // 十位數（分）
    if (remainder > 0) {
      set({
        discount: {
          type: 'round_down_100',
          amount: remainder,
          label: `去十位數 (-${remainder / 100}元)`,
        },
      });
    }
  },

  applyPercentDiscount: (percent: number) => {
    const total = get().getTotal();
    if (percent <= 0 || percent >= 100) {
      set({ discount: null });
      return;
    }
    // 計算折扣金額：總額 * (1 - percent/100)
    // 例如 95 折：總額 * 0.05 = 折扣金額
    const discountAmount = Math.round(total * (1 - percent / 100));
    if (discountAmount > 0) {
      set({
        discount: {
          type: 'percent',
          amount: discountAmount,
          percent,
          label: `${percent}折 (-${(discountAmount / 100).toFixed(2)}元)`,
        },
      });
    }
  },

  clearDiscount: () => {
    set({ discount: null });
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
