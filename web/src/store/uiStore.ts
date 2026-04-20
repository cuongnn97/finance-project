import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Toast, ToastVariant } from '@/types';
import { generateId } from '@/lib/utils';

interface UIState {
  sidebarOpen: boolean;
  toasts: Toast[];

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  addToast: (variant: ToastVariant, title: string, message?: string) => void;
  removeToast: (id: string) => void;

  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      sidebarOpen: false,
      toasts: [],

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      addToast: (variant, title, message) => {
        const id = generateId();
        set((s) => ({ toasts: [...s.toasts, { id, variant, title, message }] }));
        setTimeout(() => get().removeToast(id), 4000);
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      toast: {
        success: (title, message) => get().addToast('success', title, message),
        error:   (title, message) => get().addToast('error',   title, message),
        warning: (title, message) => get().addToast('warning', title, message),
        info:    (title, message) => get().addToast('info',    title, message),
      },
    }),
    { name: 'UIStore' }
  )
);
