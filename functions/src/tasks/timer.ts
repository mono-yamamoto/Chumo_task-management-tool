import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

export const startTimer = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const projectId = req.path.split("/")[3];
      const taskId = req.path.split("/")[6];
      const { userId } = req.body;

      if (!userId || !projectId || !taskId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // 排他制御: 未終了セッションをチェック
      const activeSessionsSnapshot = await db
        .collection("projects")
        .doc(projectId)
        .collection("taskSessions")
        .where("userId", "==", userId)
        .where("endedAt", "==", null)
        .limit(1)
        .get();

      if (!activeSessionsSnapshot.empty) {
        res.status(400).json({
          error: "他のタイマーが稼働中。停止してから開始してね",
          code: "TIMER_ALREADY_RUNNING",
        });
        return;
      }

      // セッション作成
      const sessionData = {
        taskId,
        userId,
        startedAt: new Date(),
        endedAt: null,
        durationSec: 0,
      };

      const sessionRef = await db
        .collection("projects")
        .doc(projectId)
        .collection("taskSessions")
        .add(sessionData);

      res.status(200).json({
        success: true,
        sessionId: sessionRef.id,
      });
    } catch (error) {
      console.error("Start timer error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export const stopTimer = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const projectId = req.path.split("/")[3];
      const { sessionId } = req.body;

      if (!sessionId || !projectId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const sessionRef = db
        .collection("projects")
        .doc(projectId)
        .collection("taskSessions")
        .doc(sessionId);

      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      const sessionData = sessionDoc.data();
      if (sessionData?.endedAt) {
        res.status(400).json({ error: "Session already ended" });
        return;
      }

      const startedAt = sessionData?.startedAt?.toDate();
      const endedAt = new Date();
      const durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

      // 1分単位に丸める
      const durationMin = Math.floor(durationSec / 60);

      await sessionRef.update({
        endedAt,
        durationSec: durationMin * 60,
      });

      res.status(200).json({
        success: true,
        durationMin,
      });
    } catch (error) {
      console.error("Stop timer error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

