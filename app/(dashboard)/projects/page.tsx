'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Project } from '@/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { useState } from 'react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');

  // 管理者のみが編集・削除・作成可能
  const isAdmin = user?.role === 'admin';

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!user) return [];
      if (!db) {
        console.error('Firestore is not initialized');
        return [];
      }
      try {
        if (!db) return [];
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, where('memberIds', 'array-contains', user.id));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
          createdAt: docItem.data().createdAt?.toDate(),
          updatedAt: docItem.data().updatedAt?.toDate(),
        })) as Project[];
      } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
    },
    enabled: !!user && !!db,
  });

  const createProject = useMutation({
    mutationFn: async (name: string) => {
      if (!user || !db) throw new Error('Not authenticated or Firestore not initialized');
      const projectData = {
        name,
        ownerId: user.id,
        memberIds: [user.id],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'projects'), projectData);
      return docRef.id;
    },
    onSuccess: () => {
      // クエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.refetchQueries({ queryKey: ['projects'] });
      setShowCreateForm(false);
      setProjectName('');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      alert(`プロジェクトの作成に失敗しました: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (projectName.trim()) {
      createProject.mutate(projectName);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          プロジェクト
        </Typography>
        {isAdmin && <Button onClick={() => setShowCreateForm(true)}>新規作成</Button>}
      </Box>

      {showCreateForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
              新規プロジェクト作成
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
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
                  setProjectName('');
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
                <Typography variant="h6" component="h3" sx={{ fontWeight: 'semibold', mb: 1 }}>
                  {project.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  メンバー数: {project.memberIds.length}
                </Typography>
                {project.backlogProjectKey && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    Backlog: {project.backlogProjectKey}
                  </Typography>
                )}
                {isAdmin && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: 編集機能を実装
                        alert('編集機能は今後実装予定です');
                      }}
                    >
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      color="error"
                      onClick={async () => {
                        // eslint-disable-next-line no-alert
                        if (window.confirm('このプロジェクトを削除しますか？')) {
                          try {
                            if (!db) throw new Error('Firestore not initialized');
                            await deleteDoc(doc(db, 'projects', project.id));
                            queryClient.invalidateQueries({ queryKey: ['projects'] });
                            queryClient.refetchQueries({ queryKey: ['projects'] });
                          } catch (error) {
                            console.error('Error deleting project:', error);
                            alert('プロジェクトの削除に失敗しました');
                          }
                        }
                      }}
                    >
                      削除
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
