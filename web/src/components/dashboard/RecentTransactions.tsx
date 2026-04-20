import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRecentTransactions } from '@/hooks/useTransactions';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

export function RecentTransactions() {
  const { data = [], isLoading } = useRecentTransactions(8);
  const currency = useAuthStore((s) => s.profile?.currency ?? 'USD');

  return (
    <Card padding="none">
      <div className="px-5 pt-5">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Add your first income or expense"
          className="py-10"
        />
      ) : (
        <ul className="divide-y divide-gray-50">
          {data.map((tx) => (
            <li key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
              {/* Category dot */}
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: tx.category?.color ?? '#d1d5db' }}
              />

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {tx.description || tx.category?.name || 'Uncategorised'}
                </p>
                <p className="text-xs text-gray-400">
                  {tx.category?.name ?? 'No category'} · {formatDate(tx.date)}
                </p>
              </div>

              {/* Amount */}
              <div className="flex flex-col items-end gap-1">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {formatCurrency(tx.amount, currency)}
                </span>
                <Badge variant={tx.type === 'income' ? 'income' : 'expense'} size="sm">
                  {tx.type}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
