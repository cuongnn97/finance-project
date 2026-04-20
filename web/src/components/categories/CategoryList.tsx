import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDeleteCategory } from "@/hooks/useCategories";
import type { Category } from "@/types";

interface CategoryListProps {
  categories: Category[];
  onEdit: (cat: Category) => void;
}

function ConfirmDelete({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Xóa?</span>
      <Button size="xs" variant="danger" onClick={onConfirm} loading={loading}>
        Có
      </Button>
      <Button size="xs" variant="ghost" onClick={onCancel}>
        Không
      </Button>
    </div>
  );
}

export function CategoryList({ categories, onEdit }: CategoryListProps) {
  const deleteMutation = useDeleteCategory();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (categories.length === 0) {
    return (
      <EmptyState
        title="Chưa có danh mục"
        description="Tạo danh mục đầu tiên ở trên."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {categories.map((cat) => (
        <li
          key={cat.id}
          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
        >
          {/* Color dot */}
          <div
            className="h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: cat.color }}
          />

          {/* Name */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {cat.name}
            </p>
            <p className="text-xs text-gray-400">{cat.icon}</p>
          </div>

          {/* Badge */}
          <Badge variant={cat.type === "income" ? "income" : "expense"}>
            {cat.type === "income" ? "Thu nhập" : "Chi tiêu"}
          </Badge>

          {cat.is_default && (
            <Badge variant="default" size="sm">
              mặc định
            </Badge>
          )}

          {/* Actions */}
          {confirmId === cat.id ? (
            <ConfirmDelete
              onConfirm={async () => {
                await deleteMutation.mutateAsync(cat.id);
                setConfirmId(null);
              }}
              onCancel={() => setConfirmId(null)}
              loading={deleteMutation.isPending}
            />
          ) : (
            <div className="flex gap-1">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => onEdit(cat)}
                aria-label="Sửa"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setConfirmId(cat.id)}
                aria-label="Xóa"
                className="text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
