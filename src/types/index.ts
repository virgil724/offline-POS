// Product (商品)
export interface Product {
  id: string;              // UUID v4
  name: string;            // 商品名稱（最大 100 字）
  price: number;           // 售價（整數，分）
  stock: number;           // 目前庫存（整數）
  barcode: string;         // 店內條碼（8位數字，自動產生）
  image?: string;          // 圖片 Base64 或 OPFS 檔案路徑
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
}

// TransactionItem (交易明細)
export interface TransactionItem {
  productId: string;
  name: string;            // 快照商品名稱
  price: number;           // 快照售價（分）
  quantity: number;        // 數量
}

// Transaction (交易)
export interface Transaction {
  id: string;              // UUID v4
  items?: TransactionItem[];  // Optional: only included when fetching full transaction details
  total: number;           // 總計金額（分）
  createdAt: string;       // ISO 8601
}

// CartItem (購物車項目)
export interface CartItem {
  product: Product;
  quantity: number;
}
