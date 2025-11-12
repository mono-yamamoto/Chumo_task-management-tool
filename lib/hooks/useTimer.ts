"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_URL || "";

export function useTimer() {
  const queryClient = useQueryClient();

  const startTimer = useMutation({
    mutationFn: async ({
      projectId,
      taskId,
      userId,
    }: {
      projectId: string;
      taskId: string;
      userId: string;
    }) => {
      // Firebase Functions v2では関数ごとにURLが割り当てられる
      // 環境変数は古い形式（v1）のURLを参照している可能性があるため、常にデフォルトのURLを使用
      const timerUrl = "https://starttimer-zbk3yr5vta-uc.a.run.app";
      const response = await fetch(
        `${timerUrl}/projects/${projectId}/tasks/${taskId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "タイマーの開始に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const stopTimer = useMutation({
    mutationFn: async ({
      projectId,
      sessionId,
    }: {
      projectId: string;
      sessionId: string;
    }) => {
      // Firebase Functions v2では関数ごとにURLが割り当てられる
      // 環境変数は古い形式（v1）のURLを参照している可能性があるため、常にデフォルトのURLを使用
      const timerUrl = "https://stoptimer-zbk3yr5vta-uc.a.run.app";
      const response = await fetch(
        `${timerUrl}/projects/${projectId}/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "タイマーの停止に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    startTimer,
    stopTimer,
  };
}

