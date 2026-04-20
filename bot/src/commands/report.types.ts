export interface CategorySpending {
  category_id:    string | null;
  category_name:  string | null;
  category_color: string | null;
  category_icon:  string | null;
  type:           string;
  month:          string;
  total:          number;
  transaction_count: number;
}
