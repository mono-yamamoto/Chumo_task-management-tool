"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Project } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Box, Typography, TextField, Grid, Card, CardContent, CircularProgress } from "@mui/material";
import { useState } from "react";

export default function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!user) return [];
      if (!db) {
        console.error("Firestore is not initialized");
        return [];
      }
      try {
        if (!db) return [];
        const projectsRef = collection(db, "projects");
        const q = query(projectsRef, where("memberIds", "array-contains", user.id));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Project[];
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
    },
    enabled: !!user && !!db,
  });

  const createProject = useMutation({
    mutationFn: async (name: string) => {
      if (!user || !db) throw new Error("Not authenticated or Firestore not initialized");
      const projectData = {
        name,
        ownerId: user.id,
        memberIds: [user.id],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "projects"), projectData);
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowCreateForm(false);
      setProjectName("");
    },
    onError: (error) => {
      console.error("Error creating project:", error);
      alert("プロジェクトの作成に失敗しました: " + error.message);
    },
  });

  const handleCreate = () => {
    if (projectName.trim()) {
      createProject.mutate(projectName);
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
          プロジェクト
        </Typography>
        <Button onClick={() => setShowCreateForm(true)}>新規作成</Button>
      </Box>

      {showCreateForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ fontWeight: "semibold", mb: 2 }}>
              新規プロジェクト作成
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="プロジェクト名"
                variant="outlined"
              />
              <Button onClick={handleCreate} disabled={createProject.isPending}>
                作成
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false);
                  setProjectName("");
                }}
                variant="outline"
              >
                キャンセル
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {projects?.map((project) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h3" sx={{ fontWeight: "semibold", mb: 1 }}>
                  {project.name}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                  メンバー数: {project.memberIds.length}
                </Typography>
                {project.backlogProjectKey && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Backlog: {project.backlogProjectKey}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

