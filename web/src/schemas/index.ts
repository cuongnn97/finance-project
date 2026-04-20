import { z } from "zod";

// ============================================================
// Auth Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").max(100),
    email: z.string().email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
      .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 số"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm_password"],
  });

// ============================================================
// Transaction Schemas
// ============================================================

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"], { required_error: "Vui lòng chọn loại" }),
  category_id: z.string().uuid("Danh mục không hợp lệ").nullable(),
  amount: z
    .number({
      required_error: "Vui lòng nhập số tiền",
      invalid_type_error: "Số tiền phải là số",
    })
    .positive("Số tiền phải lớn hơn 0")
    .max(999_999_999.99, "Số tiền quá lớn"),
  description: z.string().max(255, "Mô tả quá dài").optional().default(""),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày không hợp lệ (YYYY-MM-DD)"),
});

export const transactionFilterSchema = z.object({
  type: z.enum(["income", "expense", ""]).optional(),
  category_id: z.string().uuid().optional().or(z.literal("")),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().max(100).optional(),
});

// ============================================================
// Category Schemas
// ============================================================

export const categorySchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên").max(50, "Tên tối đa 50 ký tự"),
  type: z.enum(["income", "expense"], { required_error: "Vui lòng chọn loại" }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Màu không hợp lệ (phải là hex như #6366f1)"),
  icon: z.string().min(1, "Vui lòng chọn biểu tượng"),
});

// ============================================================
// Profile Schemas
// ============================================================

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Tên quá dài"),
  currency: z.string().length(3, "Mã tiền tệ phải có 3 ký tự ISO"),
  timezone: z.string().min(1, "Vui lòng chọn múi giờ"),
});

// ============================================================
// Inferred Types
// ============================================================

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type TransactionFormValues = z.infer<typeof transactionSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
