import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Layout } from '@/components/layout/Layout';
import { PageLoader } from '@/components/ui/Spinner';
import { ToastContainer } from '@/components/ui/Toast';

// Lazy-loaded pages
const LoginPage    = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardPage     = lazy(() => import('@/pages/DashboardPage'));
const TransactionsPage  = lazy(() => import('@/pages/TransactionsPage'));
const CategoriesPage    = lazy(() => import('@/pages/CategoriesPage'));
const ReportsPage       = lazy(() => import('@/pages/ReportsPage'));
const ProfilePage       = lazy(() => import('@/pages/ProfilePage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AuthListener() {
  const { initialize, setUser, setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        queryClient.clear();
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthListener />
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><PageLoader /></div>}>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<LoginPage />}    />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected */}
            <Route path="/" element={<Layout><DashboardPage /></Layout>} />
            <Route path="/transactions" element={<Layout><TransactionsPage /></Layout>} />
            <Route path="/categories"   element={<Layout><CategoriesPage /></Layout>} />
            <Route path="/reports"      element={<Layout><ReportsPage /></Layout>} />
            <Route path="/profile"      element={<Layout><ProfilePage /></Layout>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ToastContainer />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
