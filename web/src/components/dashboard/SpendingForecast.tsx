import { TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useDailySpending } from "@/hooks/useDashboard";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { useAuthStore } from "@/store/authStore";
import { formatCompactCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SpendingForecastProps {
  year: number;
  month: number;
}

export function SpendingForecast({ year, month }: SpendingForecastProps) {
  const { data: days = [], isLoading: loadingDays } = useDailySpending(year, month);
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary();
  const currency = useAuthStore((s) => s.profile?.currency ?? "VND");

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getDate() : null;
  const daysInMonth = new Date(year, month, 0).getDate();

  const elapsed = todayDay ?? daysInMonth;
  const pastDays = days.slice(0, elapsed);
  const totalSpent = pastDays.reduce((s, d) => s + d.expense, 0);
  const avgDaily = elapsed > 0 ? totalSpent / elapsed : 0;
  const daysLeft = daysInMonth - elapsed;
  const projectedExtra = avgDaily * daysLeft;
  const projectedTotal = totalSpent + projectedExtra;

  const income = summary?.total_income ?? 0;
  const projectedBalance = income - projectedTotal;
  const isOnTrack = projectedBalance >= 0;

  const items = [
    {
      label: "TB chi/ngày",
      value: formatCompactCurrency(avgDaily, currency),
      sub: `${elapsed} ngày đã qua`,
    },
    {
      label: "Dự kiến tổng chi",
      value: formatCompactCurrency(projectedTotal, currency),
      sub: `còn ${daysLeft} ngày`,
    },
    {
      label: isOnTrack ? "Dư kiến dư" : "Dự kiến thiếu",
      value: formatCompactCurrency(Math.abs(projectedBalance), currency),
      sub: isOnTrack ? "cuối tháng" : "vượt thu nhập",
      accent: isOnTrack ? "text-emerald-600" : "text-red-600",
    },
  ];

  const isLoading = loadingDays || loadingSummary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dự báo tháng này</CardTitle>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            isOnTrack
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600",
          )}
        >
          {isOnTrack ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {isOnTrack ? "Đang ổn" : "Cần chú ý"}
        </div>
      </CardHeader>

      {isLoading ? (
        <div className="flex h-28 items-center justify-center">
          <Spinner />
        </div>
      ) : avgDaily === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Zap className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Chưa có đủ dữ liệu</p>
        </div>
      ) : (
        <dl className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <dt className="text-sm text-gray-500">{item.label}</dt>
                <dd className="text-xs text-gray-400">{item.sub}</dd>
              </div>
              <span
                className={cn(
                  "text-base font-semibold",
                  item.accent ?? "text-gray-900",
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
