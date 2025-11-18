# Google Chat thread creation buttons in task UI

This ExecPlan is a living document. Maintain it according to `.agent/PLANS.md` while implementing this feature.

## Purpose / Big Picture

Users need a one-click way to spin up a Google Chat thread for a task from the drawer or the dedicated detail page so that discussions begin with the correct context. After completing this work, clicking the new button will call a Cloud Function that posts `{[title](task_link)}\n{assignee}` into the designated space and stores the resulting thread URL back on the task so that subsequent clicks open the existing conversation instead of recreating it.

## Progress

- [x] (2025-02-14 10:20Z) Captured requirements and decided to back the feature with a new HTTPS Cloud Function plus React UI updates.
- [x] (2025-02-14 11:05Z) Implemented Cloud Function `createGoogleChatThread`, including webhook call, Firestore updates, and idempotent handling.
- [x] (2025-02-14 11:15Z) Updated shared types, Zod schemas, helper utilities, and integration hooks to surface `googleChatThreadUrl` and the new endpoint URL.
- [x] (2025-02-14 11:35Z) Extended the dashboard, tasks list, task drawer, and standalone task page UI with the new mutation, handlers, and Chat buttons.
- [x] (2025-02-14 11:40Z) Documented the webhook/secret prerequisites in `docs/CLOUD_FUNCTIONS_EXPLAINED.md`.
- [ ] (2025-02-14 11:50Z) Run linters/builds — blocked because `npm run lint` fails with missing `@eslint/js` dependency (see Surprises).

## Surprises & Discoveries

- Observation: `npm run lint` currently errors with `ERR_MODULE_NOT_FOUND: Cannot find package '@eslint/js'` when resolving `eslint.config.mjs`.
  Evidence: `npm run lint` output on 2025-02-14 11:50Z shows the missing dependency stack trace.

## Decision Log

- Decision: Use a Google Chat incoming webhook plus two new Secret Manager keys (`GOOGLE_CHAT_WEBHOOK_URL`, `GOOGLE_CHAT_SPACE_URL`) to avoid handling OAuth scopes in code while still letting us build the final thread URL users expect to open.
  Rationale: Incoming webhooks only need a secret URL and return the created message name, which we can convert into a Gmail Chat thread link; this keeps implementation small and secrets manageable.
  Date/Author: 2025-02-14 / assistant

## Outcomes & Retrospective

_Pending completion._

## Context and Orientation

Task data lives in Firestore at `projects/{projectType}/tasks/{taskId}` and is surfaced through `hooks/useTasks.ts` into multiple client components: `components/Drawer/TaskDetailDrawer.tsx` (drawer on dashboard/tasks list), `app/(dashboard)/tasks/page.tsx` (tasks view), `app/(dashboard)/dashboard/page.tsx` (my tasks dashboard), and `app/(dashboard)/tasks/[taskId]/page.tsx` (full page view). Integrations such as Google Drive and GitHub Issue creation use Cloud Functions defined under `functions/src/` and helper URLs from `utils/functions.ts`, with React Query mutations in `hooks/useIntegrations.ts`. Firestore task types are defined in `types/index.ts` and validated through `utils/schemas.ts`.

## Plan of Work

1. **Cloud Function** (`functions/src/chat/create.ts` + `functions/src/index.ts`): Create a new HTTPS function `createGoogleChatThread` mirroring the structure of `createFireIssue`. It must accept `POST /projects/{projectId}/tasks/{taskId}` with body `{ taskUrl: string }`, fetch the task document, short-circuit if `googleChatThreadUrl` already exists, load the webhook and space base URL secrets, format the message text using the task title and assignee display names, invoke the webhook via `fetch`, parse the returned `name` field to produce a Gmail URL (fallback to the base space URL when parsing fails), persist `googleChatThreadUrl` and `updatedAt`, and respond with `{ success: true, url }`. Include CORS support, helpful error responses, and logging like other functions.
2. **Types and Schemas** (`types/index.ts`, `utils/schemas.ts`): Add an optional nullable `googleChatThreadUrl` field to the `Task` interface and `taskSchema`/`taskUpdateSchema` so TypeScript consumers and validation know about the new attribute.
3. **Function URL helper** (`utils/functions.ts`): Add `getCreateGoogleChatThreadUrl` returning either `NEXT_PUBLIC_FUNCTION_CREATEGOOGLECHATTHREAD_URL` or a documented fallback URL, matching the naming convention used for other endpoints.
4. **Integrations Hook** (`hooks/useIntegrations.ts`): Create `useGoogleChatIntegration` exposing a `createGoogleChatThread` mutation that accepts `{ projectType, taskId, taskUrl }`, calls the new Cloud Function URL with JSON, throws user-friendly errors, and invalidates relevant task queries on success.
5. **UI Components**:
   - `components/Drawer/TaskDetailDrawer.tsx`: Extend props to include `selectedTask.googleChatThreadUrl`, a new click handler, and a pending flag. Add the button next to the Drive/Issue buttons (matching the outline/filled style and `CustomButton` usage). Use `ChatBubbleOutline` or similar icon and disable while pending. When a thread exists, open the URL in a new tab.
   - `app/(dashboard)/tasks/[taskId]/page.tsx`: Import the new hook, wire a local `handleGoogleChatThreadCreate` that builds the `taskUrl` (falling back to `process.env.NEXT_PUBLIC_APP_ORIGIN` when `window` is unavailable), call the mutation, and refresh task queries. Render the third button inside the integration section.
   - `app/(dashboard)/tasks/page.tsx` and `app/(dashboard)/dashboard/page.tsx`: Import the hook, create `handleGoogleChatThreadCreate`, invalidate queries after creation, and pass the handler plus loading state into `TaskDetailDrawer`.
   - `components/tasks/TaskIntegrationButtons.tsx`: Update props and rendering to support the new Google Chat button for consistency (even if not currently mounted elsewhere) so future reuse inherits the same UI.
