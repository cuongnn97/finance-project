import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionFiltersBar } from "@/components/transactions/TransactionFilters";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { useTransactions } from "@/hooks/useTransactions";
import type { Transaction, TransactionFilters } from "@/types";

const DEFAULT_FILTERS: TransactionFilters = {
  type: "",
  category_id: "",
  date_from: "",
  date_to: "",
  search: "",
};

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | undefined>();

  const { data: result, isLoading } = useTransactions(filters, page);

  const handleFilterChange = (f: TransactionFilters) => {
    setFilters(f);
    setPage(1);
  };

  const handleEdit = (tx: Transaction) => {
    setEditTarget(tx);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditTarget(undefined);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Giao dịch</h1>
          <p className="text-sm text-gray-500">
            Tổng cộng {result?.meta.total ?? 0} bản ghi
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setFormOpen(true)}
        >
          Thêm giao dịch
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <TransactionFiltersBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={() => {
            setFilters(DEFAULT_FILTERS);
            setPage(1);
          }}
        />
      </Card>

      {/* List */}
      <TransactionList
        result={result}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        onEdit={handleEdit}
      />

      <TransactionForm
        open={formOpen}
        onClose={handleClose}
        transaction={editTarget}
      />
    </div>
  );
}
