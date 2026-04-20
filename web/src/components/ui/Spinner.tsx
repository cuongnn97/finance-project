import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)} role="status">
      <Loader2 className={cn('animate-spin text-brand-600', sizes[size])} />
      {label && <span className="text-sm text-gray-500">{label}</span>}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}
