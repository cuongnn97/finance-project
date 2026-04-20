import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Spinner";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { useCategories } from "@/hooks/useCategories";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | undefined>();
  const { data: categories = [], isLoading } = useCategories();

  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");

  const handleEdit = (cat: Category) => {
    setEditTarget(cat);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditTarget(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Danh mục</h1>
          <p className="text-sm text-gray-500">
            Tổng cộng {categories.length} danh mục
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setFormOpen(true)}
        >
          Thêm danh mục
        </Button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Thu nhập */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Thu nhập ({income.length})
            </h2>
            <CategoryList categories={income} onEdit={handleEdit} />
          </div>

          {/* Chi tiêu */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-500">
              Chi tiêu ({expense.length})
            </h2>
            <CategoryList categories={expense} onEdit={handleEdit} />
          </div>
        </div>
      )}

      <CategoryForm
        open={formOpen}
        onClose={handleClose}
        category={editTarget}
      />
    </div>
  );
}
