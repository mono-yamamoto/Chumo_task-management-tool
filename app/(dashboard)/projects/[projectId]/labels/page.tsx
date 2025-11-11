"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Label } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function LabelsPage() {
  const { user } = useAuth();
  const params = useParams();
  const projectId = params?.projectId as string;
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#3b82f6");

  const { data: labels, isLoading } = useQuery({
    queryKey: ["labels", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const labelsRef = collection(db, "labels");
      const q = query(labelsRef, where("projectId", "==", projectId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Label[];
    },
    enabled: !!projectId,
  });

  const createLabel = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      if (!user || !projectId) throw new Error("Not authenticated");
      const labelData = {
        name: data.name,
        color: data.color,
        projectId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "labels"), labelData);
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", projectId] });
      setShowCreateForm(false);
      setLabelName("");
      setLabelColor("#3b82f6");
    },
  });

  const handleCreate = () => {
    if (labelName.trim()) {
      createLabel.mutate({ name: labelName, color: labelColor });
    }
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ラベル管理</h1>
        <Button onClick={() => setShowCreateForm(true)}>新規作成</Button>
      </div>

      {showCreateForm && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">新規ラベル作成</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              placeholder="ラベル名"
              className="flex-1 rounded border px-3 py-2"
            />
            <input
              type="color"
              value={labelColor}
              onChange={(e) => setLabelColor(e.target.value)}
              className="h-10 w-20 rounded border"
            />
            <Button onClick={handleCreate} disabled={createLabel.isPending}>
              作成
            </Button>
            <Button
              onClick={() => {
                setShowCreateForm(false);
                setLabelName("");
                setLabelColor("#3b82f6");
              }}
              variant="outline"
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {labels?.map((label) => (
          <div
            key={label.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="font-medium">{label.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

