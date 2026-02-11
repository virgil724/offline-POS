import type { Product } from '../types';
import { generateUUID } from './barcode';

// 變體選項
export interface VariantOption {
  name: string; // 如 "顏色", "尺寸"
  values: string[]; // 如 ["紅", "藍"], ["S", "M", "L"]
}

// 變體設定
export interface VariantConfig {
  baseName: string; // 基礎名稱，如 "T恤"
  basePrice: number; // 基礎價格（分）
  baseStock: number; // 每個變體的庫存
  options: VariantOption[]; // 變體選項
}

// 生成所有變體組合
function generateVariantCombinations(options: VariantOption[]): string[][] {
  if (options.length === 0) return [[]];
  
  const [first, ...rest] = options;
  const restCombinations = generateVariantCombinations(rest);
  
  const combinations: string[][] = [];
  for (const value of first.values) {
    for (const restCombo of restCombinations) {
      combinations.push([value, ...restCombo]);
    }
  }
  return combinations;
}

// 根據變體設定生成商品列表
export async function generateVariantProducts(
  config: VariantConfig,
  barcodeGenerator: () => Promise<string>
): Promise<Product[]> {
  const combinations = generateVariantCombinations(config.options);
  const now = new Date().toISOString();
  const products: Product[] = [];

  for (const combo of combinations) {
    // 生成變體名稱：基礎名稱 + 變體值
    const variantSuffix = combo.join(' / ');
    const name = `${config.baseName} (${variantSuffix})`;
    
    const product: Product = {
      id: generateUUID(),
      name,
      price: config.basePrice,
      stock: config.baseStock,
      barcode: await barcodeGenerator(),
      createdAt: now,
      updatedAt: now,
    };
    
    products.push(product);
  }

  return products;
}

// 判斷商品是否為變體商品（根據名稱格式）
export function isVariantProduct(name: string): boolean {
  // 變體商品名稱格式："名稱 (變體1 / 變體2)"
  return /\s*\([^)]+\)\s*$/.test(name);
}

// 解析變體商品名稱
export function parseVariantName(name: string): { baseName: string; variants: string[] } | null {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!match) return null;
  
  return {
    baseName: match[1].trim(),
    variants: match[2].split('/').map(v => v.trim()),
  };
}

// ==================== 商品組合 ====================

// 組合商品項目
export interface BundleItem {
  productId: string;
  name: string;
  price: number; // 原價（分）
  quantity: number;
}

// 組合商品設定
export interface BundleConfig {
  name: string; // 組合名稱，如 "超值套餐 A"
  bundlePrice: number; // 組合價（分）
  stock: number; // 組合庫存
  items: BundleItem[]; // 組合內容
}

// 生成組合商品
export async function generateBundleProduct(
  config: BundleConfig,
  barcodeGenerator: () => Promise<string>
): Promise<Product> {
  const now = new Date().toISOString();
  
  return {
    id: generateUUID(),
    name: config.name,
    price: config.bundlePrice,
    stock: config.stock,
    barcode: await barcodeGenerator(),
    createdAt: now,
    updatedAt: now,
  };
}

// 計算組合原價總額
export function calculateBundleOriginalTotal(items: BundleItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// 計算組合折扣
export function calculateBundleSavings(items: BundleItem[], bundlePrice: number): number {
  const originalTotal = calculateBundleOriginalTotal(items);
  return Math.max(0, originalTotal - bundlePrice);
}

// 判斷是否為組合商品（根據名稱關鍵字）
export function isBundleProduct(name: string): boolean {
  const bundleKeywords = ['組合', '套餐', 'bundle', 'combo', 'set'];
  const lowerName = name.toLowerCase();
  return bundleKeywords.some(keyword => lowerName.includes(keyword.toLowerCase()));
}
