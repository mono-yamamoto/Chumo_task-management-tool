"use client";

import { useState, Suspense, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Task, FlowStatus, User, Label, Project } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTimer } from "@/lib/hooks/useTimer";
import { useDriveIntegration, useFireIntegration } from "@/lib/hooks/useIntegrations";
import { Button as CustomButton } from "@/components/ui/button";
import { Button } from "@mui/material";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Drawer,
  TextField,
  Card,
  CardContent,
  Grid,
  IconButton,
  Link as MUILink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from "@mui/material";
import { PlayArrow, Stop, FolderOpen, LocalFireDepartment, Close, Delete } from "@mui/icons-material";
import Link from "next/link";
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

function TasksPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFormData, setTaskFormData] = useState<Partial<Task> | null>(null);
  const { startTimer, stopTimer } = useTimer();
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const [activeSession, setActiveSession] = useState<{ projectId: string; taskId: string; sessionId: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");

      const { data: projects } = useQuery<Project[]>({
        queryKey: ["projects"],
        queryFn: async () => {
          if (!user || !db) return [];
          const projectsRef = collection(db, "projects");
          const q = query(projectsRef, where("memberIds", "array-contains", user.id));
          const snapshot = await getDocs(q);
          return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as Project[];
        },
        enabled: !!user && !!db,
      });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", selectedProject],
    queryFn: async () => {
      if (!db || !user) return [];

      if (selectedProject === "all") {
        const projectsRef = collection(db, "projects");
        const q = query(projectsRef, where("memberIds", "array-contains", user.id));
        const projectsSnapshot = await getDocs(q);

        const allTasks: (Task & { projectId: string })[] = [];

        for (const projectDoc of projectsSnapshot.docs) {
          const projectId = projectDoc.id;
          const tasksRef = collection(db, "projects", projectId, "tasks");
          const tasksSnapshot = await getDocs(tasksRef);

          tasksSnapshot.docs.forEach((doc) => {
            allTasks.push({
              id: doc.id,
              projectId,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate(),
              updatedAt: doc.data().updatedAt?.toDate(),
              itUpDate: doc.data().itUpDate?.toDate() || null,
              releaseDate: doc.data().releaseDate?.toDate() || null,
              dueDate: doc.data().dueDate?.toDate() || null,
              completedAt: doc.data().completedAt?.toDate() || null,
            } as Task & { projectId: string });
          });
        }

        return allTasks.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });
      } else {
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
      }
    },
    enabled: !!user && !!db,
  });

  // すべてのユーザーを取得（アサイン表示用）
  const { data: allUsers } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!db) return [];
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
    },
    enabled: !!db,
  });

  // すべてのラベルを取得（区分表示用）
  const { data: allLabels } = useQuery({
    queryKey: ["allLabels"],
    queryFn: async () => {
      if (!db || !projects) return [];
      const projectIds = projects.map((p: any) => p.id);
      const labelsRef = collection(db, "labels");
      const labels: Label[] = [];
      
      for (const projectId of projectIds) {
        const q = query(labelsRef, where("projectId", "==", projectId));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((doc) => {
          labels.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          } as Label);
        });
      }
      
      return labels;
    },
    enabled: !!db && !!projects && projects.length > 0,
  });

  // 選択されたタスクの詳細を取得
  const selectedTask = useMemo(() => {
    return tasks?.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // 選択されたタスクが変更されたらフォームデータを初期化
  useEffect(() => {
    if (selectedTask && selectedTaskId) {
      // フォームデータが存在しない場合、または選択されたタスクIDが変更された場合のみ初期化
      if (!taskFormData || (taskFormData && selectedTask.id === selectedTaskId)) {
        setTaskFormData({
          title: selectedTask.title,
          description: selectedTask.description || "",
          flowStatus: selectedTask.flowStatus,
          kubunLabelId: selectedTask.kubunLabelId,
          itUpDate: selectedTask.itUpDate,
          releaseDate: selectedTask.releaseDate,
          dueDate: selectedTask.dueDate,
        });
      }
    } else if (!selectedTaskId) {
      // タスクが選択されていない場合はフォームデータをリセット
      setTaskFormData(null);
    }
  }, [selectedTask?.id, selectedTaskId]); // selectedTaskのidとselectedTaskIdを依存配列に含める

  // 選択されたタスクのプロジェクトのラベルを取得
  const taskLabels = useMemo(() => {
    if (!selectedTask || !allLabels) return [];
    return allLabels.filter((l) => l.projectId === selectedTask.projectId);
  }, [selectedTask, allLabels]);

  // アクティブなセッションを取得（すべてのプロジェクトから）
  const { data: sessions } = useQuery({
    queryKey: ["sessions", user?.id],
    queryFn: async () => {
      if (!user || !db || !projects) return [];
      const allSessions: any[] = [];
      
      for (const project of projects) {
        const sessionsRef = collection(db, "projects", project.id, "taskSessions");
        const q = query(sessionsRef, where("userId", "==", user.id), where("endedAt", "==", null));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((doc) => {
          allSessions.push({
            id: doc.id,
            projectId: project.id,
            ...doc.data(),
          });
        });
      }
      
      if (allSessions.length > 0) {
        const session = allSessions[0];
        setActiveSession({
          projectId: session.projectId,
          taskId: session.taskId,
          sessionId: session.id,
        });
      } else {
        setActiveSession(null);
      }
      
      return allSessions;
    },
    enabled: !!user && !!projects && projects.length > 0,
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!selectedTask || !db) throw new Error("Task not found");
      const taskRef = doc(db, "projects", selectedTask.projectId, "tasks", selectedTask.id);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.refetchQueries({ queryKey: ["tasks"] });
      // フォームデータはuseEffectで自動更新されるため、ここでは何もしない
    },
  });

  // タスクが選択されたらフォームデータを初期化
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = tasks?.find((t) => t.id === taskId);
    if (task) {
      setTaskFormData({
        title: task.title,
        description: task.description || "",
        flowStatus: task.flowStatus,
        kubunLabelId: task.kubunLabelId,
        itUpDate: task.itUpDate,
        releaseDate: task.releaseDate,
        dueDate: task.dueDate,
      });
    }
  };

  const handleSave = () => {
    if (!taskFormData || !selectedTask) return;
    updateTask.mutate(taskFormData);
  };

  const handleStartTimer = async (projectId: string, taskId: string) => {
    if (!user) return;
    try {
      await startTimer.mutateAsync({
        projectId,
        taskId,
        userId: user.id,
      });
      // セッション一覧を再取得
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.refetchQueries({ queryKey: ["sessions", user.id] });
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
      // セッション一覧を再取得
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.refetchQueries({ queryKey: ["sessions", user?.id] });
    } catch (error: any) {
      console.error("Timer stop error:", error);
      alert("タイマーの停止に失敗しました: " + (error.message || "不明なエラー"));
    }
  };

  const handleDriveCreate = async (projectId: string, taskId: string) => {
    try {
      const result = await createDriveFolder.mutateAsync({ projectId, taskId });
      // タスク一覧と詳細を更新（URLが反映されるように）
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.refetchQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.refetchQueries({ queryKey: ["task", taskId] });
      
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

  const handleFireCreate = async (projectId: string, taskId: string) => {
    try {
      await createFireIssue.mutateAsync({ projectId, taskId });
      alert("GitHub Issueを作成しました");
      queryClient.invalidateQueries({ queryKey: ["tasks"] }); // タスク一覧を更新
      queryClient.refetchQueries({ queryKey: ["tasks"] });
    } catch (error: any) {
      console.error("Fire create error:", error);
      alert("GitHub Issueの作成に失敗しました: " + (error.message || "不明なエラー"));
    }
  };

  const handleDeleteClick = (taskId: string, projectId: string) => {
    setDeleteTaskId(taskId);
    setDeleteProjectId(projectId);
    setDeleteDialogOpen(true);
    setDeleteConfirmTitle("");
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId || !deleteProjectId || !db) return;
    
    const taskToDelete = tasks?.find((t) => t.id === deleteTaskId);
    if (!taskToDelete) {
      alert("タスクが見つかりません");
      setDeleteDialogOpen(false);
      return;
    }

    // タイトルが一致しない場合は削除しない
    if (deleteConfirmTitle !== taskToDelete.title) {
      alert("タイトルが一致しません。削除をキャンセルしました。");
      setDeleteDialogOpen(false);
      setDeleteConfirmTitle("");
      return;
    }

    try {
      const taskRef = doc(db, "projects", deleteProjectId, "tasks", deleteTaskId);
      await deleteDoc(taskRef);
      
      // タスク一覧を更新
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.refetchQueries({ queryKey: ["tasks"] });
      
      // 削除したタスクが選択されていた場合はサイドバーを閉じる
      if (selectedTaskId === deleteTaskId) {
        setSelectedTaskId(null);
        setTaskFormData(null);
      }
      
      alert("タスクを削除しました");
    } catch (error: any) {
      console.error("Delete task error:", error);
      alert("タスクの削除に失敗しました: " + (error.message || "不明なエラー"));
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTaskId(null);
      setDeleteProjectId(null);
      setDeleteConfirmTitle("");
    }
  };

  // アサインの表示名を取得
  const getAssigneeNames = (assigneeIds: string[]) => {
    if (!allUsers || assigneeIds.length === 0) return "-";
    return assigneeIds
      .map((id) => allUsers.find((u) => u.id === id)?.displayName)
      .filter(Boolean)
      .join(", ") || "-";
  };

  // 区分の表示名を取得
  const getLabelName = (labelId: string) => {
    if (!allLabels || !labelId) return "-";
    return allLabels.find((l) => l.id === labelId)?.name || labelId;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
            タスク一覧
          </Typography>
              <Link href="/tasks/new" style={{ textDecoration: "none" }}>
                <CustomButton>新規作成</CustomButton>
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
                <TableCell>タイマー</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks && tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {selectedProject === "all" ? "タスクがありません" : "このプロジェクトにタスクがありません"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tasks?.map((task) => {
                  const isActive = activeSession?.taskId === task.id;
                  return (
                    <TableRow
                      key={task.id}
                      onClick={() => handleTaskSelect(task.id)}
                      sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: "medium" }}>{task.title}</Typography>
                        {selectedProject === "all" && (
                          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
                            {projects?.find((p) => p.id === task.projectId)?.name || ""}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{getAssigneeNames(task.assigneeIds)}</TableCell>
                      <TableCell>
                        {task.itUpDate ? format(task.itUpDate, "yyyy-MM-dd", { locale: ja }) : "-"}
                      </TableCell>
                      <TableCell>
                        {task.releaseDate ? format(task.releaseDate, "yyyy-MM-dd", { locale: ja }) : "-"}
                      </TableCell>
                      <TableCell>{flowStatusLabels[task.flowStatus]}</TableCell>
                      <TableCell>{getLabelName(task.kubunLabelId)}</TableCell>
                      <TableCell>
                        {isActive && <Chip label="稼働中" color="success" size="small" />}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isActive ? (
                          <CustomButton
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopTimer();
                            }}
                          >
                            <Stop fontSize="small" />
                          </CustomButton>
                        ) : (
                          <CustomButton
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTimer(task.projectId, task.id);
                            }}
                            disabled={!!activeSession && activeSession.taskId !== task.id}
                          >
                            <PlayArrow fontSize="small" />
                          </CustomButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* サイドバー */}
      <Drawer
        anchor="right"
        open={!!selectedTaskId}
        onClose={() => {
          setSelectedTaskId(null);
          setTaskFormData(null);
        }}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 500 }, p: 3 },
        }}
      >
        {selectedTask && taskFormData && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                タスク詳細
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <CustomButton onClick={handleSave} size="sm" disabled={updateTask.isPending}>
                  {updateTask.isPending ? "保存中..." : "保存"}
                </CustomButton>
                <CustomButton
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(selectedTask.id, selectedTask.projectId)}
                >
                  <Delete fontSize="small" sx={{ mr: 0.5 }} />
                  削除
                </CustomButton>
                <IconButton
                  onClick={() => {
                    setSelectedTaskId(null);
                    setTaskFormData(null);
                  }}
                  size="small"
                >
                  <Close />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                label="タイトル"
                value={taskFormData.title || ""}
                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              />

              <TextField
                fullWidth
                label="説明"
                value={taskFormData.description || ""}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                multiline
                rows={4}
              />

              <FormControl fullWidth>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={taskFormData.flowStatus || "未着手"}
                  onChange={(e) => setTaskFormData({ ...taskFormData, flowStatus: e.target.value as FlowStatus })}
                  label="ステータス"
                >
                  {flowStatusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>区分</InputLabel>
                <Select
                  value={taskFormData.kubunLabelId || ""}
                  onChange={(e) => setTaskFormData({ ...taskFormData, kubunLabelId: e.target.value })}
                  label="区分"
                >
                  {taskLabels.map((label) => (
                    <MenuItem key={label.id} value={label.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            backgroundColor: label.color,
                          }}
                        />
                        {label.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="ITアップ日"
                type="date"
                value={taskFormData.itUpDate ? format(taskFormData.itUpDate, "yyyy-MM-dd") : ""}
                onChange={(e) =>
                  setTaskFormData({
                    ...taskFormData,
                    itUpDate: e.target.value ? new Date(e.target.value) : null,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="リリース日"
                type="date"
                value={taskFormData.releaseDate ? format(taskFormData.releaseDate, "yyyy-MM-dd") : ""}
                onChange={(e) =>
                  setTaskFormData({
                    ...taskFormData,
                    releaseDate: e.target.value ? new Date(e.target.value) : null,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="期日"
                type="date"
                value={taskFormData.dueDate ? format(taskFormData.dueDate, "yyyy-MM-dd") : ""}
                onChange={(e) =>
                  setTaskFormData({
                    ...taskFormData,
                    dueDate: e.target.value ? new Date(e.target.value) : null,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />

              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
                  アサイン
                </Typography>
                <Typography>{getAssigneeNames(selectedTask.assigneeIds)}</Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {activeSession?.taskId === selectedTask.id ? (
                    <CustomButton
                      fullWidth
                      variant="outline"
                      onClick={() => handleStopTimer()}
                    >
                      <Stop fontSize="small" sx={{ mr: 1 }} />
                      タイマー停止
                    </CustomButton>
                  ) : (
                    <CustomButton
                      fullWidth
                      variant="outline"
                      onClick={() => handleStartTimer(selectedTask.projectId, selectedTask.id)}
                      disabled={!!activeSession}
                    >
                      <PlayArrow fontSize="small" sx={{ mr: 1 }} />
                      タイマー開始
                    </CustomButton>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {selectedTask.googleDriveUrl ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={() => window.open(selectedTask.googleDriveUrl!, "_blank")}
                      sx={{ flex: 1 }}
                    >
                      <FolderOpen fontSize="small" sx={{ mr: 1 }} />
                      Driveを開く
                    </Button>
                  ) : (
                    <CustomButton
                      fullWidth
                      variant="outline"
                      onClick={() => handleDriveCreate(selectedTask.projectId, selectedTask.id)}
                      disabled={createDriveFolder.isPending}
                      sx={{ flex: 1 }}
                    >
                      <FolderOpen fontSize="small" sx={{ mr: 1 }} />
                      Drive作成
                    </CustomButton>
                  )}
                  {selectedTask.fireIssueUrl ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={() => window.open(selectedTask.fireIssueUrl!, "_blank")}
                      sx={{ flex: 1 }}
                    >
                      <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
                      Issueを開く
                    </Button>
                  ) : (
                    <CustomButton
                      fullWidth
                      variant="outline"
                      onClick={() => handleFireCreate(selectedTask.projectId, selectedTask.id)}
                      disabled={createFireIssue.isPending}
                      sx={{ flex: 1 }}
                    >
                      <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
                      Issue作成
                    </CustomButton>
                  )}
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                  <Link href={`/tasks/${selectedTask.id}`} style={{ textDecoration: "none" }}>
                    <CustomButton fullWidth variant="outline">
                      詳細ページを開く
                    </CustomButton>
                  </Link>
              </Box>
            </Box>
          </Box>
        )}
          </Drawer>

          {/* 削除確認ダイアログ */}
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>タスクを削除</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                この操作は取り消せません。タスクを削除するには、タイトルを正確に入力してください。
              </DialogContentText>
              <TextField
                autoFocus
                fullWidth
                label="タイトルを入力"
                value={deleteConfirmTitle}
                onChange={(e) => setDeleteConfirmTitle(e.target.value)}
                placeholder={tasks?.find((t) => t.id === deleteTaskId)?.title || ""}
                variant="outlined"
              />
            </DialogContent>
            <DialogActions>
              <CustomButton onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmTitle("");
              }}>
                キャンセル
              </CustomButton>
              <CustomButton
                variant="destructive"
                onClick={handleDeleteTask}
                disabled={deleteConfirmTitle !== tasks?.find((t) => t.id === deleteTaskId)?.title}
              >
                削除
              </CustomButton>
            </DialogActions>
          </Dialog>
        </Box>
      );
    }

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
