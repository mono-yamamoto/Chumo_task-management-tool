"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { User } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || "");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
    },
    enabled: user?.role === "admin",
  });

  const updateGithubUsername = useMutation({
    mutationFn: async (username: string) => {
      if (!user) throw new Error("Not authenticated");
      await updateDoc(doc(db, "users", user.id), {
        githubUsername: username,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const toggleUserAllowed = useMutation({
    mutationFn: async ({ userId, isAllowed }: { userId: string; isAllowed: boolean }) => {
      await updateDoc(doc(db, "users", userId), {
        isAllowed,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (!user || user.role !== "admin") {
    return <div>アクセス権限がありません</div>;
  }

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      <div className="rounded-lg border p-4">
        <h2 className="mb-4 font-semibold">GitHubユーザー名</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="GitHubユーザー名"
            className="flex-1 rounded border px-3 py-2"
          />
          <Button
            onClick={() => updateGithubUsername.mutate(githubUsername)}
            disabled={updateGithubUsername.isPending}
          >
            保存
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-4 font-semibold">許可リスト管理</h2>
        <div className="space-y-2">
          {users?.map((u) => (
            <div key={u.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">{u.displayName}</p>
                <p className="text-sm text-gray-600">{u.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm ${u.isAllowed ? "text-green-600" : "text-red-600"}`}>
                  {u.isAllowed ? "許可" : "拒否"}
                </span>
                <Button
                  onClick={() =>
                    toggleUserAllowed.mutate({
                      userId: u.id,
                      isAllowed: !u.isAllowed,
                    })
                  }
                  variant="outline"
                  size="sm"
                >
                  {u.isAllowed ? "拒否" : "許可"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

