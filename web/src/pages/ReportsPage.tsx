import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { MonthlyReport } from '@/components/reports/MonthlyReport';
import { formatMonthYear } from '@/lib/utils';

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2000, i, 1);
  return {
    value: String(i + 1),
    label: d.toLocaleString('default', { month: 'long' }),
  };
});

export default function ReportsPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const goBack = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const goForward = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Monthly financial analysis</p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={goBack} aria-label="Previous month">
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
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <span className="hidden sm:block text-sm font-medium text-gray-700">
          {formatMonthYear(`${year}-${String(month).padStart(2, '0')}-01`)}
        </span>
      </div>

      {/* Report content */}
      <MonthlyReport year={year} month={month} />
    </div>
  );
}
