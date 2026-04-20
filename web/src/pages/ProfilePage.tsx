import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Send } from 'lucide-react';
import { profileSchema, type ProfileFormValues } from '@/schemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { supabase } from '@/lib/supabase';
import { CURRENCIES } from '@/lib/utils';

const TIMEZONE_OPTIONS = Intl.supportedValuesOf('timeZone').map((tz) => ({
  value: tz,
  label: tz.replace(/_/g, ' '),
}));

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`,
}));

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
      full_name: profile?.full_name ?? '',
      currency:  profile?.currency  ?? 'USD',
      timezone:  profile?.timezone  ?? 'UTC',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? '',
        currency:  profile.currency,
        timezone:  profile.timezone,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update(values)
      .eq('id', profile.id);

    if (error) {
      toast.error('Update failed', error.message);
      return;
    }

    await refreshProfile();
    toast.success('Profile updated');
    reset(values); // mark form as pristine
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500">Manage your account settings</p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <div className="space-y-1.5">
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-sm font-medium text-gray-900">{profile?.email}</p>
        </div>
      </Card>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Info</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Full Name"
            placeholder="Jane Doe"
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select
                label="Currency"
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
                label="Timezone"
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
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Telegram link info */}
      <Card>
        <CardHeader>
          <CardTitle>Telegram Bot</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {profile?.telegram_chat_id ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-700">
                Linked (chat ID: {profile.telegram_chat_id})
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Not linked yet</p>
          )}
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              To link your Telegram account, start a chat with the bot and send{' '}
              <code className="rounded bg-blue-100 px-1 font-mono">/start {profile?.id?.slice(0, 8)}</code>
            </p>
          </div>
          <a
            href={`https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'your_bot'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
          >
            <Send className="h-4 w-4" />
            Open Telegram Bot
          </a>
        </div>
      </Card>
    </div>
  );
}
