'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  BrowserType,
  ContactType,
  DeviceType,
  ErrorReportDetails,
  PCOSType,
  SPOSType,
  SmartphoneType,
} from '@/types';
import { useImageUpload } from '@/hooks/useImageUpload';
import { queryKeys } from '@/lib/queryKeys';

type UseContactFormStateOptions = {
  firebaseUser: FirebaseUser | null;
};

export function useContactFormState({ firebaseUser }: UseContactFormStateOptions) {
  const queryClient = useQueryClient();
  const {
    uploadImage,
    uploading: imageUploading,
    error: imageUploadError,
    progress,
  } = useImageUpload();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ContactType>('error');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // エラー報告用の詳細情報
  const [errorIssue, setErrorIssue] = useState('');
  const [errorReproductionSteps, setErrorReproductionSteps] = useState('');
  const [errorDevice, setErrorDevice] = useState<DeviceType | ''>('');
  const [errorOS, setErrorOS] = useState<PCOSType | SPOSType | SmartphoneType | ''>('');
  const [errorBrowser, setErrorBrowser] = useState<BrowserType | ''>('');
  const [errorOSVersion, setErrorOSVersion] = useState('');
  const [errorBrowserVersion, setErrorBrowserVersion] = useState('');
  const [errorScreenshotUrl, setErrorScreenshotUrl] = useState('');
  const [errorScreenshotFile, setErrorScreenshotFile] = useState<File | null>(null);
  const [errorScreenshotPreview, setErrorScreenshotPreview] = useState<string | null>(null);

  const resetErrorDetails = () => {
    setErrorIssue('');
    setErrorReproductionSteps('');
    setErrorDevice('');
    setErrorOS('');
    setErrorBrowser('');
    setErrorOSVersion('');
    setErrorBrowserVersion('');
    setErrorScreenshotUrl('');
    setErrorScreenshotFile(null);
    setErrorScreenshotPreview(null);
  };

  // 種類が変更されたときにエラー報告の詳細情報をリセット
  useEffect(() => {
    if (type !== 'error') {
      // react-hooks/set-state-in-effect を避けるため非同期でリセット
      setTimeout(() => {
        resetErrorDetails();
      }, 0);
    }
  }, [type]);

  // 画像ファイル選択時の処理
  // eslint-disable-next-line no-undef
  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 画像ファイルかチェック
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '画像ファイルを選択してください。' });
      return;
    }

    // ファイルサイズチェック（10MBまで）
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: '画像ファイルは10MB以下にしてください。' });
      return;
    }

    setErrorScreenshotFile(file);
    setErrorScreenshotUrl(''); // URL入力はクリア

    // プレビュー用のURLを作成
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setErrorScreenshotPreview(loadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 画像アップロード処理
  const handleImageUpload = async () => {
    if (!errorScreenshotFile || !firebaseUser) {
      return;
    }

    const timestamp = Date.now();
    const fileName = `${firebaseUser.uid}/${timestamp}_${errorScreenshotFile.name}`;
    const path = `contacts/${fileName}`;

    const url = await uploadImage(errorScreenshotFile, path, {
      compress: true,
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      maxSizeKB: 500,
    });

    if (url) {
      setErrorScreenshotUrl(url);
      setMessage({ type: 'success', text: '画像のアップロードが完了しました。' });
    } else {
      setMessage({ type: 'error', text: imageUploadError || '画像のアップロードに失敗しました。' });
    }
  };

  const submitContact = useMutation({
    mutationFn: async (data: {
      type: ContactType;
      title: string;
      content: string;
      errorReportDetails?: ErrorReportDetails;
    }) => {
      if (!firebaseUser) {
        throw new Error('認証が必要です');
      }

      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'お問い合わせの送信に失敗しました');
      }

      return response.json();
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: 'お問い合わせを送信しました。ありがとうございます。' });
      setTitle('');
      setContent('');
      setType('error');
      resetErrorDetails();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts('pending') });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts('resolved') });
    },
    onError: (error: Error) => {
      setMessage({ type: 'error', text: error.message });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'タイトルを入力してください。' });
      return;
    }

    // エラー報告以外の場合、内容を必須とする
    if (type !== 'error' && !content.trim()) {
      setMessage({ type: 'error', text: '内容を入力してください。' });
      return;
    }

    // エラー報告の場合、詳細情報を検証
    if (type === 'error') {
      if (!errorIssue.trim()) {
        setMessage({ type: 'error', text: '事象を入力してください。' });
        return;
      }
      if (!errorReproductionSteps.trim()) {
        setMessage({ type: 'error', text: '再現方法を入力してください。' });
        return;
      }
      if (!errorDevice) {
        setMessage({ type: 'error', text: 'デバイス（PC/SP）を選択してください。' });
        return;
      }
      if (!errorOS) {
        setMessage({
          type: 'error',
          text:
            errorDevice === 'SP' ? 'スマホの種類を選択してください。' : 'OSを選択してください。',
        });
        return;
      }
      if (!errorBrowser) {
        setMessage({ type: 'error', text: 'ブラウザを選択してください。' });
        return;
      }
      if (!errorBrowserVersion.trim()) {
        setMessage({ type: 'error', text: 'ブラウザのバージョンを入力してください。' });
        return;
      }
      if (errorDevice === 'SP' && !errorOSVersion.trim()) {
        setMessage({ type: 'error', text: 'スマホのバージョンを入力してください。' });
        return;
      }
    }

    // エラー報告の場合、テンプレートに基づいて内容を生成
    let finalContent = content.trim();
    if (type === 'error') {
      const errorDetails: ErrorReportDetails = {
        issue: errorIssue.trim(),
        reproductionSteps: errorReproductionSteps.trim(),
        environment: {
          device: errorDevice as DeviceType,
          os: errorOS as PCOSType | SPOSType | SmartphoneType,
          browser: errorBrowser as BrowserType,
          osVersion: errorOSVersion?.trim() || undefined,
          browserVersion: errorBrowserVersion.trim(),
        },
        screenshotUrl: errorScreenshotUrl?.trim() || undefined,
      };

      // テンプレートに基づいて内容を生成
      const environmentLines = [`- デバイス: ${errorDevice}`];

      if (errorDevice === 'PC') {
        environmentLines.push(`- OS: ${errorOS}`);
        if (errorOSVersion.trim()) {
          environmentLines.push(`- OSのバージョン: ${errorOSVersion.trim()}`);
        }
      } else {
        environmentLines.push(`- スマホの種類: ${errorOS}`);
        if (errorOSVersion.trim()) {
          environmentLines.push(`- スマホのバージョン: ${errorOSVersion.trim()}`);
        }
      }

      environmentLines.push(`- ブラウザ: ${errorBrowser}`);
      if (errorBrowserVersion.trim()) {
        environmentLines.push(`- ブラウザのバージョン: ${errorBrowserVersion.trim()}`);
      }

      if (errorScreenshotUrl.trim()) {
        environmentLines.push(`- スクリーンショット: ${errorScreenshotUrl.trim()}`);
      }

      finalContent = [
        '## 事象',
        errorIssue.trim(),
        '',
        '## 再現方法',
        errorReproductionSteps.trim(),
        '',
        '## 環境',
        ...environmentLines,
        '',
        '---',
        '',
        content.trim() ? `**その他の情報**:\n${content.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      submitContact.mutate({
        type,
        title: title.trim(),
        content: finalContent,
        errorReportDetails: errorDetails,
      });
      return;
    }

    submitContact.mutate({
      type,
      title: title.trim(),
      content: finalContent,
    });
  };

  const handleDeviceChange = (device: DeviceType) => {
    setErrorDevice(device);
    // デバイスが変更されたらOSをリセット
    setErrorOS('');
    setErrorOSVersion('');
  };

  const handleOSChange = (os: PCOSType | SPOSType | SmartphoneType) => {
    setErrorOS(os);
  };

  const handleBrowserChange = (browser: BrowserType) => {
    setErrorBrowser(browser);
  };

  const handleScreenshotUrlChange = (url: string) => {
    setErrorScreenshotUrl(url);
    setErrorScreenshotFile(null);
    setErrorScreenshotPreview(null);
  };

  return {
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
    setErrorDevice,
    errorOS,
    setErrorOS,
    errorBrowser,
    setErrorBrowser,
    errorOSVersion,
    setErrorOSVersion,
    errorBrowserVersion,
    setErrorBrowserVersion,
    errorScreenshotFile,
    errorScreenshotPreview,
    errorScreenshotUrl,
    handleDeviceChange,
    handleOSChange,
    handleBrowserChange,
    handleScreenshotUrlChange,
    handleImageSelect,
    handleImageUpload,
    imageUploading,
    progress,
    handleSubmit,
    isSubmitting: submitContact.isPending,
  };
}
