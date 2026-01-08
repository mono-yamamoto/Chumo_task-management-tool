# Refactor data access and page responsibilities for DRY/SOLID

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan must be maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

The goal is to make the task, session, and contact flows easier to maintain by separating data access, data transformation, and UI concerns. After this change, a developer can update Firestore mapping or query behavior in one place and see it reflected across the dashboard, task detail, and contact pages. The observable effect is that the UI continues to behave the same, but the codebase has clear repositories and mappers for Firestore data, and the query keys are centralized. The change is validated by running the app and confirming that task lists, task details, sessions, and contacts still load and update correctly.

## Progress

- [x] (2025-10-01 01:20Z) Create shared query keys and Firestore mappers for Task, TaskSession, and Contact.
- [x] (2025-10-01 01:40Z) Introduce repository helpers for tasks, sessions, and contacts, then switch hooks to use them.
- [x] (2025-10-01 02:10Z) Update dashboard, task list, and task detail pages to consume shared mappers and query keys instead of inline Firestore conversions.
- [x] (2025-10-01 02:20Z) Update contact page to use repository and shared mapping utilities.
- [x] (2025-10-01 02:30Z) Centralize external integration fetch handling and update integration hooks.
- [x] (2025-10-01 02:35Z) Attempted lint run; npm failed due to missing Node module on this environment.

## Surprises & Discoveries

- Observation: `npm run lint` failed because `npm` could not resolve `node:path` in the runtime environment.
  Evidence: Error `Cannot find module 'node:path'` from `/usr/local/lib/node_modules/npm/lib/cli.js`.

## Decision Log

- Decision: Use a repository + mapper structure under `lib/firestore/` instead of introducing a new external data library.
  Rationale: Keeps changes localized and avoids new dependencies while improving separation of concerns.
  Date/Author: 2025-10-01 Codex

## Outcomes & Retrospective

- Outcome: Shared Firestore mappers, repositories, and query key helpers are in place, and task/contact/integration code now uses them. Linting could not be verified in this environment because npm failed to load `node:path`.

## Context and Orientation

The dashboard and task detail pages load Firestore data directly and perform inline `toDate()` conversions. The contact page similarly loads contacts with inline Firestore conversions. There are multiple custom hooks for tasks and sessions under `hooks/` that mix querying, transformation, and cache invalidation. Query keys are strings written inline across hooks and pages. The goal is to introduce centralized query key helpers, Firestore mappers for common conversions, and repository helpers that encapsulate Firestore paths and queries. This will allow the UI components and hooks to depend on a single, shared source of truth for data shape and conversions.

Key files and directories:

- `hooks/useTasks.ts` and `hooks/useTaskSessions.ts` contain Firestore queries and conversions.
- `app/(dashboard)/dashboard/page.tsx` loads tasks directly and converts Firestore timestamps inline.
- `app/(dashboard)/tasks/[taskId]/page.tsx` uses both hooks and direct Firestore queries for sessions.
- `app/(dashboard)/contact/page.tsx` loads and filters contacts with inline conversions.
- `hooks/useIntegrations.ts` performs repeated `fetch` error handling.

Terms used in this plan:

- “Mapper” means a small pure function that converts Firestore document data into application types, handling `Timestamp` to `Date` conversions.
- “Repository” means a module that knows Firestore paths and queries and returns plain data for hooks or pages to consume.
- “Query key” means a React Query cache key. Centralizing keys prevents cache mismatch and makes invalidation consistent.

## Plan of Work

First, add shared helpers under `lib/firestore/` to convert Firestore data into `Task`, `TaskSession`, and `Contact` shapes. This includes a small date conversion helper to keep the mapper logic concise. Next, add repository modules under `lib/firestore/repositories/` that encapsulate Firestore queries for tasks, sessions, and contacts. These repositories will return mapped objects using the shared mappers.

Then, introduce `lib/queryKeys.ts` and update `hooks/useTasks.ts`, `hooks/useTaskSessions.ts`, and related pages to use those keys and repositories. Update the dashboard page and task detail page to remove inline Firestore conversions and rely on shared mappers. Update the contact page to use a repository for fetching contacts and a mapper for date conversion.

Finally, add a small `lib/http/fetchJson.ts` helper to consolidate `fetch` error handling and update `hooks/useIntegrations.ts` to use it.

