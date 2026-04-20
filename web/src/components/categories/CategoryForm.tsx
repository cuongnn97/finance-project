import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categorySchema, type CategoryFormValues } from '@/schemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
import { COLOR_PRESETS, ICON_OPTIONS, cn } from '@/lib/utils';
import type { Category } from '@/types';

interface CategoryFormProps {
  open:      boolean;
  onClose:   () => void;
  category?: Category;
}

const typeOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income',  label: 'Income'  },
];

export function CategoryForm({ open, onClose, category }: CategoryFormProps) {
  const isEdit = !!category;
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name:  category?.name  ?? '',
      type:  category?.type  ?? 'expense',
      color: category?.color ?? '#6366f1',
      icon:  category?.icon  ?? 'circle',
    },
  });

  const selectedColor = watch('color');
  const selectedIcon  = watch('icon');

  const onSubmit = async (values: CategoryFormValues) => {
    if (isEdit) {
      await updateMutation.mutateAsync({ id: category.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Category' : 'New Category'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Name"
          placeholder="e.g. Groceries"
          required
          error={errors.name?.message}
          {...register('name')}
        />

        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              label="Type"
              options={typeOptions}
              required
              error={errors.type?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {/* Color picker */}
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => field.onChange(c)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform',
                      selectedColor === c ? 'border-gray-900 scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
                <input
                  type="color"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded-full border-2 border-transparent"
                  title="Custom color"
                />
              </div>
              {errors.color && <p className="text-xs text-red-500">{errors.color.message}</p>}
            </div>
          )}
        />

        {/* Icon picker */}
        <Controller
          name="icon"
          control={control}
          render={({ field }) => (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Icon</label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => field.onChange(icon)}
                    className={cn(
                      'rounded-lg border px-2 py-1 text-xs transition-colors',
                      selectedIcon === icon
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              {errors.icon && <p className="text-xs text-red-500">{errors.icon.message}</p>}
            </div>
          )}
        />

        <ModalFooter className="-mx-6 px-6 pb-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Create Category'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
