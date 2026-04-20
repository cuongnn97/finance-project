import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCategorySpending } from "@/hooks/useDashboard";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";

const RADIAN = Math.PI / 180;

function CustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

interface ExpenseChartProps {
  year: number;
  month: number;
}

export function ExpenseChart({ year, month }: ExpenseChartProps) {
  const { data = [], isLoading } = useCategorySpending(year, month);
  const currency = useAuthStore((s) => s.profile?.currency ?? "VND");

  const chartData = data.map((d) => ({
    name: d.category_name ?? "Chưa phân loại",
    value: Number(d.total),
    color: d.category_color ?? "#d1d5db",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi tiêu theo danh mục</CardTitle>
      </CardHeader>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center">
          <Spinner />
        </div>
      ) : chartData.length === 0 ? (
        <EmptyState title="Chưa có chi tiêu tháng này" className="py-8" />
      ) : (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel as React.FC}
                outerRadius={90}
                dataKey="value"
              >
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => formatCurrency(v, currency)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #f3f4f6",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <ul className="space-y-2">
            {chartData.slice(0, 5).map((item) => (
              <li key={item.name} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-600">
                  {item.name}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCompactCurrency(item.value, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
