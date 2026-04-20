import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { MonthlyReport } from "@/components/reports/MonthlyReport";

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const MONTH_OPTIONS = [
  { value: "1", label: "Tháng 1" },
  { value: "2", label: "Tháng 2" },
  { value: "3", label: "Tháng 3" },
  { value: "4", label: "Tháng 4" },
  { value: "5", label: "Tháng 5" },
  { value: "6", label: "Tháng 6" },
  { value: "7", label: "Tháng 7" },
  { value: "8", label: "Tháng 8" },
  { value: "9", label: "Tháng 9" },
  { value: "10", label: "Tháng 10" },
  { value: "11", label: "Tháng 11" },
  { value: "12", label: "Tháng 12" },
];

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const goBack = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const goForward = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Báo cáo</h1>
        <p className="text-sm text-gray-500">Phân tích tài chính hàng tháng</p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={goBack}
          aria-label="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Select
            options={MONTH_OPTIONS}
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-36"
          />
          <Select
            options={YEAR_OPTIONS}
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goForward}
          disabled={isCurrentMonth}
          aria-label="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <span className="hidden sm:block text-sm font-medium text-gray-700">
          Tháng {month}/{year}
        </span>
      </div>

      {/* Report content */}
      <MonthlyReport year={year} month={month} />
    </div>
  );
}
