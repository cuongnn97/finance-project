import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Wallet, MailCheck } from "lucide-react";
import { registerSchema, type RegisterFormValues } from "@/schemas";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, initialize } = useAuthStore();
  const toast = useUIStore((s) => s.toast);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async ({ email, password, full_name }: RegisterFormValues) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (error) {
      toast.error("Đăng ký thất bại", error.message);
      return;
    }

    // session = null → Supabase yêu cầu xác nhận email trước khi login
    if (!data.session) {
      setConfirmedEmail(email);
      return;
    }

    // Email confirmation tắt → login luôn
    await initialize();
    toast.success("Tạo tài khoản thành công!", "Chào mừng đến với FinanceOS.");
    navigate("/");
  };

  // ── Màn hình chờ xác nhận email ─────────────────────────────
  if (confirmedEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <MailCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kiểm tra email</h1>
            <p className="mt-2 text-sm text-gray-500">
              Chúng tôi đã gửi link xác nhận đến
            </p>
            <p className="mt-1 font-medium text-gray-900">{confirmedEmail}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left space-y-2">
            <p className="text-sm text-gray-600">
              1. Mở email và nhấn <strong>Confirm your email</strong>
            </p>
            <p className="text-sm text-gray-600">
              2. Quay lại đây để đăng nhập
            </p>
          </div>
          <Link
            to="/login"
            className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Đã xác nhận? Đăng nhập ngay →
          </Link>
        </div>
      </div>
    );
  }

  // ── Form đăng ký ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg">
            <Wallet className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bắt đầu quản lý tài chính ngay hôm nay
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Họ và tên"
              type="text"
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              required
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="ban@example.com"
              required
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Mật khẩu"
              type="password"
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự"
              required
              error={errors.password?.message}
              hint="Phải chứa ít nhất 1 chữ hoa và 1 số"
              {...register("password")}
            />
            <Input
              label="Xác nhận mật khẩu"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              error={errors.confirm_password?.message}
              {...register("confirm_password")}
            />
            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Tạo tài khoản
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500">
          Đã có tài khoản?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
