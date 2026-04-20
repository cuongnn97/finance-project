import { format } from 'date-fns';
import type { ParsedTransaction, TransactionType } from '../types/index.js';

// ============================================================
// Natural language transaction parser
//
// Supported formats:
//   expense:
//     "spent 50 on coffee"
//     "bought groceries 85.50"
//     "-120 taxi"
//     "expense 200 rent"
//     "food 35"           <- any known keyword triggers expense
//
//   income:
//     "received 5000 salary"
//     "got paid 1200 freelance"
//     "+3000 bonus"
//     "income 500"
//
//   With date:
//     "50 coffee yesterday"
//     "100 salary 2026-04-01"
//     "coffee 30 last monday"
// ============================================================

const INCOME_KEYWORDS = [
  'salary', 'wage', 'freelance', 'payment', 'paid', 'received',
  'income', 'earn', 'earned', 'bonus', 'dividend', 'refund', 'transfer',
  'invoice', 'client', 'sold', 'sale', 'deposit',
];

const EXPENSE_KEYWORDS = [
  'spent', 'bought', 'paid', 'buy', 'purchase', 'expense',
  'food', 'coffee', 'lunch', 'dinner', 'breakfast', 'groceries',
  'taxi', 'uber', 'gas', 'rent', 'bill', 'utility', 'subscription',
  'shopping', 'clothes', 'movie', 'cinema', 'ticket',
];

// Relative date patterns
function resolveRelativeDate(token: string): string | null {
  const now   = new Date();
  const lower = token.toLowerCase();

  if (lower === 'today')     return format(now, 'yyyy-MM-dd');
  if (lower === 'yesterday') {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  }
  const lastDayMatch = lower.match(/^last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (lastDayMatch) {
    const days: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const target = days[lastDayMatch[1]];
    const d = new Date(now);
    const diff = (d.getDay() - target + 7) % 7 || 7;
    d.setDate(d.getDate() - diff);
    return format(d, 'yyyy-MM-dd');
  }
  return null;
}

function extractDate(tokens: string[]): { date: string; remaining: string[] } {
  const today = format(new Date(), 'yyyy-MM-dd');

  for (let i = 0; i < tokens.length; i++) {
    // ISO date: 2026-04-15
    if (/^\d{4}-\d{2}-\d{2}$/.test(tokens[i])) {
      return { date: tokens[i], remaining: tokens.filter((_, j) => j !== i) };
    }
    // Short date: 15/04 or 04/15
    if (/^\d{1,2}\/\d{1,2}$/.test(tokens[i])) {
      const [a, b] = tokens[i].split('/').map(Number);
      const y = new Date().getFullYear();
      const date = a > 12
        ? `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
        : `${y}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
      return { date, remaining: tokens.filter((_, j) => j !== i) };
    }
    // Relative: yesterday, today, last monday…
    const relative = resolveRelativeDate(tokens[i]);
    if (relative) {
      return { date: relative, remaining: tokens.filter((_, j) => j !== i) };
    }
    // "last monday" is two tokens
    if (lower(tokens[i]) === 'last' && i + 1 < tokens.length) {
      const combined = `last ${tokens[i + 1]}`;
      const rel = resolveRelativeDate(combined);
      if (rel) {
        return { date: rel, remaining: tokens.filter((_, j) => j !== i && j !== i + 1) };
      }
    }
  }
  return { date: today, remaining: tokens };
}

function lower(s: string): string {
  return s.toLowerCase();
}

/**
 * Parse a free-form text message into a transaction.
 * Returns null if no valid amount is found.
 */
export function parseTransaction(text: string): ParsedTransaction | null {
  const raw = text.trim();
  if (!raw) return null;

  // Normalise: remove multiple spaces
  const normalised = raw.replace(/\s+/g, ' ');
  const tokens = normalised.split(' ');

  // --- Detect explicit +/- prefix ---
  let forceType: TransactionType | null = null;
  let workTokens = [...tokens];

  const firstToken = workTokens[0];
  if (firstToken.startsWith('+')) {
    forceType = 'income';
    workTokens[0] = firstToken.slice(1);
    if (!workTokens[0]) workTokens.shift();
  } else if (firstToken.startsWith('-')) {
    forceType = 'expense';
    workTokens[0] = firstToken.slice(1);
    if (!workTokens[0]) workTokens.shift();
  }

  // --- Extract date ---
  const { date, remaining } = extractDate(workTokens);
  workTokens = remaining;

  // --- Extract amount (first numeric token) ---
  let amount: number | null = null;
  let amountIdx = -1;
  for (let i = 0; i < workTokens.length; i++) {
    const cleaned = workTokens[i].replace(/[,$€£₹]/g, '');
    const parsed  = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      amount   = parsed;
      amountIdx = i;
      break;
    }
  }

  if (amount === null) return null;

  // --- Remaining words = description keywords ---
  const descTokens = workTokens.filter((_, i) => i !== amountIdx);
  const descLower  = descTokens.map(lower);

  // --- Determine type ---
  let type: TransactionType = 'expense';

  if (forceType) {
    type = forceType;
  } else {
    const hasIncome  = INCOME_KEYWORDS.some((kw) => descLower.some((t) => t.includes(kw)));
    const hasExpense = EXPENSE_KEYWORDS.some((kw) => descLower.some((t) => t.includes(kw)));

    if (hasIncome && !hasExpense) {
      type = 'income';
    } else if (hasExpense) {
      type = 'expense';
    }
    // Default: expense
  }

  // --- Build description (remove type-hint words) ---
  const typeHintWords = new Set([...INCOME_KEYWORDS, ...EXPENSE_KEYWORDS, 'on', 'for', 'at', 'the', 'a', 'an']);
  const cleanDesc = descTokens
    .filter((t) => !typeHintWords.has(lower(t)))
    .join(' ')
    .trim();

  return {
    type,
    amount,
    description: cleanDesc || descTokens.join(' ').trim() || raw,
    date,
    raw,
  };
}
