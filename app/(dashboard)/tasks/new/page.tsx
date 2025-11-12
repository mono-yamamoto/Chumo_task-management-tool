"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Task, FlowStatus, Label, Priority, User, Project } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Chip,
  OutlinedInput,
  FormHelperText,
} from "@mui/material";
import { Checkbox, ListItemText } from "@mui/material";

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

const priorityOptions: Priority[] = ["low", "medium", "high", "urgent"];

const priorityLabels: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

export default function NewTaskPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [flowStatus, setFlowStatus] = useState<FlowStatus>("未着手");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [itUpDate, setItUpDate] = useState<string>("");
  const [releaseDate, setReleaseDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [kubunLabelId, setKubunLabelId] = useState<string>("");
  const [priority, setPriority] = useState<Priority | "">("");

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!user || !db) return [];
      const projectsRef = collection(db, "projects");
      const q = query(projectsRef, where("memberIds", "array-contains", user.id));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Project[];
    },
    enabled: !!user && !!db,
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId || !db) return null;
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      if (!projectDoc.exists()) return null;
      return { id: projectDoc.id, ...projectDoc.data() } as Project;
    },
    enabled: !!projectId && !!db,
  });

  const { data: labels, isLoading: labelsLoading } = useQuery({
    queryKey: ["labels", projectId],
    queryFn: async () => {
      if (!projectId || !db) return [];
      const labelsRef = collection(db, "labels");
      const q = query(labelsRef, where("projectId", "==", projectId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Label[];
    },
    enabled: !!projectId && !!db,
  });

  const { data: projectMembers } = useQuery({
    queryKey: ["projectMembers", projectId],
    queryFn: async () => {
      if (!projectId || !project || !db) return [];
      const memberIds = project.memberIds || [];
      const members: User[] = [];
      for (const memberId of memberIds) {
        const userDoc = await getDoc(doc(db, "users", memberId));
        if (userDoc.exists()) {
          members.push({ id: userDoc.id, ...userDoc.data() } as User);
        }
      }
      return members;
    },
    enabled: !!projectId && !!project && !!db,
  });

  const createTask = useMutation({
    mutationFn: async () => {
      if (!user || !projectId || !db || !title.trim()) {
        throw new Error("必須項目が入力されていません");
      }
      if (!kubunLabelId) {
        throw new Error("区分を選択してください");
      }

      const taskData = {
        projectId,
        title: title.trim(),
        description: description.trim() || "",
        flowStatus,
        assigneeIds,
        itUpDate: itUpDate ? new Date(itUpDate) : null,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        kubunLabelId,
        priority: priority ? (priority as Priority) : null,
        order: Date.now(),
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, "projects", projectId, "tasks"),
        taskData
      );
      return docRef.id;
    },
    onSuccess: () => {
      // すべてのプロジェクトのタスククエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.refetchQueries({ queryKey: ["tasks"] });
      // プロジェクト一覧も再取得（タスク作成ページで使用しているため）
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.refetchQueries({ queryKey: ["projects"] });
      // タスク一覧に遷移（「すべて」が選択された状態）
      router.push("/tasks");
    },
    onError: (error: Error) => {
      console.error("Error creating task:", error);
      console.error("Error details:", {
        user: !!user,
        projectId,
        title,
        kubunLabelId,
        error: error.message,
        stack: error.stack,
      });
      alert("タスクの作成に失敗しました: " + error.message);
    },
  });

  const handleSubmit = () => {
    createTask.mutate();
  };

  if (projectsLoading) {
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
          新規タスク作成
        </Typography>
        <Button onClick={() => router.push("/tasks")} variant="outline">
          キャンセル
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth required>
              <InputLabel>プロジェクト</InputLabel>
              <Select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setKubunLabelId(""); // プロジェクト変更時にラベルをリセット
                  setAssigneeIds([]); // プロジェクト変更時にアサインをリセット
                }}
                label="プロジェクト"
              >
                <MenuItem value="">
                  <em>選択してください</em>
                </MenuItem>
                {projects?.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              required
              label="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              error={!title.trim() && title !== ""}
              helperText={!title.trim() && title !== "" ? "タイトルを入力してください" : ""}
            />

            <TextField
              fullWidth
              label="説明"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              variant="outlined"
              multiline
              rows={4}
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={flowStatus}
                    onChange={(e) => setFlowStatus(e.target.value as FlowStatus)}
                    label="ステータス"
                  >
                    {flowStatusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>区分</InputLabel>
                  <Select
                    value={kubunLabelId}
                    onChange={(e) => setKubunLabelId(e.target.value)}
                    label="区分"
                    disabled={!projectId || labelsLoading}
                  >
                    <MenuItem value="">
                      <em>選択してください</em>
                    </MenuItem>
                    {labels?.map((label) => (
                      <MenuItem key={label.id} value={label.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: label.color,
                            }}
                          />
                          {label.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {projectId && labels?.length === 0 && !labelsLoading && (
                    <Box sx={{ mt: 1 }}>
                      <FormHelperText error>
                        このプロジェクトにはラベルがありません。先にラベルを作成してください。
                      </FormHelperText>
                      <Box sx={{ mt: 1 }}>
                        <Link href={`/projects/${projectId}/labels`} style={{ textDecoration: "none" }}>
                          <Button variant="outline" size="sm">
                            ラベルを作成
                          </Button>
                        </Link>
                      </Box>
                    </Box>
                  )}
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>アサイン（担当者）</InputLabel>
                  <Select
                    multiple
                    value={assigneeIds}
                    onChange={(e) => {
                      const value = typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value;
                      setAssigneeIds(value);
                    }}
                    input={<OutlinedInput label="アサイン（担当者）" />}
                    renderValue={(selected) => {
                      if (selected.length === 0) return "";
                      return projectMembers
                        ?.filter((member) => selected.includes(member.id))
                        .map((member) => member.displayName)
                        .join(", ") || "";
                    }}
                  >
                    {projectMembers?.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        <Checkbox checked={assigneeIds.indexOf(member.id) > -1} />
                        <ListItemText primary={member.displayName} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="ITアップ日"
                  type="date"
                  value={itUpDate}
                  onChange={(e) => setItUpDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="リリース日"
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="期日"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>優先度</InputLabel>
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority | "")}
                    label="優先度"
                  >
                    <MenuItem value="">
                      <em>選択しない</em>
                    </MenuItem>
                    {priorityOptions.map((p) => (
                      <MenuItem key={p} value={p}>
                        {priorityLabels[p]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button onClick={() => router.push("/tasks")} variant="outline">
                キャンセル
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createTask.isPending || !projectId || !title.trim() || !kubunLabelId}
              >
                {createTask.isPending ? "作成中..." : "作成"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
