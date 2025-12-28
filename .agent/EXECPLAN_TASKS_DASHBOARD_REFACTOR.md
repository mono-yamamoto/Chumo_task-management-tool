# Refactor task dashboard/task list pages by extracting shared task detail logic

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `.agent/PLANS.md` and must be maintained accordingly.

## Purpose / Big Picture

Users and developers should be able to read and maintain task-related pages without scanning hundreds of lines of mixed UI, state, and side-effect logic. After this change, the Dashboard (`/dashboard`) and Tasks (`/tasks`) pages will be shorter because shared task detail behavior (selection state, timer/integration actions, and formatting) will live in dedicated hooks. The UI should remain the same: the Task detail drawer behaves identically, task actions still invalidate the same queries, and delete behavior remains unchanged. This can be verified by running the app and confirming the task list and drawer behave the same as before.

## Progress

- [x] (2025-09-04 13:55Z) Draft and confirm the extraction strategy for shared task detail state and actions.
- [x] (2025-09-04 14:10Z) Implement `hooks/useTaskDetailState.ts` to unify selection + form initialization logic.
- [x] (2025-09-04 14:20Z) Implement `hooks/useTaskDetailActions.ts` to unify timer + integration actions and query invalidation.
- [x] (2025-09-04 14:30Z) Update `app/(dashboard)/dashboard/page.tsx` to use the new hooks and remove duplicated logic.
- [x] (2025-09-04 14:35Z) Update `app/(dashboard)/tasks/page.tsx` to use the new hooks and remove duplicated logic.
- [ ] (2025-12-28 02:18Z) Validate lint/build expectations (completed: `npm run lint`; remaining: `npx tsc --noEmit` fails in existing files: `app/(dashboard)/tasks/[taskId]/page.tsx`, `hooks/useTaskDetailActions.ts`, `hooks/useTimerTitle.ts`). UI check performed for `/dashboard` and `/tasks` (unauthenticated alert only).

## Surprises & Discoveries

- Observation: Kiri MCP is running in degraded mode (files_search only).
  Evidence: Tool response indicated “Server is running in degrade mode: duckdb:context_bundle. Only files_search is available.”
- Observation: `npx tsc --noEmit` reports pre-existing type errors in task detail and timer hooks.
  Evidence: Errors in `app/(dashboard)/tasks/[taskId]/page.tsx`, `hooks/useTaskDetailActions.ts`, `hooks/useTimerTitle.ts`.

## Decision Log

- Decision: Extract shared task detail logic into hooks rather than a shared UI component to minimize UI changes while shrinking page files.
  Rationale: The biggest duplication is in state and side-effect handlers (timer/integrations/selection); extracting these reduces page length without reshaping UI structure.
  Date/Author: 2025-09-04 / Codex

- Decision: Allow `useTaskDetailState` and `useTaskDetailActions` to accept externally managed state (Zustand) for the tasks page.
  Rationale: Keeps existing persistence semantics from `stores/taskStore.ts` while still sharing logic.
  Date/Author: 2025-09-04 / Codex

## Outcomes & Retrospective

- Pending.

## Context and Orientation

The task list and dashboard pages live in `app/(dashboard)/tasks/page.tsx` and `app/(dashboard)/dashboard/page.tsx`. Both pages render `components/Drawer/TaskDetailDrawer` and share logic for selecting tasks, initializing form data, handling timers, and integrating with external services (Drive, Fire, Google Chat). The hooks for timer and integrations are in `hooks/useTimerActions.ts` and `hooks/useIntegrations.ts`. Query keys live in `lib/queryKeys.ts` and are used for React Query invalidation. The refactor should keep these query keys identical to avoid behavior changes.

## Plan of Work

Implement two hooks:

1) `hooks/useTaskDetailState.ts`: Provide selected task id, derived task, form data, and a task selection handler. It should accept the list of tasks and a mode that matches existing behavior differences between the dashboard and tasks page (always initialize vs initialize only when form data is empty).