6. **Documentation** (`docs/CLOUD_FUNCTIONS_EXPLAINED.md` or a new short doc): Note the new `createGoogleChatThread` function, the two secrets it requires, and instructions for generating the incoming webhook tied to the supplied Chat space URL so ops can set up Secret Manager correctly.
7. **Testing/Validation**: After coding, run `npm run lint` and, if possible, describe how to manually verify the button by running `npm run dev`, opening the tasks UI, and triggering the new button (with the reminder that the webhook secrets must be set beforehand).

## Concrete Steps

1. From the repo root, create `docs/plans/google-chat-thread.md` (this file) and keep it updated each time progress is made.
2. Add `functions/src/chat/create.ts` implementing the new function, update `functions/src/index.ts`, and, if needed, extend scripts for deployment commands.
3. Update `types/index.ts`, `utils/schemas.ts`, and `utils/functions.ts` with the new field and helper.
4. Modify `hooks/useIntegrations.ts` to add the mutation and export it.
5. Update `components/Drawer/TaskDetailDrawer.tsx`, `components/tasks/TaskIntegrationButtons.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/tasks/page.tsx`, and `app/(dashboard)/tasks/[taskId]/page.tsx` with the new props, handlers, and button markup.
6. Revise documentation (e.g., `docs/CLOUD_FUNCTIONS_EXPLAINED.md`) to cover the Chat integration and required secrets so operators know to create the webhook at https://mail.google.com/mail/u/1/#chat/space/AAQApGRYb9c.
7. Run `npm run lint` at the project root to ensure formatting/linting stays clean. If Cloud Function code changed, note that `npm run functions:build` should succeed (optional to run locally if feasible).

## Validation and Acceptance

After implementation:

1. Run `npm run lint` from the repo root; expect it to finish without errors. This confirms TypeScript + ESLint agree with the new code paths.
2. (Optional) Run `npm run functions:build` to ensure the Cloud Functions TypeScript compiles.
3. Start the dev server with `npm run dev`, open `/tasks`, and use the new "Chatスレッド作成" button on a task. The first click should trigger the webhook and, once the Firestore task reloads, the button should change to "Chatを開く". Subsequent clicks open the stored link in a new tab without creating duplicates.

## Idempotence and Recovery

The Cloud Function should check for an existing `googleChatThreadUrl` to stay idempotent. Frontend buttons must disable during mutation to prevent duplicates. If webhook posting fails, surface the message via `alert` so the user knows to retry. Because Firestore writes only occur after a successful webhook response, rerunning the button is safe.

## Artifacts and Notes

_Populate with lint output snippets and screenshots once available._

## Interfaces and Dependencies

- Cloud Function signature: `POST https://<region>.cloudfunctions.net/createGoogleChatThread/projects/{projectType}/tasks/{taskId}` with body `{ taskUrl: string }`, returns `{ success: boolean; url: string; alreadyExists?: boolean }`.
- React Query mutation `createGoogleChatThread.mutateAsync({ projectType, taskId, taskUrl })` exposed by `useGoogleChatIntegration()`.
- UI button labels: "Chatスレッド作成" when no URL; "Chatを開く" when `googleChatThreadUrl` exists.
- Secrets to configure in Secret Manager: `GOOGLE_CHAT_WEBHOOK_URL` (incoming webhook for https://mail.google.com/mail/u/1/#chat/space/AAQApGRYb9c) and `GOOGLE_CHAT_SPACE_URL` (set to that same base URL so the function can build clickable links).
