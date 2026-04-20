import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useAuthStore } from '@/store/authStore';
import { formatMonthYear } from '@/lib/utils';

export default function DashboardPage() {
  const [formOpen, setFormOpen] = useState(false);
  const profile = useAuthStore((s) => s.profile);

  const now = new Date();
  const currentMonthLabel = formatMonthYear(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Good {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-sm text-gray-500">{currentMonthLabel} overview</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
          Add Transaction
        </Button>
      </div>

      {/* KPI cards */}
      <SummaryCards />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <RecentTransactions />
        <ExpenseChart year={now.getFullYear()} month={now.getMonth() + 1} />
      </div>

      {/* Transaction form */}
      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
