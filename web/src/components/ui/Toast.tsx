import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import type { Toast as ToastType } from '@/types';

const icons = {
  success: <CheckCircle  className="h-5 w-5 text-green-500" />,
  error:   <XCircle      className="h-5 w-5 text-red-500"   />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  info:    <Info          className="h-5 w-5 text-blue-500"  />,
};

const styles = {
  success: 'border-green-200 bg-green-50',
  error:   'border-red-200   bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info:    'border-blue-200  bg-blue-50',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div
      className={cn(
        'flex w-80 items-start gap-3 rounded-xl border p-4 shadow-lg animate-slide-up',
        styles[toast.variant]
      )}
      role="alert"
    >
      <div className="mt-0.5 flex-shrink-0">{icons[toast.variant]}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-gray-600">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
