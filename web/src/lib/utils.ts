import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// ============================================================
// Tailwind utility
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// Currency formatting
// ============================================================

export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency = 'USD'): string {
  if (Math.abs(amount) >= 1_000_000) {
    return formatCurrency(amount / 1_000_000, currency).replace(/\.00$/, '') + 'M';
  }
  if (Math.abs(amount) >= 1_000) {
    return formatCurrency(amount / 1_000, currency).replace(/\.00$/, '') + 'K';
  }
  return formatCurrency(amount, currency);
}

// ============================================================
// Date utilities
// ============================================================

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy');
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d');
}

export function formatMonthYear(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM yyyy');
}

export function toDateInputValue(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function getCurrentMonthRange() {
  const now = new Date();
  return {
    from: format(startOfMonth(now), 'yyyy-MM-dd'),
    to: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

export function getMonthRange(year: number, month: number) {
  const date = new Date(year, month - 1, 1);
  return {
    from: format(startOfMonth(date), 'yyyy-MM-dd'),
    to: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
}

export function getPreviousMonthRange() {
  const now = new Date();
  const prev = subMonths(now, 1);
  return {
    from: format(startOfMonth(prev), 'yyyy-MM-dd'),
    to: format(endOfMonth(prev), 'yyyy-MM-dd'),
  };
}

export function getLast12Months(): Array<{ year: number; month: number; label: string }> {
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: format(d, 'MMM yyyy'),
    });
  }
  return result;
}

// ============================================================
// Percentage change
// ============================================================

export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ============================================================
// Color utilities
// ============================================================

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================================
// Misc
// ============================================================

export function generateId(): string {
  return crypto.randomUUID();
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

export const ICON_OPTIONS = [
  'briefcase', 'laptop', 'trending-up', 'plus-circle',
  'utensils', 'car', 'home', 'film', 'shopping-bag',
  'heart', 'book-open', 'zap', 'minus-circle', 'coffee',
  'plane', 'music', 'gift', 'phone', 'globe', 'wallet',
  'piggy-bank', 'dollar-sign', 'credit-card', 'bar-chart',
];

export const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#78716c', '#6b7280', '#14b8a6', '#0ea5e9', '#a855f7',
];
