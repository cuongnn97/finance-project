import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../lib/supabase.js';
import type { Profile, Category, Transaction, ParsedTransaction, BalanceSummary } from '../types/index.js';

// ============================================================
// Profile
// ============================================================

export async function getProfileByChatId(chatId: number): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function linkTelegramAccount(userId: string, chatId: number): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ telegram_chat_id: chatId })
    .eq('id', userId);

  return !error;
}

// ============================================================
// Categories
// ============================================================

export async function getCategoriesByType(
  userId: string,
  type: 'income' | 'expense'
): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('name', { ascending: true });

  if (error) return [];
  return (data ?? []) as Category[];
}

export async function matchCategory(
  userId: string,
  type: 'income' | 'expense',
  description: string
): Promise<Category | null> {
  const categories = await getCategoriesByType(userId, type);
  if (!categories.length) return null;

  const lower = description.toLowerCase();

  // Exact name match
  const exact = categories.find((c) => lower.includes(c.name.toLowerCase()));
  if (exact) return exact;

  // Find default category for that type
  const defaultCat = categories.find((c) => c.is_default && c.name.toLowerCase().includes('other'));
  return defaultCat ?? categories[0];
}

// ============================================================
// Transactions
// ============================================================

export async function createTransaction(
  profile: Profile,
  parsed: ParsedTransaction,
  categoryId: string | null
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id:     profile.id,
      category_id: categoryId,
      type:        parsed.type,
      amount:      parsed.amount,
      description: parsed.description,
      date:        parsed.date,
      source:      'telegram',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Transaction;
}

// ============================================================
// Balance / Reports
// ============================================================

export async function getMonthlyBalance(userId: string, date = new Date()): Promise<BalanceSummary> {
  const from = format(startOfMonth(date), 'yyyy-MM-dd');
  const to   = format(endOfMonth(date),   'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ type: string; amount: number }>;
  const total_income  = rows.filter((r) => r.type === 'income') .reduce((s, r) => s + r.amount, 0);
  const total_expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);

  return { total_income, total_expense, balance: total_income - total_expense };
}

export async function getRecentTransactions(
  userId: string,
  limit = 5
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as Transaction[];
}
