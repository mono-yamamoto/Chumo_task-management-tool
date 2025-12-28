'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ContactType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useContactFormState } from '@/hooks/useContactFormState';
import { Button } from '@/components/ui/button';
import { Box, Typography, CircularProgress } from '@mui/material';
import { ContactFormDrawer } from '@/components/Drawer/ContactFormDrawer';
import { ContactListSection } from '@/components/contact/ContactListSection';
import { queryKeys } from '@/lib/queryKeys';
import { fetchContactsByStatus } from '@/lib/firestore/repositories/contactRepository';

function getContactTypeLabel(type: ContactType): string {
  switch (type) {
    case 'error':
      return 'エラー報告';
    case 'feature':
      return '要望';
    case 'other':
      return 'そのほか';
    default:
      return 'そのほか';
  }
}

function getContactTypeColor(type: ContactType): 'error' | 'info' | 'warning' {
  switch (type) {
    case 'error':
      return 'error';
    case 'feature':
      return 'info';
    case 'other':
      return 'warning';
    default:
      return 'warning';
  }
}

export default function ContactPage() {
  const { user, firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'pending' | 'resolved'>('pending');
  const {
    showForm,
    setShowForm,
    type,
    setType,
    title,
    setTitle,
    content,
    setContent,
    message,
    setMessage,
    errorIssue,
    setErrorIssue,
    errorReproductionSteps,
    setErrorReproductionSteps,
    errorDevice,
    errorOS,
    errorBrowser,
    errorOSVersion,
    setErrorOSVersion,
    errorBrowserVersion,
    setErrorBrowserVersion,
    errorScreenshotUrl,
    errorScreenshotFile,
    errorScreenshotPreview,
    handleDeviceChange,
    handleOSChange,
    handleBrowserChange,
    handleImageSelect,
    handleImageUpload,
    handleScreenshotUrlChange,
    imageUploading,
    progress,
    handleSubmit,
    isSubmitting,
  } = useContactFormState({ firebaseUser });

  // 未解決のお問い合わせを取得
  const { data: pendingContacts, isLoading: isLoadingPending } = useQuery({
    queryKey: queryKeys.contacts('pending'),
    queryFn: async () => {
      if (!db) return [];
      return fetchContactsByStatus('pending');
    },
    enabled: !!user && !!db,
  });

  // 解決済みのお問い合わせを取得
  const { data: resolvedContacts, isLoading: isLoadingResolved } = useQuery({
    queryKey: queryKeys.contacts('resolved'),
    queryFn: async () => {
      if (!db) return [];
      return fetchContactsByStatus('resolved');
    },
    enabled: !!user && !!db,
  });

  const updateContactStatus = useMutation({
    mutationFn: async ({
      contactId,
      status,
    }: {
      contactId: string;
      status: 'pending' | 'resolved';
    }) => {
      if (!db) throw new Error('Firestore not initialized');
      await updateDoc(doc(db, 'contacts', contactId), {
        status,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts('pending') });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts('resolved') });
    },
  });

  const handleToggleStatus = (contactId: string, status: 'pending' | 'resolved') => {
    updateContactStatus.mutate({ contactId, status });
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* 左側: お問い合わせ一覧（全ユーザー）または新規作成フォーム（一般ユーザー） */}
      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            お問い合わせ
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              onClick={() => {
                setViewMode(viewMode === 'pending' ? 'resolved' : 'pending');
              }}
              variant="outline"
              size="sm"
            >
              {viewMode === 'pending' ? '解決済みを表示' : '対応中を表示'}
            </Button>
            <Button onClick={() => setShowForm(true)} variant="default">
              新規作成
            </Button>
          </Box>
        </Box>

        {/* 未解決のお問い合わせ */}
        {viewMode === 'pending' && (
          <ContactListSection
            title="対応中"
            contacts={pendingContacts}
            isLoading={isLoadingPending}
            emptyMessage="対応中のお問い合わせはありません"
            variant="pending"
            onToggleStatus={handleToggleStatus}
            isUpdating={updateContactStatus.isPending}
            getContactTypeLabel={getContactTypeLabel}
            getContactTypeColor={getContactTypeColor}
          />
        )}

        {/* 解決済みのお問い合わせ */}
        {viewMode === 'resolved' && (
          <ContactListSection
            title="解決済み"
            contacts={resolvedContacts}
            isLoading={isLoadingResolved}
            emptyMessage="解決済みのお問い合わせはありません"
            variant="resolved"
            onToggleStatus={handleToggleStatus}
            isUpdating={updateContactStatus.isPending}
            getContactTypeLabel={getContactTypeLabel}
            getContactTypeColor={getContactTypeColor}
          />
        )}
      </Box>

      {/* 右側: 新規作成フォーム（全ユーザーがDrawerで表示） */}
      <ContactFormDrawer
        open={showForm}
        onClose={() => setShowForm(false)}
        type={type}
        onTypeChange={setType}
        title={title}
        onTitleChange={setTitle}
        content={content}
        onContentChange={setContent}
        message={message}
        onMessageClose={() => setMessage(null)}
        errorIssue={errorIssue}
        onErrorIssueChange={setErrorIssue}
        errorReproductionSteps={errorReproductionSteps}
        onErrorReproductionStepsChange={setErrorReproductionSteps}
        errorDevice={errorDevice}
        onErrorDeviceChange={handleDeviceChange}
        errorOS={errorOS}
        onErrorOSChange={handleOSChange}
        errorOSVersion={errorOSVersion}
        onErrorOSVersionChange={setErrorOSVersion}
        errorBrowser={errorBrowser}
        onErrorBrowserChange={handleBrowserChange}
        errorBrowserVersion={errorBrowserVersion}
        onErrorBrowserVersionChange={setErrorBrowserVersion}
        errorScreenshotUrl={errorScreenshotUrl}
        onErrorScreenshotUrlChange={handleScreenshotUrlChange}
        errorScreenshotFile={errorScreenshotFile}
        errorScreenshotPreview={errorScreenshotPreview}
        onImageSelect={handleImageSelect}
        onImageUpload={handleImageUpload}
        imageUploading={imageUploading}
        progress={progress}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </Box>
  );
}
