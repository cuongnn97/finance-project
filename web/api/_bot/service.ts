import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from './supabase';
import type { Profile, Category, Transaction, ParsedTransaction, BalanceSummary } from './types';

// ── Profile ──────────────────────────────────────────────────

export async function getProfileByChatId(chatId: number): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('telegram_chat_id', chatId).single();
  if (error || !data) return null;
  return data as Profile;
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return data as Profile;
}

export async function linkTelegramAccount(userId: string, chatId: number): Promise<boolean> {
  const { error } = await supabase
    .from('profiles').update({ telegram_chat_id: chatId }).eq('id', userId);
  return !error;
}

// ── Categories ───────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'ăn uống':    ['cà phê','cafe','coffee','trà sữa','ăn','cơm','phở','bún','bánh mì','chợ','siêu thị','thực phẩm','food','lunch','dinner','breakfast','groceries','restaurant','quán','nhà hàng','snack'],
  'di chuyển':  ['grab','taxi','uber','gojek','be','xăng','đổ xăng','gửi xe','vé xe','xe buýt','bus','tàu','metro','máy bay','sửa xe','rửa xe','parking','ship','vận chuyển'],
  'nhà ở':      ['tiền nhà','thuê nhà','rent','điện','nước','internet','wifi','gas','chung cư','phí quản lý','sửa nhà','đồ gia dụng','giặt'],
  'giải trí':   ['phim','cinema','movie','netflix','spotify','youtube','game','karaoke','bar','club','concert','du lịch','travel','khách sạn','hotel','nhạc','music'],
  'mua sắm':    ['quần áo','áo','quần','giày','dép','túi','mỹ phẩm','son','shopee','lazada','tiki','amazon','online','điện thoại','laptop','tai nghe','đồ điện tử'],
  'sức khỏe':   ['thuốc','bệnh viện','khám','bác sĩ','nha khoa','gym','tập','yoga','vitamin','bảo hiểm y tế'],
  'giáo dục':   ['học phí','học','khóa học','course','sách','book','udemy','coursera','gia sư','lớp','trường'],
  'hóa đơn':    ['hóa đơn','bill','thuế','phí','bảo hiểm','trả góp','subscription','đăng ký'],
  'lương':      ['lương','salary','wage','pay'],
  'freelance':  ['freelance','dự án','project','client','khách hàng','hợp đồng','contract','thiết kế','design','code','dev'],
  'đầu tư':     ['cổ tức','dividend','lãi','interest','đầu tư','invest','chứng khoán','stock','crypto','tiết kiệm'],
  'thu nhập khác': ['thưởng','bonus','hoàn tiền','refund','bán','sold','cho thuê','hoa hồng','commission'],
};

async function getCategoriesByType(userId: string, type: 'income' | 'expense'): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories').select('*').eq('user_id', userId).eq('type', type).order('name');
  if (error) return [];
  return (data ?? []) as Category[];
}

export async function matchCategory(userId: string, type: 'income' | 'expense', description: string): Promise<Category | null> {
  const categories = await getCategoriesByType(userId, type);
  if (!categories.length) return null;

  const lower = description.toLowerCase();
  const exact = categories.find((c) => lower.includes(c.name.toLowerCase()));
  if (exact) return exact;

  for (const cat of categories) {
    const keywords = CATEGORY_KEYWORDS[cat.name.toLowerCase()];
    if (keywords?.some((kw) => lower.includes(kw))) return cat;
  }

  const fallbacks = type === 'expense' ? ['chi phí khác','khác','other'] : ['thu nhập khác','khác','other'];
  return categories.find((c) => fallbacks.some((n) => c.name.toLowerCase().includes(n))) ?? categories[0];
}

// ── Transactions ─────────────────────────────────────────────

export async function createTransaction(
  profile: Profile,
  parsed: ParsedTransaction,
  categoryId: string | null,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ user_id: profile.id, category_id: categoryId, type: parsed.type, amount: parsed.amount, description: parsed.description, date: parsed.date, source: 'telegram' })
    .select().single();
  if (error) throw error;
  return data as Transaction;
}

export async function getMonthlyBalance(userId: string, date = new Date()): Promise<BalanceSummary> {
  const { data, error } = await supabase
    .from('transactions').select('type, amount').eq('user_id', userId)
    .gte('date', format(startOfMonth(date), 'yyyy-MM-dd'))
    .lte('date', format(endOfMonth(date),  'yyyy-MM-dd'));
  if (error) throw error;

  const rows = (data ?? []) as Array<{ type: string; amount: number }>;
  const total_income  = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const total_expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  return { total_income, total_expense, balance: total_income - total_expense };
}

export async function getRecentTransactions(userId: string, limit = 5): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions').select('*, category:categories(*)').eq('user_id', userId)
    .order('date', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (error) return [];
  return (data ?? []) as Transaction[];
}
