import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">タスク管理ツール</h1>
      <p className="mt-4 text-lg">準備中...</p>
      <div className="mt-8 space-x-4">
        <Link href="/login">
          <Button>ログインページへ</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">ダッシュボードへ</Button>
        </Link>
      </div>
    </main>
  );
}

