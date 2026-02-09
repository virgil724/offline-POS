import { create } from 'zustand';
import type { Product } from '../types';
import * as db from '../db/products';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;

  // Actions
  loadProducts: (page?: number) => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
  searchQuery: '',

  loadProducts: async (page?: number) => {
    const state = get();
    const targetPage = page || state.currentPage;

    set({ loading: true, error: null, searchQuery: '', currentPage: targetPage });

    try {
      const products = await db.getProducts(targetPage, state.pageSize);
      const totalCount = await db.getProductCount();
      set({ products, totalCount, loading: false });
    } catch (error) {
      set({ error: 'Failed to load products', loading: false });
      console.error(error);
    }
  },

  searchProducts: async (query: string) => {
    set({ loading: true, error: null, searchQuery: query, currentPage: 1 });

    try {
      if (!query.trim()) {
        const products = await db.getProducts(1, 20);
        const totalCount = await db.getProductCount();
        set({ products, totalCount, loading: false });
      } else {
        const products = await db.searchProducts(query, 20);
        set({ products, totalCount: products.length, loading: false });
      }
    } catch (error) {
      set({ error: 'Failed to search products', loading: false });
      console.error(error);
    }
  },

  addProduct: async (product: Product) => {
    try {
      await db.createProduct(product);
      await get().refresh();
    } catch (error) {
      console.error('Failed to add product:', error);
      throw error;
    }
  },

  updateProduct: async (product: Product) => {
    try {
      await db.updateProduct(product);
      await get().refresh();
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  },

  deleteProduct: async (id: string) => {
    try {
      await db.deleteProduct(id);
      await get().refresh();
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  },

  refresh: async () => {
    const state = get();
    if (state.searchQuery) {
      await state.searchProducts(state.searchQuery);
    } else {
      await state.loadProducts(state.currentPage);
    }
  },
}));
