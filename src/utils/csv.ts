import type { Transaction, TransactionItem } from '../types';

/**
 * 將交易資料轉換為 CSV 格式並下載
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  filename?: string
): void {
  if (transactions.length === 0) {
    alert('沒有交易資料可導出');
    return;
  }

  // CSV 標題
  const headers = [
    '訂單編號',
    '訂單時間',
    '商品名稱',
    '單價',
    '數量',
    '小計',
    '訂單總計',
  ];

  // 收集所有行資料
  const rows: string[][] = [];

  transactions.forEach((transaction) => {
    const items = transaction.items || [];
    const date = new Date(transaction.createdAt);
    const formattedDate = date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const orderId = transaction.id.slice(0, 8);
    const total = formatPrice(transaction.total);

    if (items.length === 0) {
      // 沒有明細的交易
      rows.push([orderId, formattedDate, '', '', '', '', total]);
    } else {
      // 每個商品一行
      items.forEach((item, index) => {
        rows.push([
          index === 0 ? orderId : '', // 只在第一行顯示訂單編號
          index === 0 ? formattedDate : '', // 只在第一行顯示時間
          item.name,
          formatPrice(item.price),
          item.quantity.toString(),
          formatPrice(item.price * item.quantity),
          index === 0 ? total : '', // 只在第一行顯示總計
        ]);
      });
    }
  });

  // 轉換為 CSV 字串
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // 處理特殊字元：如果有逗號、換行或雙引號，用雙引號包起來
          const escaped = cell.replace(/"/g, '""');
          if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
            return `"${escaped}"`;
          }
          return escaped;
        })
        .join(',')
    ),
  ].join('\n');

  // 加入 BOM 讓 Excel 正確顯示中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  // 建立下載連結
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // 產生檔名：預設使用今天日期
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const finalFilename = filename || `訂單記錄_${dateStr}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * 將價格從「分」轉換為「元」並格式化
 */
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2);
}
