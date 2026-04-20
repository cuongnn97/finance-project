import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  ReceiptText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency, cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}

function SummaryCard({
  title,
  value,
  change,
  icon,
  iconBg,
  valueColor,
}: SummaryCardProps) {
  const up = (change ?? 0) >= 0;

  return (
    <Card className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-bold",
            valueColor ?? "text-gray-900",
          )}
        >
          {value}
        </p>
        {change !== undefined && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              up ? "text-green-600" : "text-red-500",
            )}
          >
            {up ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(change).toFixed(1)}% so với tháng trước
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl",
          iconBg,
        )}
      >
        {icon}
      </div>
    </Card>
  );
}

export function SummaryCards() {
  const { data, isLoading } = useDashboardSummary();
  const currency = useAuthStore((s) => s.profile?.currency ?? "VND");

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="flex h-28 items-center justify-center">
            <Spinner size="sm" />
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const savingsRate =
    data.total_income > 0
      ? ((data.total_income - data.total_expense) / data.total_income) * 100
      : 0;
  const savingsRateColor =
    savingsRate >= 20
      ? "text-emerald-600"
      : savingsRate >= 10
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        title="Số dư"
        value={formatCurrency(data.balance, currency)}
        icon={<Wallet className="h-5 w-5 text-brand-600" />}
        iconBg="bg-brand-50"
        valueColor={data.balance >= 0 ? "text-gray-900" : "text-red-600"}
      />
      <SummaryCard
        title="Thu nhập"
        value={formatCurrency(data.total_income, currency)}
        change={data.income_change}
        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        iconBg="bg-emerald-50"
        valueColor="text-emerald-700"
      />
      <SummaryCard
        title="Chi tiêu"
        value={formatCurrency(data.total_expense, currency)}
        change={data.expense_change}
        icon={<TrendingDown className="h-5 w-5 text-red-500" />}
        iconBg="bg-red-50"
        valueColor="text-red-600"
      />
      <SummaryCard
        title="Tỷ lệ tiết kiệm"
        value={`${savingsRate.toFixed(1)}%`}
        icon={<PiggyBank className="h-5 w-5 text-teal-600" />}
        iconBg="bg-teal-50"
        valueColor={savingsRateColor}
      />
      <SummaryCard
        title="Giao dịch"
        value={String(data.transaction_count)}
        icon={<ReceiptText className="h-5 w-5 text-purple-600" />}
        iconBg="bg-purple-50"
      />
    </div>
  );
}
