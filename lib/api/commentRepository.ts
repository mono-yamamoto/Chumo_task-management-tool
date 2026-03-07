import { apiClient } from '@/lib/http/apiClient';
import { TaskComment } from '@/types';
import { parseDateRequired } from './dateUtils';

type GetToken = () => Promise<string | null>;

type CommentRaw = Omit<TaskComment, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

function mapComment(raw: CommentRaw): TaskComment {
  return {
    ...raw,
    createdAt: parseDateRequired(raw.createdAt),
    updatedAt: parseDateRequired(raw.updatedAt),
  };
}

export async function fetchTaskComments(
  _projectType: string,
  taskId: string,
  getToken: GetToken
): Promise<TaskComment[]> {
  const data = await apiClient<{ comments: CommentRaw[] }>(
    `/api/comments?taskId=${taskId}&projectType=${_projectType}`,
    { getToken }
  );
  return data.comments.map(mapComment);
}

export async function fetchUnreadCommentTaskIds(
  _userId: string,
  getToken: GetToken
): Promise<Set<string>> {
  const data = await apiClient<{ taskIds: string[] }>('/api/comments/unread', { getToken });
  return new Set(data.taskIds);
}

export async function createComment(
  params: {
    projectType: string;
    taskId: string;
    authorId: string;
    content: string;
    mentionedUserIds?: string[];
  },
  getToken: GetToken
): Promise<string> {
  const data = await apiClient<{ id: string }>('/api/comments', {
    method: 'POST',
    body: {
      taskId: params.taskId,
      projectType: params.projectType,
      content: params.content,
      mentionedUserIds: params.mentionedUserIds,
    },
    getToken,
  });
  return data.id;
}

export async function updateComment(
  params: {
    projectType: string;
    commentId: string;
    content: string;
    mentionedUserIds?: string[];
  },
  getToken: GetToken
): Promise<void> {
  await apiClient(`/api/comments/${params.commentId}`, {
    method: 'PUT',
    body: {
      content: params.content,
      mentionedUserIds: params.mentionedUserIds,
    },
    getToken,
  });
}

export async function deleteComment(
  _projectType: string,
  commentId: string,
  getToken: GetToken
): Promise<void> {
  await apiClient(`/api/comments/${commentId}`, {
    method: 'DELETE',
    getToken,
  });
}

export async function markCommentsAsRead(
  params: {
    projectType: string;
    taskId: string;
    userId: string;
  },
  getToken: GetToken
): Promise<void> {
  await apiClient('/api/comments/mark-read', {
    method: 'POST',
    body: {
      taskId: params.taskId,
      projectType: params.projectType,
    },
    getToken,
  });
}
