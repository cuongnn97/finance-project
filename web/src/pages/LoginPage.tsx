import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, Wallet } from "lucide-react";
import { loginSchema, type LoginFormValues } from "@/schemas";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, initialize } = useAuthStore();
  const toast = useUIStore((s) => s.toast);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async ({ email, password }: LoginFormValues) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error("Đăng nhập thất bại", error.message);
      return;
    }
    await initialize();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg">
            <Wallet className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Chào mừng trở lại
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Đăng nhập vào tài khoản FinanceOS
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
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
              autoComplete="current-password"
              placeholder="••••••••"
              required
              error={errors.password?.message}
              {...register("password")}
            />
            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
              leftIcon={<LogIn className="h-4 w-4" />}
            >
              Đăng nhập
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
