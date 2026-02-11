import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, Package, Barcode, AlertCircle, Layers, Sparkles } from 'lucide-react';
import { useProductStore, MAX_PRODUCTS } from '../stores/productStore';
import { ProductCard } from '../components/ProductCard';

export function Products() {
  const navigate = useNavigate();
  const {
    products,
    loading,
    totalCount,
    currentPage,
    pageSize,
    searchQuery,
    loadProducts,
    searchProducts,
    deleteProduct,
  } = useProductStore();

  const [searchInput, setSearchInput] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    loadProducts(1);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts(searchInput);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadProducts(page);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`確定要刪除商品 "${name}" 嗎？此操作無法復原。`)) {
      try {
        await deleteProduct(id);
      } catch (error) {
        alert('刪除失敗，請稍後再試。');
      }
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    if (totalCount >= MAX_PRODUCTS) {
      e.preventDefault();
      alert(`商品數量已達上限 (${MAX_PRODUCTS})，無法再新增。`);
      return;
    }
    setShowAddMenu(!showAddMenu);
  };

  const handleNavigate = (path: string) => {
    setShowAddMenu(false);
    navigate(path);
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">商品管理</h1>
          </div>
          <Link
            to="/"
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400"
          >
            返回銷售
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto">
        {/* Search and Add */}
        <div className="flex gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-grow">
            <div className="relative">
              <input
                type="text"
                placeholder="搜尋商品名稱..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </form>
          <button
            onClick={handleSearch}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
          >
            搜尋
          </button>
          <Link
            to="/barcode-export"
            className="flex items-center gap-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            title="批次匯出條碼"
          >
            <Barcode className="w-5 h-5" />
            <span className="hidden sm:inline">條碼</span>
          </Link>
          {/* Add button with dropdown */}
          <div className="relative">
            <button
              onClick={handleAddClick}
              disabled={totalCount >= MAX_PRODUCTS}
              className={`flex items-center gap-1 px-4 py-2 text-white rounded-lg transition-colors ${
                totalCount >= MAX_PRODUCTS
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Plus className="w-5 h-5" />
              新增
            </button>

            {/* Dropdown menu */}
            {showAddMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAddMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 dark:bg-gray-800 dark:border-gray-700">
                  <button
                    onClick={() => handleNavigate('/products/new')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 first:rounded-t-lg dark:hover:bg-gray-700 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                        <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">一般商品</p>
                        <p className="text-xs text-gray-500">單一規格商品</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavigate('/products/new-variant')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 dark:hover:bg-gray-700 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
                        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">變體商品</p>
                        <p className="text-xs text-gray-500">多規格自動生成</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavigate('/products/new-bundle')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 last:rounded-b-lg dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/30">
                        <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">組合商品</p>
                        <p className="text-xs text-gray-500">多商品優惠組合</p>
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Product limit info */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            商品總量: <span className={totalCount >= MAX_PRODUCTS ? 'text-orange-600 font-bold' : ''}>{totalCount}</span> / {MAX_PRODUCTS}
          </div>
          {totalCount >= MAX_PRODUCTS && (
            <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
              <AlertCircle className="w-4 h-4" />
              已達免費版上限
            </div>
          )}
        </div>

        {/* Search result indicator */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            搜尋 "{searchQuery}" 的結果 ({products.length} 筆)
          </div>
        )}

        {/* Products list */}
        {loading ? (
          <div className="py-12 text-center text-gray-500">載入中...</div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {searchQuery ? '沒有找到匹配的商品' : '暫無商品，點擊"新增"新增'}
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="flex gap-2">
                <div className="flex-grow">
                  <ProductCard
                    product={product}
                    onClick={() => navigate(`/products/${product.id}/edit`)}
                    onDelete={() => handleDelete(product.id, product.name)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!searchQuery && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            >
              <ChevronLeft className="w-4 h-4" />
              上一頁
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            >
              下一頁
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
