# Refactor reports page into hook and table component

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows `.agent/PLANS.md` and must be maintained in accordance with it.

## Purpose / Big Picture

The reports page is currently a long, single file that mixes data fetching, CSV export logic, and table rendering. After this change, the reports page will be easier to read and maintain because data access and table rendering are separated into a hook and a dedicated component. Users should be able to load the reports page, change the date range, switch tabs, and export CSV exactly as before.

## Progress

- [x] (2025-12-28 01:32Z) Recorded current reports page structure and identified the data fetch + CSV export logic to extract.
- [x] (2025-12-28 01:32Z) Added `hooks/useReportData.ts` to encapsulate report fetching and CSV export.
- [x] (2025-12-28 01:32Z) Added `types/report.ts` and `components/reports/ReportTable.tsx` to type and render the report table.
- [x] (2025-12-28 01:32Z) Replaced `app/(dashboard)/reports/page.tsx` with hook + table component composition.
- [x] (2025-12-28 01:32Z) Ran lint and verified the reports page behavior in the browser.
- [ ] Commit the refactor with the agreed message format.

## Surprises & Discoveries

- None so far.

## Decision Log

- Decision: Extract report fetching and CSV export into `hooks/useReportData.ts` with a shared date validation helper.
  Rationale: The original page duplicated date validation for both data fetching and CSV export, so a single helper reduces duplication and keeps error handling consistent.
  Date/Author: 2025-12-28 / Codex
- Decision: Centralize report response types in `types/report.ts`.
  Rationale: Both the hook and the table component need the same shape, and a shared type avoids drift or duplicated definitions.
  Date/Author: 2025-12-28 / Codex

## Outcomes & Retrospective

- Pending. This will be updated after the refactor is fully implemented and validated.

## Context and Orientation

The reports page lives at `app/(dashboard)/reports/page.tsx` and currently renders the entire UI, runs `useQuery` to fetch report data from `getTimeReportUrl`, and handles CSV export via `getExportTimeReportCsvUrl`. The report data includes `items` to render a table and `totalDurationSec` for a summary. This refactor introduces `components/reports/ReportTable.tsx` for table rendering, `hooks/useReportData.ts` for report data access and export logic, and `types/report.ts` to share the report data shape.

## Plan of Work

Update `app/(dashboard)/reports/page.tsx` to rely on `useReportData` for fetch/export and to render the table via the `ReportTable` component. Keep the page layout and UI elements exactly the same, including the conditional error and loading states, the `Tabs` behavior, and the CSV export button. Use `types/report.ts` to define the report response shape so the hook and component stay aligned.

## Concrete Steps

From the repository root, update the reports page and add the new component. Then run lint.

  npm run lint

If lint passes, open the dev server at `http://localhost:3000/reports` and confirm that the page renders, the loading and error states behave as before, and CSV export still triggers a download.

## Validation and Acceptance

Start the dev server with `npm run dev` if it is not already running. Navigate to `http://localhost:3000/reports`. Confirm that:

- The page renders the title, date inputs, and tabs.
- Switching between `通常` and `BRG` triggers a re-fetch without errors.
- The table shows data or the empty state message exactly as before.
- The total duration value matches the report data.
- Clicking `CSVエクスポート` downloads a CSV file (or shows the same alert on failure as before).

Run `npm run lint` and expect no lint errors.

## Idempotence and Recovery

These changes are additive and can be re-run safely. If the new component is incorrect, revert the page to use its prior inline table and re-run lint. If lint fails due to unused imports, remove the unused imports and retry.

## Artifacts and Notes

Lint completed with no errors. Browser verification was performed via the Browser Eval MCP because Chrome DevTools MCP could not attach to an existing browser profile.

## Interfaces and Dependencies

In `types/report.ts`, provide:

  export type ReportItem = {
    taskId?: string | null;
    title?: string;
    durationSec?: number;
    over3hours?: string;
  };

  export type ReportResponse = {
    items?: ReportItem[];
    totalDurationSec?: number;
  };

In `hooks/useReportData.ts`, provide:

  export function useReportData({ activeTab, fromDate, toDate }: UseReportDataOptions): {
    reportData: ReportResponse | undefined;
    isLoading: boolean;
    error: unknown;
    handleExportCSV: () => Promise<void>;
  }

In `components/reports/ReportTable.tsx`, provide:

  type ReportTableProps = {
    reportData: ReportResponse | undefined;
    totalDurationSec: number;
  };

  export function ReportTable(props: ReportTableProps): JSX.Element

In `app/(dashboard)/reports/page.tsx`, use `useReportData` and `ReportTable` to keep the same visible behavior.

Note: This plan was created after `hooks/useReportData.ts` was added. If the hook already exists, keep its behavior aligned with the interfaces above.

Update record: Updated progress to reflect page wiring and validation completion, and recorded lint/browser verification notes.
