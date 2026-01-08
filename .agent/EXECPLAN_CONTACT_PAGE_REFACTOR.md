# Refactor contact page by extracting contact list rendering and form state management

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `.agent/PLANS.md` and must be maintained accordingly.

## Purpose / Big Picture

The Contact page is difficult to maintain because it mixes form state, query logic, and UI rendering in a single file. After this refactor, the page will be shorter and easier to reason about: list rendering will move into reusable components, and form state/handlers will move into a hook. The UI and behavior must remain the same for both pending and resolved contact lists, including the error report details and image preview behavior. This is verified by running the dev server, opening `/contact`, and confirming list display, status toggles, and form submission still work as before.

## Progress

- [x] (2025-09-04 15:35Z) Draft extraction strategy for contact list rendering and form state.
- [ ] Extract contact type label/color helpers into a shared module.
- [x] (2025-09-04 15:55Z) Implement `hooks/useContactFormState.ts` to manage drawer form state, image handling, and submission.
- [x] (2025-09-04 16:05Z) Implement `components/contact/ContactListSection.tsx` to render pending/resolved lists and contact cards.
- [x] (2025-09-04 16:15Z) Update `app/(dashboard)/contact/page.tsx` to use the new hook/component and reduce inline JSX.
- [x] (2025-09-04 16:25Z) Validate lint/build expectations and re-check the UI behavior with a local dev server.

## Surprises & Discoveries

- Observation: Serena MCP symbol overview returned limited detail for `ContactPage`; full render section required manual viewing.
  Evidence: `get_symbols_overview` only listed symbols; full JSX required additional inspection.

## Decision Log

- Decision: Split Contact page into a form-state hook and a list-render component, leaving data-fetching in the page.
  Rationale: This reduces page size quickly while keeping query control near the route and minimizing prop churn.
  Date/Author: 2025-09-04 / Codex

- Decision: Keep contact type helper functions in the page and pass them into `ContactListSection` as props.
  Rationale: Avoids adding a new shared module while the page still needs the helpers and keeps the change smaller.
  Date/Author: 2025-09-04 / Codex

## Outcomes & Retrospective

- Pending.

## Context and Orientation

The Contact page lives at `app/(dashboard)/contact/page.tsx`. It contains helper functions for contact type labels/colors, React Query calls for pending and resolved contacts, and large JSX blocks for both list sections. It also owns all form state used by `components/Drawer/ContactFormDrawer`. The goal is to keep query behavior and UI intact while extracting state and rendering to make the page shorter.

## Plan of Work

1) Create a helper module `lib/contact/contactType.ts` that exports `getContactTypeLabel` and `getContactTypeColor` (used by both pending and resolved lists).

2) Create a hook `hooks/useContactFormState.ts` that encapsulates:

   - Base form state (`type`, `title`, `content`, `message`) and error report state fields.
   - The image select/upload handlers (including preview and size/type validation).
   - Submit handler logic, including error details serialization and mutation submission.
   - Expose `isSubmitting`, `imageUploading`, and `progress` for UI feedback.

3) Create `components/contact/ContactListSection.tsx` to render either pending or resolved lists:

   - Props: `title`, `contacts`, `isLoading`, `emptyMessage`, `statusLabel`, `statusChipProps`, `onToggleStatus`, `isMutating`.
   - Use `getContactTypeLabel`/`getContactTypeColor` for chips.
   - Extract repeated card layout into a `ContactCard` subcomponent inside the file.

4) Update `app/(dashboard)/contact/page.tsx`:

   - Replace inline helper functions with imports from `lib/contact/contactType.ts`.
   - Use `useContactFormState` for form and error report state.
   - Replace pending/resolved list JSX with `ContactListSection` usage.
   - Keep `useQuery` for pending/resolved contacts and `useMutation` for status updates in the page to avoid behavioral changes.

## Concrete Steps

- Create `lib/contact/contactType.ts` with exported helper functions.
- Create `hooks/useContactFormState.ts` and move form logic out of the page.
- Create `components/contact/ContactListSection.tsx` with pending/resolved variants.
- Update `app/(dashboard)/contact/page.tsx` to use the new hook/component and remove duplicated JSX.

## Validation and Acceptance

- Run `npm run lint` and resolve any errors.
- If a dev server is running, open `http://localhost:3000/contact` and verify:
  - Pending and resolved lists render correctly and toggle status updates.
  - Error report details are shown consistently for both list sections.
  - Contact form still submits and validates required fields; image upload works and preview shows.

## Idempotence and Recovery

Changes are additive and can be applied incrementally. If the new components cause UI regressions, revert the page to its prior inline JSX while keeping new helpers for later reuse.

## Artifacts and Notes

- No external artifacts yet.

## Interfaces and Dependencies

- In `lib/contact/contactType.ts`, define:

  export function getContactTypeLabel(type: ContactType): string;
  export function getContactTypeColor(type: ContactType): 'error' | 'info' | 'warning';

- In `hooks/useContactFormState.ts`, define:

  export function useContactFormState(options: { firebaseUser: User | null; uploadImage: (...); imageUploadError?: string | null; queryClient: QueryClient; }): { ... };

- In `components/contact/ContactListSection.tsx`, define:

  export function ContactListSection(props: { ... }): JSX.Element;
