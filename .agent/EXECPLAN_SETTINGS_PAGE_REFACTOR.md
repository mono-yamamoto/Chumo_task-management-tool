# Refactor settings page by extracting auth status logic and admin user management UI

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `.agent/PLANS.md` and must be maintained accordingly.

## Purpose / Big Picture

The Settings page is currently hard to maintain because it mixes OAuth status handling, URL parameter messaging, user profile updates, and admin user management in one file. After this refactor, the page should be shorter and clearer: OAuth status logic will be encapsulated in a hook and the admin user list will be rendered by a dedicated component. The behavior must remain unchanged: current user info loads, OAuth status updates from URL parameters, and admin user management continues to work. This can be verified by visiting `/settings` before and after and confirming the same UI and interactions.

## Progress

- [x] (2025-09-04 16:40Z) Capture baseline Settings page behavior using browser automation.
- [x] (2025-09-04 17:00Z) Extract OAuth status and message handling into `hooks/useSettingsOauthStatus.ts`.
- [x] (2025-09-04 17:05Z) Extract admin user management list into `components/settings/AdminUserList.tsx`.
- [x] (2025-09-04 17:15Z) Update `app/(dashboard)/settings/page.tsx` to use the new hook/component and remove duplicated logic.
- [x] (2025-09-04 17:25Z) Validate lint/build expectations and re-check Settings UI behavior with browser automation.

## Surprises & Discoveries

- Observation: ESLint parsing errors appeared due to duplicate JSX blocks left after partial replacements; fixed by removing the duplicate blocks.
  Evidence: `npm run lint` reported “Parsing error: Declaration or statement expected” until duplicate blocks were removed.

## Decision Log

- Decision: Keep data fetching and mutations in the page, and extract only OAuth status effects and admin list rendering.
  Rationale: This reduces file size while keeping data flow clear and limiting behavioral changes.
  Date/Author: 2025-09-04 / Codex

## Outcomes & Retrospective

- Pending.

## Context and Orientation

The Settings page lives at `app/(dashboard)/settings/page.tsx` and includes: OAuth state derived from `currentUser`, URL parameter message handling, user profile update mutations, and admin user management UI. The OAuth status is maintained with `setTimeout` calls; admin list UI is a large JSX block. We will extract those to reduce page length while preserving behavior.

## Plan of Work

1) Create `hooks/useSettingsOauthStatus.ts` that encapsulates:
   - Deriving `oauthStatus`, `githubUsername`, and `chatId` from `currentUser`.
   - Handling URL query params `success` / `error` with `router.replace('/settings')`.
   - Expose state setters for `githubUsername`, `chatId`, and `message`.

2) Create `components/settings/AdminUserList.tsx`:
   - Accept users list, editing state maps, and callbacks for edit/save/toggle.
   - Render the same list layout and buttons as current `SettingsPage`.

3) Update `app/(dashboard)/settings/page.tsx`:
   - Use `useSettingsOauthStatus` instead of inline `useEffect` blocks.
   - Replace admin list JSX with `AdminUserList` component.
   - Keep mutations and query invalidation in the page.

## Concrete Steps

- Create `hooks/useSettingsOauthStatus.ts` with the extracted logic from the two `useEffect` blocks and initial state wiring.
- Create `components/settings/AdminUserList.tsx` with props matching current admin UI needs.
- Replace the relevant sections in `app/(dashboard)/settings/page.tsx` with the new hook/component.

## Validation and Acceptance

- Run `npm run lint` and ensure no errors.
- Using browser automation, navigate to `/settings` and verify:
  - OAuth status reflects token presence and URL messages show once, then clear.
  - GitHub username and Chat ID fields load and save as before.
  - Admin list renders and actions (toggle allowed, edit chat ID) are unchanged.

## Idempotence and Recovery

These changes are additive and can be applied incrementally. If the component extraction introduces regressions, revert the page to inline rendering while keeping the hook for later reuse.

## Artifacts and Notes

- No external artifacts yet.

## Interfaces and Dependencies

- In `hooks/useSettingsOauthStatus.ts`, define:

  export function useSettingsOauthStatus(options: {
    currentUser: User | null;
    router: AppRouterInstance;
    searchParams: URLSearchParams;
  }): {
    oauthStatus: 'connected' | 'disconnected' | 'loading';
    setOauthStatus: (status: 'connected' | 'disconnected' | 'loading') => void;
    githubUsername: string;
    setGithubUsername: (value: string) => void;
    chatId: string;
    setChatId: (value: string) => void;
    message: string | null;
    setMessage: (value: string | null) => void;
  };

- In `components/settings/AdminUserList.tsx`, define:

  export function AdminUserList(props: { ... }): JSX.Element;
