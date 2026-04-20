import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMonthlyTrend } from "@/hooks/useDashboard";
import { useAuthStore } from "@/store/authStore";
import { formatCompactCurrency } from "@/lib/utils";
import { subMonths, format } from "date-fns";

function getLast6Months() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    return {
      monthStr: format(d, "yyyy-MM-01"),
      label: `T${d.getMonth() + 1}/${d.getFullYear()}`,
    };
  });
}

export function MonthlyTrendChart() {
  const { data: raw = [], isLoading } = useMonthlyTrend();
  const currency = useAuthStore((s) => s.profile?.currency ?? "VND");

  const last6 = getLast6Months();

  const chartData = last6.map(({ monthStr, label }) => {
    const incomeRow = raw.find(
      (r) => r.month === monthStr && r.type === "income",
    );
    const expenseRow = raw.find(
      (r) => r.month === monthStr && r.type === "expense",
    );
    return {
      label,
      income: Number(incomeRow?.total ?? 0),
      expense: Number(expenseRow?.total ?? 0),
    };
  });

  const hasData = chartData.some((d) => d.income > 0 || d.expense > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xu hướng 6 tháng</CardTitle>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Thu nhập
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
            Chi tiêu
          </span>
        </div>
      </CardHeader>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center">
          <Spinner />
        </div>
      ) : !hasData ? (
        <EmptyState title="Chưa có dữ liệu" className="py-8" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            barCategoryGap="30%"
            barGap={3}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatCompactCurrency(v, currency)}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              formatter={(v: number, name: string) => [
                formatCompactCurrency(v, currency),
                name === "income" ? "Thu nhập" : "Chi tiêu",
              ]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #f3f4f6",
                fontSize: 12,
              }}
              cursor={{ fill: "#f9fafb" }}
            />
            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
