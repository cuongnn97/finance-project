import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { transactionFilterSchema } from '@/schemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/hooks/useCategories';
import type { TransactionFilters } from '@/types';

interface Props {
  filters:   TransactionFilters;
  onChange:  (f: TransactionFilters) => void;
  onReset:   () => void;
}

const typeOptions = [
  { value: '',        label: 'All Types'  },
  { value: 'income',  label: 'Income'     },
  { value: 'expense', label: 'Expense'    },
];

export function TransactionFiltersBar({ filters, onChange, onReset }: Props) {
  const { data: categories = [] } = useCategories();

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.id, label: `${c.name} (${c.type})` })),
  ];

  const { register, handleSubmit, control, reset, watch } = useForm<TransactionFilters>({
    resolver: zodResolver(transactionFilterSchema),
    defaultValues: filters,
  });

  // Auto-submit on field change
  const values = watch();
  useEffect(() => {
    const timeout = setTimeout(() => onChange(values), 300);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  const handleReset = () => {
    reset({ type: '', category_id: '', date_from: '', date_to: '', search: '' });
    onReset();
  };

  const hasFilters = !!(
    filters.type || filters.category_id ||
    filters.date_from || filters.date_to || filters.search
  );

  return (
    <form onSubmit={handleSubmit(onChange)} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Search description…"
            leftAddon={<Search className="h-4 w-4" />}
            {...register('search')}
          />
        </div>

        {/* Type */}
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="w-36">
              <Select
                options={typeOptions}
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            </div>
          )}
        />

        {/* Category */}
        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
            <div className="w-44">
              <Select
                options={categoryOptions}
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            </div>
          )}
        />

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Input type="date" {...register('date_from')} className="w-36" />
          <span className="text-sm text-gray-400">to</span>
          <Input type="date" {...register('date_to')} className="w-36" />
        </div>

        {/* Reset */}
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<X className="h-4 w-4" />}
            onClick={handleReset}
          >
            Clear
          </Button>
        )}

        <Button type="submit" variant="outline" size="sm" leftIcon={<SlidersHorizontal className="h-4 w-4" />}>
          Filter
        </Button>
      </div>
    </form>
  );
}
