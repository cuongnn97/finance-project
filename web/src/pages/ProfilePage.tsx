import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Send, BotMessageSquare } from "lucide-react";
import { profileSchema, type ProfileFormValues } from "@/schemas";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { supabase } from "@/lib/supabase";
import { CURRENCIES } from "@/lib/utils";

const TIMEZONE_OPTIONS = Intl.supportedValuesOf("timeZone").map((tz) => ({
  value: tz,
  label: tz.replace(/_/g, " "),
}));

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`,
}));

// ── Telegram Card ─────────────────────────────────────────────

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

function TelegramCard({
  profileId,
  chatId,
}: {
  profileId?: string;
  chatId?: number | null;
}) {
  const isLinked     = !!chatId;
  const isBotReady   = !!BOT_USERNAME;
  const deepLinkUrl  = isBotReady
    ? `https://t.me/${BOT_USERNAME}?start=${profileId ?? ""}`
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram Bot</CardTitle>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          isLinked ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>
          <div className={`h-1.5 w-1.5 rounded-full ${isLinked ? "bg-green-500" : "bg-gray-400"}`} />
          {isLinked ? "Đã liên kết" : "Chưa liên kết"}
        </div>
      </CardHeader>

      <div className="space-y-3">
        {!isBotReady ? (
          /* Bot chưa được cấu hình bởi admin */
          <div className="rounded-lg bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <BotMessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <p className="text-sm text-amber-700">
                Tính năng Telegram Bot chưa được bật. Liên hệ quản trị viên để kích hoạt.
              </p>
            </div>
          </div>
        ) : isLinked ? (
          /* Đã liên kết */
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-sm text-green-700">
              Tài khoản đã liên kết thành công. Bạn có thể nhắn tin cho bot để ghi giao dịch nhanh.
            </p>
          </div>
        ) : (
          /* Chưa liên kết, bot sẵn sàng */
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              Nhấn nút bên dưới để mở bot Telegram — bot sẽ tự động liên kết tài khoản của bạn.
            </p>
          </div>
        )}

        {isBotReady && !isLinked && deepLinkUrl && (
          <a
            href={deepLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <Send className="h-4 w-4" />
            Mở Telegram Bot
          </a>
        )}

        {isBotReady && isLinked && deepLinkUrl && (
          <a
            href={deepLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Send className="h-4 w-4" />
            Mở bot Telegram
          </a>
        )}
      </div>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuthStore();
  const toast = useUIStore((s) => s.toast);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? "",
      currency: profile?.currency ?? "VND",
      timezone: profile?.timezone ?? "Asia/Ho_Chi_Minh",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? "",
        currency: profile.currency,
        timezone: profile.timezone,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update(values)
      .eq("id", profile.id);

    if (error) {
      toast.error("Cập nhật thất bại", error.message);
      return;
    }

    await refreshProfile();
    toast.success("Đã cập nhật hồ sơ");
    reset(values);
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Hồ sơ</h1>
        <p className="text-sm text-gray-500">Quản lý cài đặt tài khoản</p>
      </div>

      {/* Thông tin tài khoản */}
      <Card>
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
        </CardHeader>
        <div className="space-y-1.5">
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-sm font-medium text-gray-900">{profile?.email}</p>
        </div>
      </Card>

      {/* Form hồ sơ */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
        </CardHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Họ và tên"
            placeholder="Nguyễn Văn A"
            error={errors.full_name?.message}
            {...register("full_name")}
          />

          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select
                label="Đơn vị tiền tệ"
                options={CURRENCY_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.currency?.message}
              />
            )}
          />

          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Select
                label="Múi giờ"
                options={TIMEZONE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.timezone?.message}
              />
            )}
          />

          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!isDirty}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Lưu thay đổi
          </Button>
        </form>
      </Card>

      {/* Liên kết Telegram */}
      <TelegramCard profileId={profile?.id} chatId={profile?.telegram_chat_id} />
    </div>
  );
}