## Concrete Steps

1. Create mapper helpers:
   - `lib/firestore/mappers/date.ts` with small `toDate` and `toNullableDate` utilities.
   - `lib/firestore/mappers/taskMapper.ts` with `mapTaskDoc` that accepts Firestore doc data plus `projectType`.
   - `lib/firestore/mappers/sessionMapper.ts` with `mapSessionDoc` to convert session timestamps.
   - `lib/firestore/mappers/contactMapper.ts` with `mapContactDoc` for `Contact` timestamps.

2. Create repositories:
   - `lib/firestore/repositories/taskRepository.ts` to expose `fetchTasksByProject`, `fetchTaskById`, and `fetchAssignedTasks`.
   - `lib/firestore/repositories/sessionRepository.ts` to expose `fetchTaskSessions`, `fetchActiveSessions`, and `fetchActiveSessionForTask`.
   - `lib/firestore/repositories/contactRepository.ts` to expose `fetchContactsByStatus`.

3. Add `lib/queryKeys.ts` with functions for `tasks`, `task`, `taskSessions`, `activeSession`, `contacts`, and `sessionHistory`.

4. Update hooks and pages to use repositories and query keys:
   - `hooks/useTasks.ts` uses repository functions and `queryKeys`.
   - `hooks/useTaskSessions.ts` uses session repository and `queryKeys`.
   - `app/(dashboard)/dashboard/page.tsx` uses a repository function to fetch tasks and mapper conversions removed.
   - `app/(dashboard)/tasks/[taskId]/page.tsx` uses the session repository for active session lookup and uses query keys when invalidating.
   - `app/(dashboard)/contact/page.tsx` uses contact repository and removes duplicated conversions.

5. Add `lib/http/fetchJson.ts` and update `hooks/useIntegrations.ts` to use it.

6. Run `npm run lint` (or `npm run format:check` if lint is unavailable), and manually verify the UI continues to function.

## Validation and Acceptance

Start the app with `npm run dev` and verify these behaviors:

- The dashboard shows tasks assigned to the current user and sorting works as before.
- The task detail page loads sessions, and starting/stopping timers still works.
- The contact page shows pending and resolved contacts, and status updates still work.
- No console errors appear related to Firestore timestamp conversion.

If tests are available in the environment, run them with `npm run lint` and ensure there are no new errors.

## Idempotence and Recovery

All changes are additive or refactors and can be applied multiple times safely. If a repository function returns unexpected data, revert the affected file back to inline Firestore access and re-run the app to confirm recovery. Each step can be executed independently without data migration.

## Artifacts and Notes

Expected file additions are under `lib/firestore/`, `lib/queryKeys.ts`, and `lib/http/fetchJson.ts`. Inline conversions like `doc.data().createdAt?.toDate()` should be removed from pages and replaced by mapper usage.

## Interfaces and Dependencies

Define the following functions:

In `lib/queryKeys.ts`:

    export const queryKeys = {
      tasks: (projectType: string | 'all') => ['tasks', projectType],
      task: (taskId: string) => ['task', taskId],
      taskSessions: (taskId: string) => ['taskSessions', taskId],
      activeSession: (userId?: string | null, taskId?: string | null) =>
        ['activeSession', userId ?? null, taskId ?? null],
      contacts: (status: 'pending' | 'resolved') => ['contacts', status],
      sessionHistory: (taskId: string) => ['sessionHistory', taskId],
    };

In `lib/firestore/mappers/taskMapper.ts`:

    export function mapTaskDoc(
      docId: string,
      data: Record<string, any>,
      projectType: ProjectType
    ): Task & { projectType: ProjectType } { ... }

In `lib/firestore/mappers/sessionMapper.ts`:

    export function mapSessionDoc(
      docId: string,
      data: Record<string, any>
    ): TaskSession { ... }

In `lib/firestore/mappers/contactMapper.ts`:

    export function mapContactDoc(
      docId: string,
      data: Record<string, any>
    ): Contact { ... }

In `lib/http/fetchJson.ts`:

    export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> { ... }

Plan updates must be recorded in `Progress` and `Decision Log` if changes occur.

Plan updated on 2025-10-01 by Codex: completed refactor steps and recorded lint failure.
