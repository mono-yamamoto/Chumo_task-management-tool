"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Project } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
      if (!user) throw new Error("Not authenticated");
      if (!db) throw new Error("Firestore is not initialized");
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
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">プロジェクト</h1>
        <Button onClick={() => setShowCreateForm(true)}>新規作成</Button>
      </div>

      {showCreateForm && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">新規プロジェクト作成</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="プロジェクト名"
              className="flex-1 rounded border px-3 py-2"
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
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <div key={project.id} className="rounded-lg border p-4">
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <p className="mt-2 text-sm text-gray-600">
              メンバー数: {project.memberIds.length}
            </p>
            {project.backlogProjectKey && (
              <p className="mt-1 text-sm text-gray-600">
                Backlog: {project.backlogProjectKey}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

