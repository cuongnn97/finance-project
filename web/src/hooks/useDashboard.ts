import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import {
  getCurrentMonthRange,
  getPreviousMonthRange,
  calcPercentChange,
  getMonthRange,
} from '@/lib/utils';
import type { DashboardSummary, CategorySpending } from '@/types';

export function useDashboardSummary() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['dashboard', 'summary', userId],
    queryFn: async (): Promise<DashboardSummary> => {
      const current  = getCurrentMonthRange();
      const previous = getPreviousMonthRange();

      const [currentData, previousData] = await Promise.all([
        supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', userId!)
          .gte('date', current.from)
          .lte('date', current.to),
        supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', userId!)
          .gte('date', previous.from)
          .lte('date', previous.to),
      ]);

      if (currentData.error)  throw currentData.error;
      if (previousData.error) throw previousData.error;

      const sum = (rows: Array<{ type: string; amount: number }>, type: string) =>
        rows.filter((r) => r.type === type).reduce((acc, r) => acc + r.amount, 0);

      const curr_income  = sum(currentData.data  ?? [], 'income');
      const curr_expense = sum(currentData.data  ?? [], 'expense');
      const prev_income  = sum(previousData.data ?? [], 'income');
      const prev_expense = sum(previousData.data ?? [], 'expense');

      return {
        balance:           curr_income - curr_expense,
        total_income:      curr_income,
        total_expense:     curr_expense,
        income_change:     calcPercentChange(curr_income,  prev_income),
        expense_change:    calcPercentChange(curr_expense, prev_expense),
        transaction_count: (currentData.data ?? []).length,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCategorySpending(year: number, month: number) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['dashboard', 'category-spending', userId, year, month],
    queryFn: async (): Promise<CategorySpending[]> => {
      const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('category_spending')
        .select('*')
        .eq('user_id', userId!)
        .eq('month', monthStr)
        .eq('type', 'expense')
        .order('total', { ascending: false });

      if (error) throw error;
      return (data ?? []) as CategorySpending[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useMonthlyTrend() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['dashboard', 'monthly-trend', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_summary')
        .select('*')
        .eq('user_id', userId!)
        .order('month', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDailySpending(year: number, month: number) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['dashboard', 'daily-spending', userId, year, month],
    queryFn: async () => {
      const range = getMonthRange(year, month);
      const { data, error } = await supabase
        .from('transactions')
        .select('date, amount, type')
        .eq('user_id', userId!)
        .gte('date', range.from)
        .lte('date', range.to);

      if (error) throw error;

      const byDate = new Map<string, { expense: number; income: number }>();
      for (const t of data ?? []) {
        const entry = byDate.get(t.date) ?? { expense: 0, income: 0 };
        if (t.type === 'expense') entry.expense += Number(t.amount);
        else entry.income += Number(t.amount);
        byDate.set(t.date, entry);
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const entry = byDate.get(dateStr) ?? { expense: 0, income: 0 };
        return { day, date: dateStr, expense: entry.expense, income: entry.income };
      });
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}
