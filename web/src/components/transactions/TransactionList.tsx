import { useState } from 'react';
import { Pencil, Trash2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDeleteTransaction } from '@/hooks/useTransactions';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Transaction, PaginatedResult } from '@/types';

interface TransactionListProps {
  result:    PaginatedResult<Transaction> | undefined;
  isLoading: boolean;
  page:      number;
  onPageChange: (p: number) => void;
  onEdit:    (tx: Transaction) => void;
}

function ConfirmDelete({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Delete?</span>
      <Button size="xs" variant="danger" onClick={onConfirm} loading={loading}>
        Yes
      </Button>
      <Button size="xs" variant="ghost" onClick={onCancel}>
        No
      </Button>
    </div>
  );
}

export function TransactionList({
  result,
  isLoading,
  page,
  onPageChange,
  onEdit,
}: TransactionListProps) {
  const currency = useAuthStore((s) => s.profile?.currency ?? 'USD');
  const deleteMutation = useDeleteTransaction();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner label="Loading transactions…" />
      </div>
    );
  }

  const transactions = result?.data ?? [];
  const meta = result?.meta;

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        description="Try adjusting your filters or add a new transaction."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Table header (desktop) */}
      <div className="hidden grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 text-xs font-medium uppercase tracking-wide text-gray-400 sm:grid">
        <span className="w-3" />
        <span>Description</span>
        <span className="text-right">Amount</span>
        <span>Date</span>
        <span className="w-24" />
      </div>

      {/* Rows */}
      <ul className="space-y-2">
        {transactions.map((tx) => (
          <li
            key={tx.id}
            className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm hover:border-gray-200 transition-colors sm:grid-cols-[auto_1fr_auto_auto_auto]"
          >
            {/* Color dot */}
            <div className="flex items-center">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: tx.category?.color ?? '#d1d5db' }}
              />
            </div>

            {/* Info */}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {tx.description || tx.category?.name || 'Uncategorised'}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {tx.category && (
                  <Badge variant="default" size="sm">{tx.category.name}</Badge>
                )}
                <Badge variant={tx.type === 'income' ? 'income' : 'expense'} size="sm">
                  {tx.type}
                </Badge>
                {tx.source === 'telegram' && (
                  <span className="flex items-center gap-0.5 text-xs text-blue-500">
                    <Send className="h-3 w-3" /> Telegram
                  </span>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-end">
              <span className={cn('text-sm font-semibold', tx.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
              </span>
            </div>

            {/* Date */}
            <div className="hidden items-center sm:flex">
              <span className="text-sm text-gray-400">{formatDate(tx.date)}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1">
              {confirmId === tx.id ? (
                <ConfirmDelete
                  onConfirm={async () => {
                    await deleteMutation.mutateAsync(tx.id);
                    setConfirmId(null);
                  }}
                  onCancel={() => setConfirmId(null)}
                  loading={deleteMutation.isPending}
                />
              ) : (
                <>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onEdit(tx)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setConfirmId(tx.id)}
                    aria-label="Delete"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            {meta.total} result{meta.total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              {page} / {meta.total_pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= meta.total_pages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
