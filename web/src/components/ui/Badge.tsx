import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'income' | 'expense' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
}

const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default:  'bg-gray-100 text-gray-700',
  income:   'bg-emerald-100 text-emerald-700',
  expense:  'bg-red-100    text-red-700',
  success:  'bg-green-100  text-green-700',
  warning:  'bg-amber-100  text-amber-700',
  error:    'bg-red-100    text-red-700',
};

const sizes: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2    py-0.5 text-xs',
  md: 'px-2.5  py-1   text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
