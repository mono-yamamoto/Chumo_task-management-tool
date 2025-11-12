"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { User } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Box, Typography, TextField, Card, CardContent, List, ListItem, ListItemText, Chip, CircularProgress } from "@mui/material";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || "");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      if (!db) return [];
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
    },
    enabled: user?.role === "admin",
  });

  const updateGithubUsername = useMutation({
    mutationFn: async (username: string) => {
      if (!user || !db) throw new Error("Not authenticated or Firestore not initialized");
      await updateDoc(doc(db, "users", user.id), {
        githubUsername: username,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const toggleUserAllowed = useMutation({
    mutationFn: async ({ userId, isAllowed }: { userId: string; isAllowed: boolean }) => {
      if (!db) throw new Error("Firestore not initialized");
      await updateDoc(doc(db, "users", userId), {
        isAllowed,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>アクセス権限がありません</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
        設定
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ fontWeight: "semibold", mb: 2 }}>
            GitHubユーザー名
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              type="text"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="GitHubユーザー名"
              variant="outlined"
            />
            <Button
              onClick={() => updateGithubUsername.mutate(githubUsername)}
              disabled={updateGithubUsername.isPending}
            >
              保存
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ fontWeight: "semibold", mb: 2 }}>
            許可リスト管理
          </Typography>
          <List>
            {users?.map((u) => (
              <ListItem
                key={u.id}
                sx={{ borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between" }}
              >
                <ListItemText
                  primary={u.displayName}
                  secondary={u.email}
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Chip
                    label={u.isAllowed ? "許可" : "拒否"}
                    color={u.isAllowed ? "success" : "error"}
                    size="small"
                  />
                  <Button
                    onClick={() =>
                      toggleUserAllowed.mutate({
                        userId: u.id,
                        isAllowed: !u.isAllowed,
                      })
                    }
                    variant="outline"
                    size="sm"
                  >
                    {u.isAllowed ? "拒否" : "許可"}
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}

