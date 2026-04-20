import { format } from 'date-fns';
import type { ParsedTransaction, TransactionType } from './types';

const INCOME_KEYWORDS = [
  'lương','thu nhập','nhận','thưởng','cổ tức','hoàn tiền','chuyển khoản',
  'bán','hoa hồng','tiền lãi','trợ cấp','tiền thưởng','thu','được trả',
  'salary','wage','freelance','payment','paid','received','income','earn',
  'earned','bonus','dividend','refund','transfer','invoice','client','sold',
  'sale','deposit',
];

const EXPENSE_KEYWORDS = [
  'chi','mua','trả','tiêu','thanh toán','cà phê','cafe','ăn','ăn trưa',
  'ăn tối','ăn sáng','cơm','phở','bún','trà sữa','đồ uống','chợ','siêu thị',
  'taxi','grab','xăng','gửi xe','nhà','tiền nhà','điện','nước','internet',
  'điện thoại','thuê','hóa đơn','quần áo','giày','phim','game','spotify',
  'netflix','thuốc','bệnh viện','khám','học phí','sách',
  'spent','bought','buy','purchase','expense','food','coffee','lunch','dinner',
  'breakfast','groceries','uber','gas','rent','bill','utility','subscription',
  'shopping','clothes','movie','cinema','ticket',
];

function resolveRelativeDate(token: string): string | null {
  const now = new Date();
  const lower = token.toLowerCase();

  if (lower === 'today' || lower === 'hôm nay' || lower === 'homnay')
    return format(now, 'yyyy-MM-dd');

  if (lower === 'yesterday' || lower === 'hôm qua' || lower === 'homqua') {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  }

  if (lower === 'hôm kia' || lower === 'homkia') {
    const d = new Date(now); d.setDate(d.getDate() - 2);
    return format(d, 'yyyy-MM-dd');
  }

  const lastDayMatch = lower.match(/^last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (lastDayMatch) {
    const days: Record<string, number> = {
      sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6
    };
    const d = new Date(now);
    const diff = (d.getDay() - days[lastDayMatch[1]] + 7) % 7 || 7;
    d.setDate(d.getDate() - diff);
    return format(d, 'yyyy-MM-dd');
  }

  const vnDayMatch = lower.match(/^thứ\s*(hai|ba|tư|năm|sáu|bảy|2|3|4|5|6|7)\s*tuần\s*trước$/);
  if (vnDayMatch) {
    const vnDays: Record<string, number> = {
      hai:1,'2':1,ba:2,'3':2,tư:3,'4':3,năm:4,'5':4,sáu:5,'6':5,bảy:6,'7':6
    };
    const d = new Date(now);
    const target = vnDays[vnDayMatch[1]] ?? 0;
    const currentDay = d.getDay() === 0 ? 7 : d.getDay();
    const targetDay = target === 0 ? 7 : target;
    d.setDate(d.getDate() - ((currentDay - targetDay + 7) % 7) - 7);
    return format(d, 'yyyy-MM-dd');
  }

  return null;
}

function extractDate(tokens: string[]): { date: string; remaining: string[] } {
  const today = format(new Date(), 'yyyy-MM-dd');

  for (let i = 0; i < tokens.length; i++) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(tokens[i]))
      return { date: tokens[i], remaining: tokens.filter((_, j) => j !== i) };

    if (/^\d{1,2}\/\d{1,2}$/.test(tokens[i])) {
      const [a, b] = tokens[i].split('/').map(Number);
      const y = new Date().getFullYear();
      const date = a > 12
        ? `${y}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`
        : `${y}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`;
      return { date, remaining: tokens.filter((_, j) => j !== i) };
    }

    const relative = resolveRelativeDate(tokens[i]);
    if (relative) return { date: relative, remaining: tokens.filter((_, j) => j !== i) };

    if (i + 1 < tokens.length) {
      const rel = resolveRelativeDate(`${tokens[i]} ${tokens[i + 1]}`);
      if (rel) return { date: rel, remaining: tokens.filter((_, j) => j !== i && j !== i + 1) };
    }

    if (i + 2 < tokens.length) {
      const rel3 = resolveRelativeDate(`${tokens[i]} ${tokens[i+1]} ${tokens[i+2]}`);
      if (rel3) return { date: rel3, remaining: tokens.filter((_, j) => j !== i && j !== i+1 && j !== i+2) };
    }
  }
  return { date: today, remaining: tokens };
}

function parseAmount(token: string): number | null {
  const cleaned = token.replace(/[,$€£₹đ]/gi, '').trim();
  if (!cleaned) return null;

  const match = cleaned.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(k|tr|triệu|trieu|m)?$/i);
  if (!match) return null;

  const num = parseFloat(match[1].replace(',', '.'));
  if (isNaN(num) || num <= 0) return null;

  const suffix = (match[2] ?? '').toLowerCase();
  if (suffix === 'k') return num * 1000;
  if (['tr','triệu','trieu','m'].includes(suffix)) return num * 1000000;
  return num;
}

export function parseTransaction(text: string): ParsedTransaction | null {
  const raw = text.trim();
  if (!raw) return null;

  let tokens = raw.replace(/\s+/g, ' ').split(' ');
  let forceType: TransactionType | null = null;

  if (tokens[0].startsWith('+')) {
    forceType = 'income';
    tokens[0] = tokens[0].slice(1);
    if (!tokens[0]) tokens.shift();
  } else if (tokens[0].startsWith('-')) {
    forceType = 'expense';
    tokens[0] = tokens[0].slice(1);
    if (!tokens[0]) tokens.shift();
  }

  const { date, remaining } = extractDate(tokens);
  tokens = remaining;

  let amount: number | null = null;
  let amountIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const parsed = parseAmount(tokens[i]);
    if (parsed !== null) { amount = parsed; amountIdx = i; break; }
  }
  if (amount === null) return null;

  const descTokens = tokens.filter((_, i) => i !== amountIdx);
  const fullDescLower = descTokens.join(' ').toLowerCase();

  let type: TransactionType = 'expense';
  if (forceType) {
    type = forceType;
  } else {
    const hasIncome  = INCOME_KEYWORDS.some((kw) => fullDescLower.includes(kw));
    const hasExpense = EXPENSE_KEYWORDS.some((kw) => fullDescLower.includes(kw));
    if (hasIncome && !hasExpense) type = 'income';
  }

  const typeHintWords = new Set([
    ...INCOME_KEYWORDS.filter((kw) => !kw.includes(' ')),
    ...EXPENSE_KEYWORDS.filter((kw) => !kw.includes(' ')),
    'on','for','at','the','a','an','cho','của','và','với','tiền',
  ]);
  const cleanDesc = descTokens.filter((t) => !typeHintWords.has(t.toLowerCase())).join(' ').trim();

  return {
    type, amount,
    description: cleanDesc || descTokens.join(' ').trim() || raw,
    date, raw,
  };
}
