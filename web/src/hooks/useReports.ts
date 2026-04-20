import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { getMonthRange } from '@/lib/utils';
import type { MonthlyReport, Transaction, CategorySpending } from '@/types';

export function useMonthlyReport(year: number, month: number) {
  const userId = useAuthStore((s) => s.user?.id);
  const { from, to } = getMonthRange(year, month);
  const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;

  return useQuery({
    queryKey: ['reports', 'monthly', userId, year, month],
    queryFn: async (): Promise<MonthlyReport> => {
      const [txResult, spendingResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .eq('user_id', userId!)
          .gte('date', from)
          .lte('date', to)
          .order('date', { ascending: false }),

        supabase
          .from('category_spending')
          .select('*')
          .eq('user_id', userId!)
          .eq('month', monthStr),
      ]);

      if (txResult.error)       throw txResult.error;
      if (spendingResult.error) throw spendingResult.error;

      const transactions = (txResult.data ?? []) as Transaction[];
      const spending     = (spendingResult.data ?? []) as CategorySpending[];

      const total_income  = transactions
        .filter((t) => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

      const total_expense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

      const top_expenses = transactions
        .filter((t) => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        month: from,
        total_income,
        total_expense,
        balance: total_income - total_expense,
        income_by_category:  spending.filter((s) => s.type === 'income'),
        expense_by_category: spending.filter((s) => s.type === 'expense'),
        top_expenses,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
