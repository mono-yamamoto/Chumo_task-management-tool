'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Label } from '@/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Grid,
  CircularProgress,
} from '@mui/material';
import { useState } from 'react';

export default function LabelsPage() {
  const { user } = useAuth();
  const params = useParams();
  const projectId = params?.projectId as string;
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState('#3b82f6');

  const { data: labels, isLoading } = useQuery({
    queryKey: ['labels', projectId],
    queryFn: async () => {
      if (!projectId || !db) return [];
      const labelsRef = collection(db, 'labels');
      const q = query(labelsRef, where('projectId', '==', projectId));
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
      if (!user || !projectId || !db) { throw new Error('Not authenticated or Firestore not initialized'); }
      const labelData = {
        name: data.name,
        color: data.color,
        projectId,
        ownerId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'labels'), labelData);
      return docRef.id;
    },
    onSuccess: () => {
      // クエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ['labels', projectId] });
      queryClient.refetchQueries({ queryKey: ['labels', projectId] });
      setShowCreateForm(false);
      setLabelName('');
      setLabelColor('#3b82f6');
    },
    onError: (error: Error) => {
      console.error('Error creating label:', error);
      alert(`ラベルの作成に失敗しました: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (labelName.trim()) {
      createLabel.mutate({ name: labelName, color: labelColor });
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
          ラベル管理
        </Typography>
        <Button onClick={() => setShowCreateForm(true)}>新規作成</Button>
      </Box>

      {showCreateForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
              新規ラベル作成
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="text"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="ラベル名"
                variant="outlined"
              />
              <TextField
                type="color"
                value={labelColor}
                onChange={(e) => setLabelColor(e.target.value)}
                variant="outlined"
                sx={{ width: 80 }}
                InputProps={{
                  sx: { height: 56, padding: 0.5 },
                }}
              />
              <Button onClick={handleCreate} disabled={createLabel.isPending}>
                作成
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false);
                  setLabelName('');
                  setLabelColor('#3b82f6');
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
        {labels?.map((label) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: label.color,
                    }}
                  />
                  <Typography sx={{ fontWeight: 'medium' }}>{label.name}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
