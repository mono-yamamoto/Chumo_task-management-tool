"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Task, FlowStatus, Label } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const flowStatusOptions: FlowStatus[] = [
  "未着手",
  "ディレクション",
  "コーディング",
  "デザイン",
  "待ち",
  "対応中",
  "週次報告",
  "月次報告",
  "完了",
];

export default function TaskDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const taskId = params?.taskId as string;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      // まずプロジェクトIDを取得する必要がある
      // 簡略化のため、全プロジェクトから検索
      const projectsRef = collection(db, "projects");
      const projectsSnapshot = await getDocs(projectsRef);
      
      for (const projectDoc of projectsSnapshot.docs) {
        const taskRef = doc(db, "projects", projectDoc.id, "tasks", taskId);
        const taskDoc = await getDoc(taskRef);
        if (taskDoc.exists()) {
          return {
            id: taskDoc.id,
            projectId: projectDoc.id,
            ...taskDoc.data(),
            createdAt: taskDoc.data().createdAt?.toDate(),
            updatedAt: taskDoc.data().updatedAt?.toDate(),
            itUpDate: taskDoc.data().itUpDate?.toDate() || null,
            releaseDate: taskDoc.data().releaseDate?.toDate() || null,
            dueDate: taskDoc.data().dueDate?.toDate() || null,
            completedAt: taskDoc.data().completedAt?.toDate() || null,
          } as Task & { projectId: string };
        }
      }
      return null;
    },
    enabled: !!taskId,
  });

  const { data: labels } = useQuery({
    queryKey: ["labels", task?.projectId],
    queryFn: async () => {
      if (!task?.projectId) return [];
      const labelsRef = collection(db, "labels");
      const q = query(labelsRef, where("projectId", "==", task.projectId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Label[];
    },
    enabled: !!task?.projectId,
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions", taskId],
    queryFn: async () => {
      if (!task?.projectId) return [];
      const sessionsRef = collection(
        db,
        "projects",
        task.projectId,
        "taskSessions"
      );
      const q = query(sessionsRef, where("taskId", "==", taskId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startedAt: doc.data().startedAt?.toDate(),
        endedAt: doc.data().endedAt?.toDate() || null,
      }));
    },
    enabled: !!task?.projectId && !!taskId,
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!task?.projectId) throw new Error("Task not found");
      const taskRef = doc(db, "projects", task.projectId, "tasks", taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setEditing(false);
    },
  });

  if (taskLoading) {
    return <div>読み込み中...</div>;
  }

  if (!task) {
    return <div>タスクが見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <Button onClick={() => setEditing(!editing)}>
          {editing ? "保存" : "編集"}
        </Button>
      </div>

      {task.external && (
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Backlog情報</h2>
          <p>
            <a
              href={task.external.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {task.external.issueKey}
            </a>
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">基本情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">ステータス</label>
              {editing ? (
                <select
                  value={task.flowStatus}
                  onChange={(e) =>
                    updateTask.mutate({
                      flowStatus: e.target.value as FlowStatus,
                    })
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  {flowStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1">{task.flowStatus}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">ITアップ日</label>
              {editing ? (
                <input
                  type="date"
                  value={
                    task.itUpDate
                      ? format(task.itUpDate, "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) =>
                    updateTask.mutate({
                      itUpDate: e.target.value
                        ? new Date(e.target.value)
                        : null,
                    })
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              ) : (
                <p className="mt-1">
                  {task.itUpDate
                    ? format(task.itUpDate, "yyyy-MM-dd", { locale: ja })
                    : "-"}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">リリース日</label>
              {editing ? (
                <input
                  type="date"
                  value={
                    task.releaseDate
                      ? format(task.releaseDate, "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) =>
                    updateTask.mutate({
                      releaseDate: e.target.value
                        ? new Date(e.target.value)
                        : null,
                    })
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              ) : (
                <p className="mt-1">
                  {task.releaseDate
                    ? format(task.releaseDate, "yyyy-MM-dd", { locale: ja })
                    : "-"}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">区分</label>
              {editing ? (
                <select
                  value={task.kubunLabelId}
                  onChange={(e) =>
                    updateTask.mutate({ kubunLabelId: e.target.value })
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  {labels?.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1">
                  {labels?.find((l) => l.id === task.kubunLabelId)?.name || "-"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">連携</h2>
          <div className="space-y-4">
            {task.googleDriveUrl && (
              <div>
                <label className="block text-sm font-medium">
                  Google Drive
                </label>
                <a
                  href={task.googleDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-blue-600 hover:underline"
                >
                  フォルダを開く
                </a>
              </div>
            )}
            {task.fireIssueUrl && (
              <div>
                <label className="block text-sm font-medium">GitHub Issue</label>
                <a
                  href={task.fireIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-blue-600 hover:underline"
                >
                  Issueを開く
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-4 font-semibold">セッション一覧</h2>
        <div className="space-y-2">
          {sessions?.map((session: any) => (
            <div key={session.id} className="flex justify-between border-b pb-2">
              <div>
                <p>
                  {format(session.startedAt, "yyyy-MM-dd HH:mm", {
                    locale: ja,
                  })}
                  {" - "}
                  {session.endedAt
                    ? format(session.endedAt, "yyyy-MM-dd HH:mm", {
                        locale: ja,
                      })
                    : "実行中"}
                </p>
              </div>
              <div>
                {Math.floor(session.durationSec / 60)}分
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

