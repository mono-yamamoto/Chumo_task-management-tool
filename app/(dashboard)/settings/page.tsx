'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSettingsOauthStatus } from '@/hooks/useSettingsOauthStatus';
import { AdminUserList } from '@/components/settings/AdminUserList';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingChatIds, setEditingChatIds] = useState<Record<string, string>>({});
  const [isEditingChatIds, setIsEditingChatIds] = useState<Record<string, boolean>>({});

  // OAuth認証状態を確認
  const { data: currentUser = null } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user || !db) return null;
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (!userDoc.exists()) return null;
      return { id: userDoc.id, ...userDoc.data() } as User;
    },
    enabled: !!user && !!db,
  });

  const { oauthStatus, githubUsername, setGithubUsername, chatId, setChatId, message, setMessage } =
    useSettingsOauthStatus({
      currentUser,
      fallbackUser: user,
      router,
      searchParams,
    });

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
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      queryClient.refetchQueries({ queryKey: ['users'] });
      queryClient.refetchQueries({ queryKey: ['user', user?.id] });
    },
  });

  const updateChatId = useMutation({
    mutationFn: async (chatIdValue: string) => {
      if (!user || !db) throw new Error('Not authenticated or Firestore not initialized');
      await updateDoc(doc(db, 'users', user.id), {
        chatId: chatIdValue.trim() || null,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // クエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      queryClient.refetchQueries({ queryKey: ['users'] });
      queryClient.refetchQueries({ queryKey: ['user', user?.id] });
      setMessage('Google ChatユーザーIDを保存しました');
    },
  });

  const updateUserChatId = useMutation({
    mutationFn: async ({ userId, chatIdValue }: { userId: string; chatIdValue: string }) => {
      if (!db) throw new Error('Firestore not initialized');
      await updateDoc(doc(db, 'users', userId), {
        chatId: chatIdValue.trim() || null,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // クエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.refetchQueries({ queryKey: ['users'] });
      setMessage('Google ChatユーザーIDを保存しました');
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

  const handleToggleAllowed = (userId: string, isAllowed: boolean) => {
    toggleUserAllowed.mutate({ userId, isAllowed });
  };

  const handleChangeEditingChatId = (userId: string, value: string) => {
    setEditingChatIds((prev) => ({ ...prev, [userId]: value }));
  };

  const handleStartEditingChatId = (userId: string, currentChatId: string) => {
    setEditingChatIds((prev) => ({ ...prev, [userId]: currentChatId }));
    setIsEditingChatIds((prev) => ({ ...prev, [userId]: true }));
  };

  const handleCancelEditingChatId = (userId: string) => {
    setEditingChatIds((prev) => {
      const nextState = { ...prev };
      delete nextState[userId];
      return nextState;
    });
    setIsEditingChatIds((prev) => ({ ...prev, [userId]: false }));
  };

  const handleSaveUserChatId = (userId: string, chatIdValue: string) => {
    updateUserChatId.mutate({ userId, chatIdValue });
    setIsEditingChatIds((prev) => ({ ...prev, [userId]: false }));
  };

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

      {/* プッシュ通知設定 */}
      <NotificationSettings />

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
                    ? `最終更新: ${currentUser.googleOAuthUpdatedAt.toLocaleString('ja-JP')}`
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
            Google ChatユーザーID
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Google Chatでメンションを受信するために、Google ChatのユーザーIDを設定してください。
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Google ChatユーザーID"
                variant="outlined"
                helperText="例: 1234567890123456789"
              />
              <Button onClick={() => updateChatId.mutate(chatId)} disabled={updateChatId.isPending}>
                保存
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {user?.role === 'admin' && (
        <AdminUserList
          users={users}
          editingChatIds={editingChatIds}
          isEditingChatIds={isEditingChatIds}
          onChangeEditingChatId={handleChangeEditingChatId}
          onStartEditingChatId={handleStartEditingChatId}
          onCancelEditingChatId={handleCancelEditingChatId}
          onSaveChatId={handleSaveUserChatId}
          onToggleAllowed={handleToggleAllowed}
          isSavingChatId={updateUserChatId.isPending}
          isTogglingAllowed={toggleUserAllowed.isPending}
        />
      )}
    </Box>
  );
}
