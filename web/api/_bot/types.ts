export type TransactionType   = 'income' | 'expense';
export type TransactionSource = 'web' | 'telegram';

export interface Profile {
  id:               string;
  email:            string;
  full_name:        string | null;
  telegram_chat_id: number | null;
  currency:         string;
  timezone:         string;
}

export interface Category {
  id:         string;
  user_id:    string;
  name:       string;
  type:       TransactionType;
  color:      string;
  icon:       string;
  is_default: boolean;
}

export interface Transaction {
  id:          string;
  user_id:     string;
  category_id: string | null;
  type:        TransactionType;
  amount:      number;
  description: string | null;
  date:        string;
  source:      TransactionSource;
  category?:   Category | null;
}

export interface ParsedTransaction {
  type:        TransactionType;
  amount:      number;
  description: string;
  date:        string;
  raw:         string;
}

export interface BalanceSummary {
  total_income:  number;
  total_expense: number;
  balance:       number;
}
