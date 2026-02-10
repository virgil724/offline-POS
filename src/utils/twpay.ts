// Taiwan Pay (TWQR) QR Code Generator
// Based on: https://github.com/tzing/showmethemoney

export interface TwPayAccount {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

const STORAGE_KEY = 'twpay_account';
const LOGO_CACHE_KEY = 'twqr-logo-cache';

// Save TWPAY account to localStorage
export function saveTwPayAccount(account: TwPayAccount): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

// Load TWPAY account from localStorage
export function loadTwPayAccount(): TwPayAccount | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as TwPayAccount;
  } catch {
    return null;
  }
}

// Generate TWQR URI
// Format: TWQRP://個人轉帳/158/02/V1?D1=金額&D5=銀行代碼&D6=帳號&D10=901
// Using Punycode: xn--gmqw5ax42ad01c for "個人轉帳"
export function generateTWQRPUrl(
  bankCode: string,
  accountNumber: string,
  amountInCents: number
): string {
  // amountInCents is already in centi-dollars (1 cent = 1 centi-dollar)
  // For example: $12 = 1200 cents = 1200 centi-dollars
  const amountInCentiDollars = Math.round(amountInCents);

  // Remove non-digits from account number (like hyphens or spaces)
  const cleanAccountNumber = accountNumber.replace(/\D/g, '');

  // Pad account number to 16 digits
  const paddedAccount = cleanAccountNumber.padStart(16, '0');

  // Build TWQR URI using Punycode for Chinese characters
  const baseUrl = 'TWQRP://xn--gmqw5ax42ad01c/158/02/V1';
  const params = new URLSearchParams();

  params.append('D5', bankCode);
  params.append('D6', paddedAccount);
  params.append('D10', '901'); // TWD currency code
  params.append('D1', amountInCentiDollars.toString());

  return `${baseUrl}?${params.toString()}`;
}

// Generate TWQR format QR code for bank transfer with logo and account info
export async function generateBankTransferQR(
  account: TwPayAccount,
  amount: number,
): Promise<string> {
  try {
    // Generate TWQR URL
    const twqrUri = generateTWQRPUrl(account.bankCode, account.accountNumber, amount);

    // Generate QR code
    const QRCode = await import('qrcode');
    const qrDataUrl = await QRCode.toDataURL(twqrUri, {
      width: 400,
      margin: 0,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Create canvas with QR code and logo
    return await createQRCanvas(qrDataUrl);
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    throw err;
  }
}

// Create canvas with QR code and logo only
async function createQRCanvas(qrDataUrl: string): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Load images
  const qrImage = new Image();
  const logoImage = new Image();

  await Promise.all([
    // Load generated QR code image
    new Promise<void>((resolve) => {
      qrImage.onload = () => resolve();
      qrImage.onerror = () => resolve();
      qrImage.src = qrDataUrl;
    }),

    // Load logo with caching
    new Promise<void>((resolve) => {
      logoImage.crossOrigin = 'anonymous';
      logoImage.onload = () => resolve();
      logoImage.onerror = () => resolve();

      // Try to get cached logo first
      const cachedLogo = localStorage.getItem(LOGO_CACHE_KEY);
      if (cachedLogo) {
        logoImage.src = cachedLogo;
        return;
      }

      // Fetch and cache logo
      fetch('/twqr-logo.png')
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            try {
              localStorage.setItem(LOGO_CACHE_KEY, base64data);
            } catch (e) {
              console.warn('Failed to cache logo:', e);
            }
            logoImage.src = base64data;
          };
          reader.onerror = () => {
            logoImage.src = '/twqr-logo.png';
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          logoImage.src = '/twqr-logo.png';
        });
    }),
  ]);

  // Canvas size = QR code size
  const width = qrImage.width;
  const height = qrImage.height;

  canvas.width = width;
  canvas.height = height;

  // Draw QR code
  ctx.drawImage(qrImage, 0, 0);

  // Draw logo in center of QR code
  if (logoImage.complete && logoImage.naturalWidth > 0) {
    const logoSize = qrImage.width * 0.2;
    const logoX = (qrImage.width - logoSize) / 2;
    const logoY = (qrImage.height - logoSize) / 2;

    // Draw white background with rounded corners for logo
    const bgSize = logoSize * 1.25;
    const bgX = (qrImage.width - bgSize) / 2;
    const bgY = (qrImage.height - bgSize) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const radius = 12;

    // Draw rounded rectangle manually for compatibility
    ctx.moveTo(bgX + radius, bgY);
    ctx.lineTo(bgX + bgSize - radius, bgY);
    ctx.quadraticCurveTo(bgX + bgSize, bgY, bgX + bgSize, bgY + radius);
    ctx.lineTo(bgX + bgSize, bgY + bgSize - radius);
    ctx.quadraticCurveTo(bgX + bgSize, bgY + bgSize, bgX + bgSize - radius, bgY + bgSize);
    ctx.lineTo(bgX + radius, bgY + bgSize);
    ctx.quadraticCurveTo(bgX, bgY + bgSize, bgX, bgY + bgSize - radius);
    ctx.lineTo(bgX, bgY + radius);
    ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
    ctx.closePath();
    ctx.fill();

    // Draw logo
    ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
  }

  // Return final data URL
  return canvas.toDataURL('image/png');
}

// Bank code to name mapping (common Taiwan banks)
export const BANK_NAMES: Record<string, string> = {
  '004': '台灣銀行',
  '005': '土地銀行',
  '006': '合作金庫',
  '007': '第一銀行',
  '008': '華南銀行',
  '009': '彰化銀行',
  '011': '上海銀行',
  '012': '台北富邦',
  '013': '國泰世華',
  '016': '高雄銀行',
  '017': '兆豐商銀',
  '018': '農業金庫',
  '021': '花旗銀行',
  '048': '王道銀行',
  '050': '臺灣企銀',
  '052': '渣打銀行',
  '053': '台中銀行',
  '054': '京城銀行',
  '101': '瑞興銀行',
  '102': '華泰銀行',
  '103': '臺灣新光商銀',
  '108': '陽信銀行',
  '118': '板信銀行',
  '147': '三信銀行',
  '803': '聯邦銀行',
  '805': '遠東銀行',
  '806': '元大銀行',
  '807': '永豐銀行',
  '808': '玉山銀行',
  '809': '凱基銀行',
  '810': '星展銀行',
  '812': '台新銀行',
  '815': '日盛銀行',
  '816': '安泰銀行',
  '822': '中國信託',
  '823': '將來銀行',
  '824': '連線銀行',
  '826': '樂天銀行',
};
