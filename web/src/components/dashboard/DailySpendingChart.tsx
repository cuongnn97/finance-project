import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDailySpending } from "@/hooks/useDashboard";
import { useAuthStore } from "@/store/authStore";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

interface DailySpendingChartProps {
  year: number;
  month: number;
}

export function DailySpendingChart({ year, month }: DailySpendingChartProps) {
  const { data = [], isLoading } = useDailySpending(year, month);
  const currency = useAuthStore((s) => s.profile?.currency ?? "VND");

  const today = new Date();
  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? today.getDate()
      : -1;

  const activeData = data.filter((d) => d.day <= (todayDay > 0 ? todayDay : data.length));
  const hasData = activeData.some((d) => d.expense > 0);

  // Average daily spend (only days with spending)
  const daysWithSpend = activeData.filter((d) => d.expense > 0).length;
  const totalSpend = activeData.reduce((s, d) => s + d.expense, 0);
  const avgDaily = daysWithSpend > 0 ? totalSpend / (todayDay > 0 ? todayDay : daysWithSpend) : 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Chi tiêu theo ngày</CardTitle>
          {avgDaily > 0 && (
            <p className="mt-0.5 text-xs text-gray-500">
              TB mỗi ngày:{" "}
              <span className="font-medium text-gray-700">
                {formatCompactCurrency(avgDaily, currency)}
              </span>
            </p>
          )}
        </div>
      </CardHeader>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : !hasData ? (
        <EmptyState title="Chưa có chi tiêu tháng này" className="py-6" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={activeData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            barCategoryGap="15%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval={activeData.length > 20 ? 4 : 1}
            />
            <YAxis
              tickFormatter={(v) => formatCompactCurrency(v, currency)}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={54}
            />
            <Tooltip
              formatter={(v: number) => [
                formatCurrency(v, currency),
                "Chi tiêu",
              ]}
              labelFormatter={(label) => `Ngày ${label}`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #f3f4f6",
                fontSize: 12,
              }}
              cursor={{ fill: "#f9fafb" }}
            />
            {avgDaily > 0 && (
              <ReferenceLine
                y={avgDaily}
                stroke="#9ca3af"
                strokeDasharray="4 3"
                label={{
                  value: "TB",
                  position: "right",
                  fontSize: 10,
                  fill: "#9ca3af",
                }}
              />
            )}
            <Bar dataKey="expense" radius={[3, 3, 0, 0]}>
              {activeData.map((entry) => (
                <Cell
                  key={entry.day}
                  fill={entry.day === todayDay ? "#6366f1" : "#f87171"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
