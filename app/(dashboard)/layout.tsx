"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold">
                タスク管理ツール
              </Link>
              <div className="flex space-x-4">
                <Link
                  href="/projects"
                  className="text-gray-700 hover:text-gray-900"
                >
                  プロジェクト
                </Link>
                <Link
                  href="/tasks"
                  className="text-gray-700 hover:text-gray-900"
                >
                  タスク
                </Link>
                <Link
                  href="/reports"
                  className="text-gray-700 hover:text-gray-900"
                >
                  レポート
                </Link>
                {user?.role === "admin" && (
                  <Link
                    href="/settings"
                    className="text-gray-700 hover:text-gray-900"
                  >
                    設定
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.displayName}</span>
              <Button onClick={logout} variant="outline" size="sm">
                ログアウト
              </Button>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}

