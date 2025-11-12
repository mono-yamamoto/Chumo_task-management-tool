"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Task, FlowStatus, Label } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Card, CardContent, Grid, Link as MUILink, CircularProgress } from "@mui/material";
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
      if (!task?.projectId || !db) return [];
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
      if (!task?.projectId || !db) throw new Error("Task not found or Firestore not initialized");
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
        <Button onClick={() => setEditing(!editing)}>
          {editing ? "保存" : "編集"}
        </Button>
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
                {task.googleDriveUrl && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Google Drive
                    </Typography>
                    <MUILink
                      href={task.googleDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                    >
                      フォルダを開く
                    </MUILink>
                  </Box>
                )}
                {task.fireIssueUrl && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      GitHub Issue
                    </Typography>
                    <MUILink
                      href={task.fireIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                    >
                      Issueを開く
                    </MUILink>
                  </Box>
                )}
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

