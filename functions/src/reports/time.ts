import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

export const getTimeReport = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { from, to, type = "normal" } = req.query;

      if (!from || !to) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }

      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      // 日付の検証
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        res.status(400).json({ error: "Invalid date format" });
        return;
      }

      // toDateをその日の終了時刻（23:59:59.999）まで含める
      toDate.setHours(23, 59, 59, 999);

      // 全プロジェクトからタスクとセッションを取得
      const projectsSnapshot = await db.collection("projects").get();
      const items: Array<{
        title: string;
        durationMin: number;
        over3hours?: string;
      }> = [];
      let totalDurationMin = 0;

      for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;
        const tasksSnapshot = await db
          .collection("projects")
          .doc(projectId)
          .collection("tasks")
          .get();

        for (const taskDoc of tasksSnapshot.docs) {
          const task = taskDoc.data();

          // BRGフィルタ
          if (type === "brg" && !task.external?.issueKey?.includes("BRGREG")) {
            continue;
          }
          if (type === "normal" && task.external?.issueKey?.includes("BRGREG")) {
            continue;
          }

          // セッション取得
          const sessionsSnapshot = await db
            .collection("projects")
            .doc(projectId)
            .collection("taskSessions")
            .where("taskId", "==", taskDoc.id)
            .where("startedAt", ">=", fromDate)
            .where("startedAt", "<=", toDate)
            .get();

          let taskDurationMin = 0;
          for (const sessionDoc of sessionsSnapshot.docs) {
            const session = sessionDoc.data();
            if (session.endedAt) {
              taskDurationMin += Math.floor(session.durationSec / 60);
            }
          }

          if (taskDurationMin > 0) {
            items.push({
              title: task.title,
              durationMin: taskDurationMin,
              over3hours: taskDurationMin > 180 ? task.over3Reason : undefined,
            });
            totalDurationMin += taskDurationMin;
          }
        }
      }

      res.status(200).json({
        items,
        totalDurationMin,
      });
    } catch (error) {
      console.error("Get time report error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: "Internal server error",
        details: errorMessage 
      });
    }
  }
);

export const exportTimeReportCSV = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { from, to, type = "normal" } = req.query;

      if (!from || !to) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }

      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      // 日付の検証
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        res.status(400).json({ error: "Invalid date format" });
        return;
      }

      // toDateをその日の終了時刻（23:59:59.999）まで含める
      toDate.setHours(23, 59, 59, 999);

      // データ取得（getTimeReportと同じロジック）
      const projectsSnapshot = await db.collection("projects").get();
      const items: Array<{
        title: string;
        durationMin: number;
        over3hours?: string;
      }> = [];

      for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;
        const tasksSnapshot = await db
          .collection("projects")
          .doc(projectId)
          .collection("tasks")
          .get();

        for (const taskDoc of tasksSnapshot.docs) {
          const task = taskDoc.data();

          if (type === "brg" && !task.external?.issueKey?.includes("BRGREG")) {
            continue;
          }
          if (type === "normal" && task.external?.issueKey?.includes("BRGREG")) {
            continue;
          }

          const sessionsSnapshot = await db
            .collection("projects")
            .doc(projectId)
            .collection("taskSessions")
            .where("taskId", "==", taskDoc.id)
            .where("startedAt", ">=", fromDate)
            .where("startedAt", "<=", toDate)
            .get();

          let taskDurationMin = 0;
          for (const sessionDoc of sessionsSnapshot.docs) {
            const session = sessionDoc.data();
            if (session.endedAt) {
              taskDurationMin += Math.floor(session.durationSec / 60);
            }
          }

          if (taskDurationMin > 0) {
            items.push({
              title: task.title,
              durationMin: taskDurationMin,
              over3hours: taskDurationMin > 180 ? task.over3Reason : undefined,
            });
          }
        }
      }

      // CSV生成（UTF-8+BOM/CRLF）
      const BOM = "\uFEFF";
      const csvRows = [
        ["title", "durationMin", "over3hours"],
        ...items.map((item) => [
          `"${item.title.replace(/"/g, '""')}"`,
          item.durationMin.toString(),
          item.over3hours ? `"${item.over3hours.replace(/"/g, '""')}"` : "",
        ]),
      ];

      const csv = BOM + csvRows.map((row) => row.join(",")).join("\r\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="report_${type}_${fromDate.toISOString().split("T")[0]}_${toDate.toISOString().split("T")[0]}.csv"`
      );
      res.status(200).send(csv);
    } catch (error) {
      console.error("Export CSV error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: "Internal server error",
        details: errorMessage 
      });
    }
  }
);

