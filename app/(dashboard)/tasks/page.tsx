"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Task, FlowStatus } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTimer } from "@/lib/hooks/useTimer";
import { useDriveIntegration, useFireIntegration } from "@/lib/hooks/useIntegrations";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Play, Square, FolderOpen, Flame } from "lucide-react";

const flowStatusLabels: Record<FlowStatus, string> = {
  未着手: "未着手",
  ディレクション: "ディレクション",
  コーディング: "コーディング",
  デザイン: "デザイン",
  待ち: "待ち",
  対応中: "対応中",
  週次報告: "週次報告",
  月次報告: "月次報告",
  完了: "完了",
};

export default function TasksPage() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const { startTimer, stopTimer } = useTimer();
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const [activeSession, setActiveSession] = useState<{ projectId: string; taskId: string; sessionId: string } | null>(null);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!user) return [];
      const projectsRef = collection(db, "projects");
      const q = query(projectsRef, where("memberIds", "array-contains", user.id));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", selectedProject],
    queryFn: async () => {
      if (selectedProject === "all") return [];
      const tasksRef = collection(db, "projects", selectedProject, "tasks");
      const snapshot = await getDocs(tasksRef);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        projectId: selectedProject,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        itUpDate: doc.data().itUpDate?.toDate() || null,
        releaseDate: doc.data().releaseDate?.toDate() || null,
        dueDate: doc.data().dueDate?.toDate() || null,
        completedAt: doc.data().completedAt?.toDate() || null,
      })) as (Task & { projectId: string })[];
    },
    enabled: selectedProject !== "all",
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions", selectedProject],
    queryFn: async () => {
      if (selectedProject === "all" || !user) return [];
      const sessionsRef = collection(db, "projects", selectedProject, "taskSessions");
      const q = query(sessionsRef, where("userId", "==", user.id), where("endedAt", "==", null));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const session = snapshot.docs[0].data();
        setActiveSession({
          projectId: selectedProject,
          taskId: session.taskId,
          sessionId: snapshot.docs[0].id,
        });
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
    enabled: selectedProject !== "all" && !!user,
  });

  const handleStartTimer = async (projectId: string, taskId: string) => {
    if (!user) return;
    try {
      await startTimer.mutateAsync({
        projectId,
        taskId,
        userId: user.id,
      });
    } catch (error: any) {
      if (error.message.includes("稼働中")) {
        alert("他のタイマーが稼働中です。停止してから開始してください。");
      } else {
        alert("タイマーの開始に失敗しました");
      }
    }
  };

  const handleStopTimer = async () => {
    if (!activeSession) return;
    try {
      await stopTimer.mutateAsync({
        projectId: activeSession.projectId,
        sessionId: activeSession.sessionId,
      });
      setActiveSession(null);
    } catch (error) {
      alert("タイマーの停止に失敗しました");
    }
  };

  const handleDriveCreate = async (projectId: string, taskId: string) => {
    try {
      await createDriveFolder.mutateAsync({ projectId, taskId });
      alert("Driveフォルダを作成しました");
    } catch (error) {
      alert("Driveフォルダの作成に失敗しました");
    }
  };

  const handleFireCreate = async (projectId: string, taskId: string) => {
    try {
      await createFireIssue.mutateAsync({ projectId, taskId });
      alert("GitHub Issueを作成しました");
    } catch (error) {
      alert("GitHub Issueの作成に失敗しました");
    }
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">タスク一覧</h1>
        <Link href="/tasks/new">
          <Button>新規作成</Button>
        </Link>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">プロジェクト</label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="mt-1 rounded border px-3 py-2"
        >
          <option value="all">すべて</option>
          {projects?.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 text-left">タイトル</th>
              <th className="border p-2 text-left">アサイン</th>
              <th className="border p-2 text-left">ITアップ</th>
              <th className="border p-2 text-left">リリース</th>
              <th className="border p-2 text-left">ステータス</th>
              <th className="border p-2 text-left">区分</th>
              <th className="border p-2 text-left">ロールアップ</th>
              <th className="border p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks?.map((task) => {
              const isActive = activeSession?.taskId === task.id;
              return (
                <tr key={task.id}>
                  <td className="border p-2">
                    <Link
                      href={`/dashboard/tasks/${task.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td className="border p-2">
                    {task.assigneeIds.length > 0
                      ? task.assigneeIds.join(", ")
                      : "-"}
                  </td>
                  <td className="border p-2">
                    {task.itUpDate
                      ? format(task.itUpDate, "yyyy-MM-dd", { locale: ja })
                      : "-"}
                  </td>
                  <td className="border p-2">
                    {task.releaseDate
                      ? format(task.releaseDate, "yyyy-MM-dd", { locale: ja })
                      : "-"}
                  </td>
                  <td className="border p-2">
                    {flowStatusLabels[task.flowStatus]}
                  </td>
                  <td className="border p-2">{task.kubunLabelId}</td>
                  <td className="border p-2">
                    {isActive && <span className="text-green-600">● 稼働中</span>}
                  </td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleStopTimer}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartTimer(task.projectId, task.id)}
                          disabled={!!activeSession}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDriveCreate(task.projectId, task.id)}
                        disabled={createDriveFolder.isPending}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFireCreate(task.projectId, task.id)}
                        disabled={createFireIssue.isPending}
                      >
                        <Flame className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

