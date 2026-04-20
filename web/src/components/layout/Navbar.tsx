import { Menu, Bell, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { profile, logout } = useAuthStore();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (profile?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-gray-100 bg-white px-4 sm:px-6">
      {/* Hamburger */}
      <button
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
        onClick={toggleSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Notification bell (placeholder) */}
        <button
          className="relative rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors",
              menuOpen ? "bg-gray-100" : "hover:bg-gray-100",
            )}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-semibold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {profile?.full_name ?? "User"}
              </p>
              <p className="text-xs text-gray-500 leading-tight">
                {profile?.email}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-gray-100 bg-white shadow-lg py-1">
                <button
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
