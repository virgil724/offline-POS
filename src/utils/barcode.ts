import { v4 as uuidv4 } from 'uuid';

// Generate 8-digit store barcode (店內碼)
// Format: 2 + 7 random digits (first digit 2 avoids conflict with EAN-13)
export function generateBarcode(): string {
  // Generate 7 random digits
  let randomPart = '';
  for (let i = 0; i < 7; i++) {
    randomPart += Math.floor(Math.random() * 10);
  }
  return '2' + randomPart;
}

// Validate barcode format (8 digits starting with 2)
export function isValidBarcode(barcode: string): boolean {
  return /^2\d{7}$/.test(barcode);
}

// Generate UUID v4
// Uses 'uuid' package for compatibility with non-secure contexts
export function generateUUID(): string {
  return uuidv4();
}

// Format price from cents to display (e.g., 1999 -> "19.99")
export function formatPrice(cents: number): string {
  return String(Math.round(cents / 100));
}

// Parse price from input to cents (e.g., "19.99" -> 1999)
export function parsePrice(priceStr: string): number {
  const parsed = parseFloat(priceStr);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

// Format date for display
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format date for display (short version)
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
