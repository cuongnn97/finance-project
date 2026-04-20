import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  BarChart3,
  User,
  X,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/transactions',  icon: ArrowLeftRight,  label: 'Transactions' },
  { to: '/categories',    icon: Tag,             label: 'Categories'   },
  { to: '/reports',       icon: BarChart3,       label: 'Reports'      },
  { to: '/profile',       icon: User,            label: 'Profile'      },
];

function NavItem({ to, icon: Icon, label, onClick }: typeof navItems[0] & { onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )
      }
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white border-r border-gray-100 transition-transform duration-200',
          'lg:relative lg:translate-x-0 lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Wallet className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">FinanceOS</span>
          </div>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavItem {...item} onClick={() => setSidebarOpen(false)} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100">
          <p className="px-3 text-xs text-gray-400">© 2026 FinanceOS</p>
        </div>
      </aside>
    </>
  );
}
