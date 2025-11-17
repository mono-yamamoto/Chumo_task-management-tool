'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection, getDocs, doc, updateDoc, getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User } from '@/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || '');
  const [oauthStatus, setOauthStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  // OAuth認証状態を確認
  const { data: currentUser } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user || !db) return null;
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (!userDoc.exists()) return null;
      return { id: userDoc.id, ...userDoc.data() } as User;
    },
    enabled: !!user && !!db,
  });

  useEffect(() => {
    if (currentUser) {
      const hasToken = !!currentUser.googleRefreshToken;
      console.debug('OAuth status check:', {
        userId: currentUser.id,
        hasToken,
        tokenLength: currentUser.googleRefreshToken?.length || 0,
        allFields: Object.keys(currentUser),
      });
      setOauthStatus(hasToken ? 'connected' : 'disconnected');
    }
  }, [currentUser]);

  // URLパラメータからメッセージを取得
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');

    if (success === 'oauth_connected') {
      setMessage('Google Drive認証が完了しました');
      setOauthStatus('connected');
      // URLからパラメータを削除
      router.replace('/settings');
    } else if (error) {
      setMessage(`エラー: ${errorMessage || error}`);
      // URLからパラメータを削除
      router.replace('/settings');
    }
  }, [searchParams, router]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!db) return [];
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as User[];
    },
    enabled: user?.role === 'admin',
  });

  const connectGoogleDrive = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/auth/google?userId=${user.id}`);
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setMessage('認証URLの取得に失敗しました');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setMessage('認証の開始に失敗しました');
    }
  };

  const updateGithubUsername = useMutation({
    mutationFn: async (username: string) => {
      if (!user || !db) throw new Error('Not authenticated or Firestore not initialized');
      await updateDoc(doc(db, 'users', user.id), {
        githubUsername: username,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // クエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.refetchQueries({ queryKey: ['users'] });
    },
  });

  const toggleUserAllowed = useMutation({
    mutationFn: async ({ userId, isAllowed }: { userId: string; isAllowed: boolean }) => {
      if (!db) throw new Error('Firestore not initialized');
      await updateDoc(doc(db, 'users', userId), {
        isAllowed,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // クエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.refetchQueries({ queryKey: ['users'] });
    },
  });

  if (!user || user.role !== 'admin') {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>アクセス権限がありません</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
        設定
      </Typography>

      {message && (
        <Alert
          severity={message.includes('エラー') ? 'error' : 'success'}
          onClose={() => setMessage(null)}
          sx={{ mb: 2 }}
        >
          {message}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
            Google Drive連携
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Google Driveでチェックシートを作成するために、Googleアカウントとの連携が必要です。
            </Typography>
            {oauthStatus === 'connected' ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label="連携済み" color="success" size="small" />
                <Typography variant="body2" color="text.secondary">
                  {currentUser?.googleOAuthUpdatedAt
                    ? `最終更新: ${new Date(currentUser.googleOAuthUpdatedAt.seconds * 1000).toLocaleString('ja-JP')}`
                    : ''}
                </Typography>
              </Box>
            ) : (
              <Button onClick={connectGoogleDrive} disabled={oauthStatus === 'loading'}>
                Google Driveと連携
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
            GitHubユーザー名
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
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
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
            許可リスト管理
          </Typography>
          <List>
            {users?.map((u) => (
              <ListItem
                key={u.id}
                sx={{
                  borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between',
                }}
              >
                <ListItemText
                  primary={u.displayName}
                  secondary={u.email}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={u.isAllowed ? '許可' : '拒否'}
                    color={u.isAllowed ? 'success' : 'error'}
                    size="small"
                  />
                  <Button
                    onClick={() => toggleUserAllowed.mutate({
                      userId: u.id,
                      isAllowed: !u.isAllowed,
                    })}
                    variant="outline"
                    size="sm"
                  >
                    {u.isAllowed ? '拒否' : '許可'}
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
