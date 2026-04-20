import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types';

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
};

async function fetchCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('type', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

export function useCategories() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => fetchCategories(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategoriesByType(type: 'income' | 'expense') {
  const { data: categories = [], ...rest } = useCategories();
  return {
    ...rest,
    data: categories.filter((c) => c.type === type),
  };
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const toast = useUIStore((s) => s.toast);

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success('Category created');
    },
    onError: (err: Error) => {
      toast.error('Failed to create category', err.message);
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const toast = useUIStore((s) => s.toast);

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCategoryInput) => {
      const { data, error } = await supabase
        .from('categories')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success('Category updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to update category', err.message);
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const toast = useUIStore((s) => s.toast);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success('Category deleted');
    },
    onError: (err: Error) => {
      toast.error('Failed to delete category', err.message);
    },
  });
}
