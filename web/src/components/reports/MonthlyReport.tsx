import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMonthlyReport } from '@/hooks/useReports';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface MonthlyReportProps {
  year:  number;
  month: number;
}

export function MonthlyReport({ year, month }: MonthlyReportProps) {
  const { data, isLoading } = useMonthlyReport(year, month);
  const currency = useAuthStore((s) => s.profile?.currency ?? 'USD');

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Generating report…" />
      </div>
    );
  }

  if (!data) return null;

  const isEmpty = data.total_income === 0 && data.total_expense === 0;

  // Category bar chart data
  const maxCategories = 8;
  const expenseChartData = data.expense_by_category
    .slice(0, maxCategories)
    .map((c) => ({ name: c.category_name ?? 'Other', amount: Number(c.total), color: c.category_color ?? '#d1d5db' }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Income',  value: data.total_income,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Expenses',value: data.total_expense, color: 'text-red-600',     bg: 'bg-red-50'     },
          { label: 'Net Balance',   value: data.balance,       color: data.balance >= 0 ? 'text-gray-900' : 'text-red-600', bg: 'bg-gray-50' },
        ].map((s) => (
          <Card key={s.label} className={cn('text-center', s.bg)}>
            <p className="text-sm font-medium text-gray-500">{s.label}</p>
            <p className={cn('mt-1 text-2xl font-bold', s.color)}>
              {formatCurrency(s.value, currency)}
            </p>
          </Card>
        ))}
      </div>

      {isEmpty ? (
        <EmptyState title="No transactions this month" />
      ) : (
        <>
          {/* Expense breakdown chart */}
          {expenseChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={expenseChartData} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, currency).replace(/\.00$/, '')} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v, currency)}
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #f3f4f6' }}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Income by category */}
          {data.income_by_category.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Income Sources</CardTitle>
              </CardHeader>
              <ul className="space-y-2">
                {data.income_by_category.map((c) => (
                  <li key={c.category_id ?? 'other'} className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.category_color ?? '#d1d5db' }} />
                    <span className="flex-1 text-sm text-gray-700">{c.category_name ?? 'Uncategorised'}</span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(Number(c.total), currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Top 5 expenses */}
          {data.top_expenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Expenses</CardTitle>
              </CardHeader>
              <ul className="divide-y divide-gray-50">
                {data.top_expenses.map((tx, i) => (
                  <li key={tx.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {tx.description || tx.category?.name || 'Uncategorised'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tx.category && <Badge variant="default" size="sm">{tx.category.name}</Badge>}
                      <span className="text-sm font-semibold text-red-600">
                        -{formatCurrency(tx.amount, currency)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
