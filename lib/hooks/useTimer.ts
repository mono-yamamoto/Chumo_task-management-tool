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
      const response = await fetch(
        `${functionsUrl}/projects/${projectId}/tasks/${taskId}/timer:start`,
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
      const response = await fetch(
        `${functionsUrl}/projects/${projectId}/tasks/timer:stop`,
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

