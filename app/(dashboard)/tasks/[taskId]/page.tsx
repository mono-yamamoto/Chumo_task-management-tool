"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Task, FlowStatus, Label } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useParams } from "next/navigation";
import { useTimer } from "@/lib/hooks/useTimer";
import { useDriveIntegration, useFireIntegration } from "@/lib/hooks/useIntegrations";
import { Button as CustomButton } from "@/components/ui/button";
import { Button } from "@mui/material";
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Card, CardContent, Grid, Link as MUILink, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from "@mui/material";
import { PlayArrow, Stop, FolderOpen, LocalFireDepartment, Delete } from "@mui/icons-material";
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
  const [editing, setEditing] = useState(true); // デフォルトで編集モード
  const { startTimer, stopTimer } = useTimer();
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const [activeSession, setActiveSession] = useState<{ projectId: string; taskId: string; sessionId: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      if (!db) return null;
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
      if (!task?.projectId || !db) return [];
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
      if (!task?.projectId || !db || !user) return [];
      const sessionsRef = collection(
        db,
        "projects",
        task.projectId,
        "taskSessions"
      );
      const q = query(sessionsRef, where("taskId", "==", taskId), where("userId", "==", user.id), where("endedAt", "==", null));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const session = snapshot.docs[0].data();
        setActiveSession({
          projectId: task.projectId,
          taskId: taskId,
          sessionId: snapshot.docs[0].id,
        });
      } else {
        setActiveSession(null);
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startedAt: doc.data().startedAt?.toDate(),
        endedAt: doc.data().endedAt?.toDate() || null,
      }));
    },
    enabled: !!task?.projectId && !!taskId && !!user,
  });

  const handleStartTimer = async () => {
    if (!user || !task) return;
    try {
      await startTimer.mutateAsync({
        projectId: task.projectId,
        taskId: task.id,
        userId: user.id,
      });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.refetchQueries({ queryKey: ["sessions", taskId] });
    } catch (error: any) {
      console.error("Timer start error:", error);
      if (error.message?.includes("稼働中")) {
        alert("他のタイマーが稼働中です。停止してから開始してください。");
      } else {
        alert("タイマーの開始に失敗しました: " + (error.message || "不明なエラー"));
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
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.refetchQueries({ queryKey: ["sessions", taskId] });
    } catch (error: any) {
      console.error("Timer stop error:", error);
      alert("タイマーの停止に失敗しました: " + (error.message || "不明なエラー"));
    }
  };

      const handleDriveCreate = async () => {
        if (!task) return;
        try {
          const result = await createDriveFolder.mutateAsync({ projectId: task.projectId, taskId: task.id });
          // タスク詳細を更新（URLが反映されるように）
          queryClient.invalidateQueries({ queryKey: ["task", taskId] });
          queryClient.refetchQueries({ queryKey: ["task", taskId] });
          // タスク一覧も更新
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          
          if (result.warning) {
            // チェックシート作成エラーがある場合
            alert(`Driveフォルダを作成しましたが、チェックシートの作成に失敗しました。\n\nフォルダURL: ${result.url || "取得できませんでした"}\n\nエラー: ${result.error || "不明なエラー"}`);
          } else {
            // 完全に成功した場合
            alert(`Driveフォルダとチェックシートを作成しました。\n\nフォルダURL: ${result.url || "取得できませんでした"}`);
          }
        } catch (error: any) {
          console.error("Drive create error:", error);
          const errorMessage = error?.message || "不明なエラー";
          alert(`Driveフォルダの作成に失敗しました: ${errorMessage}`);
        }
      };

  const handleFireCreate = async () => {
    if (!task) return;
    try {
      await createFireIssue.mutateAsync({ projectId: task.projectId, taskId: task.id });
      alert("GitHub Issueを作成しました");
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.refetchQueries({ queryKey: ["task", taskId] });
    } catch (error: any) {
      console.error("Fire create error:", error);
      alert("GitHub Issueの作成に失敗しました: " + (error.message || "不明なエラー"));
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !db) return;
    
    // タイトルが一致しない場合は削除しない
    if (deleteConfirmTitle !== task.title) {
      alert("タイトルが一致しません。削除をキャンセルしました。");
      setDeleteDialogOpen(false);
      setDeleteConfirmTitle("");
      return;
    }

    try {
      const taskRef = doc(db, "projects", task.projectId, "tasks", taskId);
      await deleteDoc(taskRef);
      
      // タスク一覧を更新
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      // タスク詳細ページから離れる（一覧ページにリダイレクト）
      window.location.href = "/tasks";
    } catch (error: any) {
      console.error("Delete task error:", error);
      alert("タスクの削除に失敗しました: " + (error.message || "不明なエラー"));
    } finally {
      setDeleteDialogOpen(false);
      setDeleteConfirmTitle("");
    }
  };

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!task?.projectId || !db) throw new Error("Task not found or Firestore not initialized");
      const taskRef = doc(db, "projects", task.projectId, "tasks", taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // クエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.refetchQueries({ queryKey: ["task", taskId] });
      // タスク一覧も更新
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditing(false);
    },
  });

  if (taskLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>タスクが見つかりません</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          {task.title}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <CustomButton onClick={() => setEditing(!editing)}>
            {editing ? "保存" : "編集"}
          </CustomButton>
          <CustomButton
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Delete fontSize="small" sx={{ mr: 1 }} />
            削除
          </CustomButton>
        </Box>
      </Box>

      {task.external && (
        <Card>
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ fontWeight: "semibold", mb: 1 }}>
              Backlog情報
            </Typography>
            <MUILink
              href={task.external.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}
            >
              {task.external.issueKey}
            </MUILink>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" sx={{ fontWeight: "semibold", mb: 2 }}>
                基本情報
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>ステータス</InputLabel>
                  {editing ? (
                    <Select
                      value={task.flowStatus}
                      onChange={(e) =>
                        updateTask.mutate({
                          flowStatus: e.target.value as FlowStatus,
                        })
                      }
                      label="ステータス"
                    >
                      {flowStatusOptions.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <Typography sx={{ mt: 1 }}>{task.flowStatus}</Typography>
                  )}
                </FormControl>
                <TextField
                  label="ITアップ日"
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
                  InputLabelProps={{ shrink: true }}
                  disabled={!editing}
                  fullWidth
                />
                <TextField
                  label="リリース日"
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
                  InputLabelProps={{ shrink: true }}
                  disabled={!editing}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>区分</InputLabel>
                  {editing ? (
                    <Select
                      value={task.kubunLabelId}
                      onChange={(e) =>
                        updateTask.mutate({ kubunLabelId: e.target.value })
                      }
                      label="区分"
                    >
                      {labels?.map((label) => (
                        <MenuItem key={label.id} value={label.id}>
                          {label.name}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <Typography sx={{ mt: 1 }}>
                      {labels?.find((l) => l.id === task.kubunLabelId)?.name || "-"}
                    </Typography>
                  )}
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: "semibold", mb: 2 }}>
                    連携
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {activeSession?.taskId === task.id ? (
                        <CustomButton
                          fullWidth
                          variant="outline"
                          onClick={handleStopTimer}
                        >
                          <Stop fontSize="small" sx={{ mr: 1 }} />
                          タイマー停止
                        </CustomButton>
                      ) : (
                        <CustomButton
                          fullWidth
                          variant="outline"
                          onClick={handleStartTimer}
                          disabled={!!activeSession}
                        >
                          <PlayArrow fontSize="small" sx={{ mr: 1 }} />
                          タイマー開始
                        </CustomButton>
                      )}
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {task.googleDriveUrl ? (
                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={() => window.open(task.googleDriveUrl!, "_blank")}
                            sx={{ flex: 1 }}
                          >
                            <FolderOpen fontSize="small" sx={{ mr: 1 }} />
                            Driveを開く
                          </Button>
                        ) : (
                          <CustomButton
                            fullWidth
                            variant="outline"
                            onClick={handleDriveCreate}
                            disabled={createDriveFolder.isPending}
                            sx={{ flex: 1 }}
                          >
                            <FolderOpen fontSize="small" sx={{ mr: 1 }} />
                            Drive作成
                          </CustomButton>
                        )}
                        {task.fireIssueUrl ? (
                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={() => window.open(task.fireIssueUrl!, "_blank")}
                            sx={{ flex: 1 }}
                          >
                            <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
                            Issueを開く
                          </Button>
                        ) : (
                          <CustomButton
                            fullWidth
                            variant="outline"
                            onClick={handleFireCreate}
                            disabled={createFireIssue.isPending}
                            sx={{ flex: 1 }}
                          >
                            <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
                            Issue作成
                          </CustomButton>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ fontWeight: "semibold", mb: 2 }}>
            セッション一覧
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {sessions?.map((session: any) => (
              <Box
                key={session.id}
                sx={{ display: "flex", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", pb: 1 }}
              >
                <Typography>
                  {format(session.startedAt, "yyyy-MM-dd HH:mm", {
                    locale: ja,
                  })}
                  {" - "}
                  {session.endedAt
                    ? format(session.endedAt, "yyyy-MM-dd HH:mm", {
                        locale: ja,
                      })
                    : "実行中"}
                </Typography>
                <Typography>
                  {Math.floor(session.durationSec / 60)}分
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

