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
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Link as MUILink, CircularProgress, Chip } from "@mui/material";
import { PlayArrow, Stop, FolderOpen, LocalFireDepartment } from "@mui/icons-material";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

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
      if (!user || !db) return [];
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
      if (selectedProject === "all" || !db) return [];
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
      if (selectedProject === "all" || !user || !db) return [];
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
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          タスク一覧
        </Typography>
        <Link href="/tasks/new" style={{ textDecoration: "none" }}>
          <Button>新規作成</Button>
        </Link>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>プロジェクト</InputLabel>
          <Select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            label="プロジェクト"
          >
            <MenuItem value="all">すべて</MenuItem>
            {projects?.map((project: any) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell>タイトル</TableCell>
              <TableCell>アサイン</TableCell>
              <TableCell>ITアップ</TableCell>
              <TableCell>リリース</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>区分</TableCell>
              <TableCell>ロールアップ</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks?.map((task) => {
              const isActive = activeSession?.taskId === task.id;
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <Link href={`/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                      <MUILink component="span" sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                        {task.title}
                      </MUILink>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {task.assigneeIds.length > 0
                      ? task.assigneeIds.join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {task.itUpDate
                      ? format(task.itUpDate, "yyyy-MM-dd", { locale: ja })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {task.releaseDate
                      ? format(task.releaseDate, "yyyy-MM-dd", { locale: ja })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {flowStatusLabels[task.flowStatus]}
                  </TableCell>
                  <TableCell>{task.kubunLabelId}</TableCell>
                  <TableCell>
                    {isActive && <Chip label="稼働中" color="success" size="small" />}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleStopTimer}
                        >
                          <Stop fontSize="small" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartTimer(task.projectId, task.id)}
                          disabled={!!activeSession}
                        >
                          <PlayArrow fontSize="small" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDriveCreate(task.projectId, task.id)}
                        disabled={createDriveFolder.isPending}
                      >
                        <FolderOpen fontSize="small" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFireCreate(task.projectId, task.id)}
                        disabled={createFireIssue.isPending}
                      >
                        <LocalFireDepartment fontSize="small" />
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

