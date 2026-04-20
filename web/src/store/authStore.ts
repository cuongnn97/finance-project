import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        session: null,
        profile: null,
        isLoading: true,
        isInitialized: false,

        setUser: (user) => set({ user }),
        setSession: (session) => set({ session }),
        setProfile: (profile) => set({ profile }),
        setLoading: (isLoading) => set({ isLoading }),

        initialize: async () => {
          set({ isLoading: true });
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              set({ user: session.user, session });
              await get().refreshProfile();
            }
          } finally {
            set({ isLoading: false, isInitialized: true });
          }
        },

        logout: async () => {
          await supabase.auth.signOut();
          set({ user: null, session: null, profile: null });
        },

        refreshProfile: async () => {
          const user = get().user;
          if (!user) return;

          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            set({ profile: data as Profile });
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          session: state.session,
          profile: state.profile,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);
