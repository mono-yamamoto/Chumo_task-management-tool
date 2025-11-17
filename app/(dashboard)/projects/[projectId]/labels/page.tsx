'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/useAuth';
import { useKubunLabels } from '@/lib/hooks/useKubunLabels';
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
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState('#3b82f6');

  // 区分ラベルは全プロジェクト共通
  const { data: labels, isLoading } = useKubunLabels();

  const createLabel = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      if (!user || !db) { throw new Error('Not authenticated or Firestore not initialized'); }
      const labelData = {
        name: data.name,
        color: data.color,
        projectId: null, // 区分ラベルは全プロジェクト共通
        ownerId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'labels'), labelData);
      return docRef.id;
    },
    onSuccess: () => {
      // クエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ['kubunLabels'] });
      queryClient.refetchQueries({ queryKey: ['kubunLabels'] });
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
          区分ラベル管理
        </Typography>
        <Button onClick={() => setShowCreateForm(true)}>新規作成</Button>
      </Box>

      {showCreateForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
              新規区分ラベル作成
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
