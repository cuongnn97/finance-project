import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionSchema, type TransactionFormValues } from '@/schemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { toDateInputValue } from '@/lib/utils';
import type { Transaction } from '@/types';

interface TransactionFormProps {
  open:         boolean;
  onClose:      () => void;
  transaction?: Transaction;
}

export function TransactionForm({ open, onClose, transaction }: TransactionFormProps) {
  const isEdit = !!transaction;
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type:        transaction?.type        ?? 'expense',
      category_id: transaction?.category_id ?? null,
      amount:      transaction?.amount,
      description: transaction?.description ?? '',
      date:        transaction?.date        ?? toDateInputValue(),
    },
  });

  const selectedType = watch('type');
  const filteredCategories = categories.filter((c) => c.type === selectedType);
  const categoryOptions = [
    { value: '', label: '— No category —' },
    ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const onSubmit = async (values: TransactionFormValues) => {
    const payload = {
      ...values,
      category_id: values.category_id || null,
      amount: Number(values.amount),
    };

    if (isEdit) {
      await updateMutation.mutateAsync({ id: transaction.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Transaction' : 'Add Transaction'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Type toggle */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map((t) => (
              <label
                key={t}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  selectedType === t
                    ? t === 'income'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-red-400 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  value={t}
                  className="sr-only"
                  {...register('type')}
                />
                {t === 'income' ? '↑ Income' : '↓ Expense'}
              </label>
            ))}
          </div>
          {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>}
        </div>

        {/* Amount */}
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
          error={errors.amount?.message}
          {...register('amount', { valueAsNumber: true })}
        />

        {/* Category */}
        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Category"
              options={categoryOptions}
              error={errors.category_id?.message}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value || null)}
            />
          )}
        />

        {/* Description */}
        <Input
          label="Description"
          placeholder="What was this for?"
          error={errors.description?.message}
          {...register('description')}
        />

        {/* Date */}
        <Input
          label="Date"
          type="date"
          required
          error={errors.date?.message}
          {...register('date')}
        />

        <ModalFooter className="-mx-6 px-6 pb-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Add Transaction'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
