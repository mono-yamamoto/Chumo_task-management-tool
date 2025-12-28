'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import type { User } from '@/types';

type AdminUserListProps = {
  users: User[] | undefined;
  editingChatIds: Record<string, string>;
  isEditingChatIds: Record<string, boolean>;
  onChangeEditingChatId: (userId: string, value: string) => void;
  onStartEditingChatId: (userId: string, currentChatId: string) => void;
  onCancelEditingChatId: (userId: string) => void;
  onSaveChatId: (userId: string, chatIdValue: string) => void;
  onToggleAllowed: (userId: string, isAllowed: boolean) => void;
  isSavingChatId: boolean;
  isTogglingAllowed: boolean;
};

export function AdminUserList({
  users,
  editingChatIds,
  isEditingChatIds,
  onChangeEditingChatId,
  onStartEditingChatId,
  onCancelEditingChatId,
  onSaveChatId,
  onToggleAllowed,
  isSavingChatId,
  isTogglingAllowed,
}: AdminUserListProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
          許可リスト管理
        </Typography>
        <List>
          {users?.map((userItem) => {
            const editingChatId = editingChatIds[userItem.id] ?? userItem.chatId ?? '';
            const isEditingChatId = isEditingChatIds[userItem.id] ?? false;

            return (
              <ListItem
                key={userItem.id}
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ListItemText primary={userItem.displayName} secondary={userItem.email} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={userItem.isAllowed ? '許可' : '拒否'}
                      color={userItem.isAllowed ? 'success' : 'error'}
                      size="small"
                    />
                    <Button
                      onClick={() => onToggleAllowed(userItem.id, !userItem.isAllowed)}
                      variant="outlined"
                      size="small"
                      disabled={isTogglingAllowed}
                    >
                      {userItem.isAllowed ? '拒否' : '許可'}
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="text"
                    value={editingChatId}
                    onChange={(event) => onChangeEditingChatId(userItem.id, event.target.value)}
                    placeholder="Google ChatユーザーID"
                    variant="outlined"
                    disabled={!isEditingChatId}
                    helperText={userItem.chatId ? `現在: ${userItem.chatId}` : '未設定'}
                  />
                  {isEditingChatId ? (
                    <>
                      <Button
                        onClick={() => onSaveChatId(userItem.id, editingChatId)}
                        disabled={isSavingChatId}
                        variant="outlined"
                        size="small"
                      >
                        保存
                      </Button>
                      <Button
                        onClick={() => onCancelEditingChatId(userItem.id)}
                        variant="outlined"
                        size="small"
                      >
                        キャンセル
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => onStartEditingChatId(userItem.id, userItem.chatId || '')}
                      variant="outlined"
                      size="small"
                    >
                      編集
                    </Button>
                  )}
                </Box>
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}
