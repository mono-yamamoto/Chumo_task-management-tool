import { create } from 'zustand';
import { Task, FlowStatus } from '@/types';
import { ProjectType } from '@/constants/projectTypes';

interface TaskStore {
  // 選択中のタスクID
  selectedTaskId: string | null;
  setSelectedTaskId: (_taskId: string | null) => void;

  // 選択中のプロジェクトタイプ
  selectedProjectType: ProjectType | 'all';
  setSelectedProjectType: (_projectType: ProjectType | 'all') => void;

  // フォームデータ
  taskFormData: Partial<Task> | null;
  setTaskFormData: (_formData: Partial<Task> | null) => void;

  // フィルタ状態
  filterStatus: FlowStatus | 'all' | 'not-completed';
  setFilterStatus: (_status: FlowStatus | 'all' | 'not-completed') => void;
  filterAssignee: string;
  setFilterAssignee: (_assignee: string) => void;
  filterLabel: string;
  setFilterLabel: (_label: string) => void;
  filterTimerActive: string;
  setFilterTimerActive: (_active: string) => void;
  filterItUpDateMonth: string;
  setFilterItUpDateMonth: (_month: string) => void;
  filterReleaseDateMonth: string;
  setFilterReleaseDateMonth: (_month: string) => void;
  filterTitle: string;
  setFilterTitle: (_title: string) => void;

  // アクティブセッション
  activeSession: {
    projectType: string;
    taskId: string;
    sessionId: string;
  } | null;
  setActiveSession: (_session: {
    projectType: string;
    taskId: string;
    sessionId: string;
  } | null) => void;

  // フィルタリセット
  resetFilters: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  selectedTaskId: null,
  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),

  selectedProjectType: 'all',
  setSelectedProjectType: (projectType) => set({ selectedProjectType: projectType }),

  taskFormData: null,
  setTaskFormData: (formData) => set({ taskFormData: formData }),

  filterStatus: 'not-completed',
  setFilterStatus: (status) => set({ filterStatus: status }),
  filterAssignee: 'all',
  setFilterAssignee: (assignee) => set({ filterAssignee: assignee }),
  filterLabel: 'all',
  setFilterLabel: (label) => set({ filterLabel: label }),
  filterTimerActive: 'all',
  setFilterTimerActive: (active) => set({ filterTimerActive: active }),
  filterItUpDateMonth: '',
  setFilterItUpDateMonth: (month) => set({ filterItUpDateMonth: month }),
  filterReleaseDateMonth: '',
  setFilterReleaseDateMonth: (month) => set({ filterReleaseDateMonth: month }),
  filterTitle: '',
  setFilterTitle: (title) => set({ filterTitle: title }),

  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),

  resetFilters: () =>
    set({
      selectedProjectType: 'all',
      filterStatus: 'not-completed',
      filterAssignee: 'all',
      filterLabel: 'all',
      filterTimerActive: 'all',
      filterItUpDateMonth: '',
      filterReleaseDateMonth: '',
      filterTitle: '',
    }),
}));

