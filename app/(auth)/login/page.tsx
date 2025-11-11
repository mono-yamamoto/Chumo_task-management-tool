"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "not_allowed") {
      setError("このアカウントは許可されていません。管理者に連絡してください。");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      setError("ログインに失敗しました。もう一度お試しください。");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">タスク管理ツール</h1>
          <p className="mt-2 text-gray-600">Googleアカウントでログイン</p>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}
        <Button onClick={handleLogin} className="w-full" size="lg">
          Googleでログイン
        </Button>
      </div>
    </div>
  );
}