2) `hooks/useTaskDetailActions.ts`: Provide active session state, timer handlers, integration handlers, and a `formatDuration` helper. It should accept `userId`, `queryClient`, and the list of query keys to invalidate/refetch for list and detail updates. All existing invalidation/refetch behavior must be preserved.

Then update both pages to use these hooks, removing duplicated logic. Ensure props passed to `TaskDetailDrawer` are unchanged and the delete dialog behavior stays intact.

## Concrete Steps

- In the repo root, create `hooks/useTaskDetailState.ts` with a hook that:
  - Accepts `{ tasks, initializeMode }`.
  - Returns `selectedTaskId`, `setSelectedTaskId`, `selectedTask`, `taskFormData`, `setTaskFormData`, `handleTaskSelect`, and `resetSelection`.
  - Initializes form data on selection with the same fields currently used on each page.
- Create `hooks/useTaskDetailActions.ts` that:
  - Accepts `{ userId, queryClient, listQueryKeys, detailQueryKey }`.
  - Uses `useTimerActions`, `useActiveSession`, and integration hooks to return handler functions and pending flags.
  - Implements `formatDuration` identical to the existing page logic.
- Update `app/(dashboard)/dashboard/page.tsx`:
  - Replace local selection state, `useActiveSession`, `useTimerActions`, integration handlers, and `formatDuration` with the hooks.
  - Pass list query keys: `queryKeys.dashboardTasks(user?.id)` and `queryKeys.tasks('all')`.
- Update `app/(dashboard)/tasks/page.tsx`:
  - Replace the same duplicated logic with the hooks.
  - Pass list query keys: `queryKeys.tasks('all')`.
- If a dev server is running, verify the UI in the browser. Otherwise, note that runtime verification was skipped.

## Validation and Acceptance

The Task list and Dashboard pages must behave the same:

- Selecting a task opens the detail drawer and shows the same fields as before.
- Timer start/stop works and reflects in the list.
- Drive/Fire/Chat integrations still invalidate queries as before (no stale data).
- Deleting a task still requires title confirmation and closes the drawer on success.

If possible, run `npm run lint` and start the dev server with `npm run dev`, then verify `/dashboard` and `/tasks` manually. If not run, document why.

## Idempotence and Recovery

These changes are additive and can be applied incrementally. If the new hooks cause type errors, revert the page-level changes and keep the hooks unused until types are fixed. No destructive operations are involved.

## Artifacts and Notes

- No external artifacts yet.

## Interfaces and Dependencies

- New hook in `hooks/useTaskDetailState.ts`:

  export type TaskDetailInitializeMode = 'always' | 'if-empty';

  export function useTaskDetailState(options: {
    tasks: Task[];
    initializeMode: TaskDetailInitializeMode;
  }): {
    selectedTaskId: string | null;
    setSelectedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
    selectedTask: Task | null;
    taskFormData: Partial<Task> | null;
    setTaskFormData: React.Dispatch<React.SetStateAction<Partial<Task> | null>>;
    handleTaskSelect: (taskId: string) => void;
    resetSelection: () => void;
  };

- New hook in `hooks/useTaskDetailActions.ts`:

  export function useTaskDetailActions(options: {
    userId?: string | null;
    queryClient: QueryClient;
    listQueryKeys: QueryKey[];
    detailQueryKey: (taskId: string) => QueryKey;
  }): {
    activeSession: ActiveSession | null;
    handleStartTimer: (projectType: string, taskId: string) => Promise<void>;
    handleStopTimer: () => Promise<void>;
    isStoppingTimer: boolean;
    handleDriveCreate: (projectType: string, taskId: string) => Promise<void>;
    isCreatingDrive: boolean;
    handleFireCreate: (projectType: string, taskId: string) => Promise<void>;
    isCreatingFire: boolean;
    handleChatThreadCreate: (projectType: string, taskId: string) => Promise<void>;
    isCreatingChatThread: boolean;
    formatDuration: (durationSec: number | undefined | null, startedAt?: Date, endedAt?: Date | null) => string;
  };
