// ============================================================
// Core Domain Types
// ============================================================

export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'web' | 'telegram';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  telegram_chat_id: number | null;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: string;
  source: TransactionSource;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category | null;
}

// ============================================================
// API / Form Types
// ============================================================

export interface CreateTransactionInput {
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string;
}

export interface CreateCategoryInput {
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  currency?: string;
  timezone?: string;
}

// ============================================================
// Query / Filter Types
// ============================================================

export interface TransactionFilters {
  type?: TransactionType | '';
  category_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ============================================================
// Dashboard / Report Types
// ============================================================

export interface DashboardSummary {
  balance: number;
  total_income: number;
  total_expense: number;
  income_change: number;   // % vs previous month
  expense_change: number;  // % vs previous month
  transaction_count: number;
}

export interface MonthlySummary {
  month: string; // YYYY-MM-DD (first day of month)
  type: TransactionType;
  total: number;
  transaction_count: number;
}

export interface CategorySpending {
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  type: TransactionType;
  month: string;
  total: number;
  transaction_count: number;
}

export interface MonthlyReport {
  month: string;
  total_income: number;
  total_expense: number;
  balance: number;
  income_by_category: CategorySpending[];
  expense_by_category: CategorySpending[];
  top_expenses: Transaction[];
}

// ============================================================
// UI Types
// ============================================================

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}
