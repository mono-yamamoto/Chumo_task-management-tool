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
