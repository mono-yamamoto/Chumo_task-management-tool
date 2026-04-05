import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UseMutationResult } from '@tanstack/react-query';
import { useIntegrations, type IntegrationResult } from './useIntegrations';
import { useToast } from './useToast';
import { HttpError } from '../lib/api';
import { openExternal } from '../lib/utils';
import type { Task } from '../types';

type IntegrationMutation = UseMutationResult<IntegrationResult, Error, string, unknown>;

/**
 * 統合ボタンの作成ハンドラ + 開くハンドラを返す
 * DrawerActionBar / TaskDetailActionBar で共通利用
 */
export function useIntegrationActions(task: Task) {
  const navigate = useNavigate();
  const { createDriveFolder, createChatThread, createFireIssue, createPetIssue } =
    useIntegrations();
  const { addToast } = useToast();

  const makeCreateHandler = useCallback(
    (mutation: IntegrationMutation, opts?: { onAuthError?: () => void }) => () => {
      mutation.mutate(task.id, {
        onSuccess: () => {
          addToast('作成しました', 'success');
        },
        onError: (error) => {
          if (opts?.onAuthError && error instanceof HttpError && error.details?.requiresAuth) {
            addToast('Google Drive認証が必要です。設定ページへ移動します。', 'warning');
            opts.onAuthError();
          } else {
            addToast(error.message || '外部サービスとの連携に失敗しました', 'error');
          }
        },
      });
    },
    [task.id, addToast]
  );

  const makeClickHandler = (url: string | null | undefined, createHandler: () => void) =>
    url ? () => openExternal(url) : createHandler;

  const handleDriveCreate = makeCreateHandler(createDriveFolder, {
    onAuthError: () => navigate('/settings?tab=integrations'),
  });
  const handleChatCreate = makeCreateHandler(createChatThread);
  const handleFireCreate = makeCreateHandler(createFireIssue);
  const handlePetCreate = makeCreateHandler(createPetIssue);

  return {
    drive: {
      onClick: makeClickHandler(task.googleDriveUrl, handleDriveCreate),
      isPending: createDriveFolder.isPending,
      active: !!task.googleDriveUrl,
      label: task.googleDriveUrl ? 'DRIVE開く' : 'DRIVE作成',
    },
    chat: {
      onClick: makeClickHandler(task.googleChatThreadUrl, handleChatCreate),
      isPending: createChatThread.isPending,
      active: !!task.googleChatThreadUrl,
      label: task.googleChatThreadUrl ? 'CHAT開く' : 'CHAT作成',
    },
    fire: {
      onClick: makeClickHandler(task.fireIssueUrl, handleFireCreate),
      isPending: createFireIssue.isPending,
      active: !!task.fireIssueUrl,
      label: task.fireIssueUrl ? 'FIRE開く' : 'FIRE issue作成',
    },
    pet: {
      onClick: makeClickHandler(task.petIssueUrl, handlePetCreate),
      isPending: createPetIssue.isPending,
      active: !!task.petIssueUrl,
      label: task.petIssueUrl ? 'PET開く' : 'PET issue作成',
    },
  };
}
