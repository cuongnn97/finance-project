import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  PaginatedResult,
} from '@/types';

const PAGE_SIZE = 20;

// ============================================================
// Query Keys
// ============================================================

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters, page: number) =>
    [...transactionKeys.lists(), filters, page] as const,
  detail: (id: string) => [...transactionKeys.all, id] as const,
  recent: (n: number) => [...transactionKeys.all, 'recent', n] as const,
};

// ============================================================
// Fetch helpers
// ============================================================

async function fetchTransactions(
  userId: string,
  filters: TransactionFilters,
  page: number
): Promise<PaginatedResult<Transaction>> {
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let query = supabase
    .from('transactions')
    .select('*, category:categories(*)', { count: 'exact' })
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.type)        query = query.eq('type', filters.type);
  if (filters.category_id) query = query.eq('category_id', filters.category_id);
  if (filters.date_from)   query = query.gte('date', filters.date_from);
  if (filters.date_to)     query = query.lte('date', filters.date_to);
  if (filters.search) {
    query = query.ilike('description', `%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: (data ?? []) as Transaction[],
    meta: {
      page,
      page_size: PAGE_SIZE,
      total,
      total_pages: Math.ceil(total / PAGE_SIZE),
    },
  };
}

async function fetchRecentTransactions(
  userId: string,
  limit: number
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Transaction[];
}

// ============================================================
// Hooks
// ============================================================

export function useTransactions(filters: TransactionFilters = {}, page = 1) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: transactionKeys.list(filters, page),
    queryFn: () => fetchTransactions(userId!, filters, page),
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}

export function useRecentTransactions(limit = 5) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: transactionKeys.recent(limit),
    queryFn: () => fetchRecentTransactions(userId!, limit),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const toast = useUIStore((s) => s.toast);

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...input, user_id: userId })
        .select('*, category:categories(*)')
        .single();
      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Transaction added');
    },
    onError: (err: Error) => {
      toast.error('Failed to add transaction', err.message);
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  const toast = useUIStore((s) => s.toast);

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTransactionInput) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(input)
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();
      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Transaction updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to update transaction', err.message);
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const toast = useUIStore((s) => s.toast);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Transaction deleted');
    },
    onError: (err: Error) => {
      toast.error('Failed to delete transaction', err.message);
    },
  });
}
