import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Task, FlowStatus, ActiveSession } from '@/types';
import { ProjectType } from '@/constants/projectTypes';
import { TASK_STORAGE_KEY } from '@/constants/timer';

export type ViewMode = 'table' | 'personal';

interface TaskStore {
  // ビューモード
  viewMode: ViewMode;
  setViewMode: (_mode: ViewMode) => void;

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
  activeSession: ActiveSession | null;
  setActiveSession: (_session: ActiveSession | null) => void;

  // フィルタリセット
  resetFilters: () => void;
}

// ============================================
// Selector Hooks
// ============================================

/**
 * ビュー関連の状態を取得するセレクターフック
 */
export const useTaskViewState = () =>
  useTaskStore((state) => ({
    viewMode: state.viewMode,
    setViewMode: state.setViewMode,
    selectedProjectType: state.selectedProjectType,
    setSelectedProjectType: state.setSelectedProjectType,
  }));

/**
 * フィルター関連の状態を取得するセレクターフック
 */
export const useTaskFiltersState = () =>
  useTaskStore((state) => ({
    filterStatus: state.filterStatus,
    setFilterStatus: state.setFilterStatus,
    filterAssignee: state.filterAssignee,
    setFilterAssignee: state.setFilterAssignee,
    filterLabel: state.filterLabel,
    setFilterLabel: state.setFilterLabel,
    filterTimerActive: state.filterTimerActive,
    setFilterTimerActive: state.setFilterTimerActive,
    filterItUpDateMonth: state.filterItUpDateMonth,
    setFilterItUpDateMonth: state.setFilterItUpDateMonth,
    filterReleaseDateMonth: state.filterReleaseDateMonth,
    setFilterReleaseDateMonth: state.setFilterReleaseDateMonth,
    filterTitle: state.filterTitle,
    setFilterTitle: state.setFilterTitle,
    resetFilters: state.resetFilters,
  }));

/**
 * タスク選択関連の状態を取得するセレクターフック
 */
export const useTaskSelectionState = () =>
  useTaskStore((state) => ({
    selectedTaskId: state.selectedTaskId,
    setSelectedTaskId: state.setSelectedTaskId,
    taskFormData: state.taskFormData,
    setTaskFormData: state.setTaskFormData,
  }));

/**
 * アクティブセッション関連の状態を取得するセレクターフック
 */
export const useActiveSessionState = () =>
  useTaskStore((state) => ({
    activeSession: state.activeSession,
    setActiveSession: state.setActiveSession,
  }));

// ============================================
// Store Definition
// ============================================

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      viewMode: 'table',
      setViewMode: (mode) => set({ viewMode: mode }),

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
    }),
    {
      name: TASK_STORAGE_KEY, // ストレージのキー名
      storage: createJSONStorage(() => localStorage), // localStorageを使用
      // activeSessionとviewModeを永続化
      // activeSession: ページリロード時に実行中のタイマー状態を復元するため
      // viewMode: ユーザーの表示モード選択を維持するため
      partialize: (state) => ({
        activeSession: state.activeSession,
        viewMode: state.viewMode,
      }),
    }
  )
);
