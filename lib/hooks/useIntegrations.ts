"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_URL || "";

export function useDriveIntegration() {
  const queryClient = useQueryClient();

  const createDriveFolder = useMutation({
    mutationFn: async ({
      projectId,
      taskId,
    }: {
      projectId: string;
      taskId: string;
    }) => {
      const response = await fetch(
        `${functionsUrl}/projects/${projectId}/tasks/${taskId}/drive:create`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Driveフォルダの作成に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });

  return {
    createDriveFolder,
  };
}

export function useFireIntegration() {
  const queryClient = useQueryClient();

  const createFireIssue = useMutation({
    mutationFn: async ({
      projectId,
      taskId,
    }: {
      projectId: string;
      taskId: string;
    }) => {
      const response = await fetch(
        `${functionsUrl}/projects/${projectId}/tasks/${taskId}/fire:create`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "GitHub Issueの作成に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });

  return {
    createFireIssue,
  };
}

