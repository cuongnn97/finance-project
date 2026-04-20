import { z } from 'zod';

// ============================================================
// Auth Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

// ============================================================
// Transaction Schemas
// ============================================================

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], { required_error: 'Type is required' }),
  category_id: z.string().uuid('Invalid category').nullable(),
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .max(999_999_999.99, 'Amount is too large'),
  description: z.string().max(255, 'Description too long').optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export const transactionFilterSchema = z.object({
  type: z.enum(['income', 'expense', '']).optional(),
  category_id: z.string().uuid().optional().or(z.literal('')),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().max(100).optional(),
});

// ============================================================
// Category Schemas
// ============================================================

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less'),
  type: z.enum(['income', 'expense'], { required_error: 'Type is required' }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color (must be hex like #6366f1)'),
  icon: z.string().min(1, 'Icon is required'),
});

// ============================================================
// Profile Schemas
// ============================================================

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
  timezone: z.string().min(1, 'Timezone is required'),
});

// ============================================================
// Inferred Types
// ============================================================

export type LoginFormValues    = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type TransactionFormValues = z.infer<typeof transactionSchema>;
export type CategoryFormValues    = z.infer<typeof categorySchema>;
export type ProfileFormValues     = z.infer<typeof profileSchema>;
