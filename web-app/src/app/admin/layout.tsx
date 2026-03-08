"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BarChart3, LayoutDashboard, LogOut, Menu, UserPlus, X } from "lucide-react";

import { signOut } from "@/lib/authApi";
import type { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

import SignInPage from "../sign-in/page";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navItems = useMemo(
    () => [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/activity", label: "Activity", icon: BarChart3 },
      { href: "/sign-up", label: "Create user", icon: UserPlus },
    ],
    [],
  );

  if (!user) return <SignInPage />;

  async function onSignOut() {
    setError(null);
    setPending(true);
    try {
      await signOut();
      clear();
      router.replace("/");
    } catch (e) {
      const err = e as ApiError;
      setError(err.message ?? "Failed to sign out");
    } finally {
      setPending(false);
      setSidebarOpen(false);
    }
  }

  function NavLinks({ onClick }: { onClick?: () => void }) {
    return (
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div>
              <div className="text-lg font-bold text-gray-900">Smart Fisher Lanka</div>
              <div className="text-xs text-gray-500">Admin panel</div>
            </div>
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="p-3 rounded-xl bg-gray-50">
              <div className="text-xs text-gray-500">Signed in as</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {user.email ?? user.username ?? user._id}
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 flex-1 overflow-auto">
            <NavLinks onClick={() => setSidebarOpen(false)} />
          </div>

          <div className="px-4 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onSignOut}
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              {pending ? "Signing out..." : "Sign out"}
            </button>
            {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-semibold">{user.firstName ?? user.username ?? "Admin"}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
