import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const db = getFirestore();
const secretClient = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GCLOUD_PROJECT || "";
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload?.data?.toString() || "";
}

export const createDriveFolder = onRequest(
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
      const projectId = req.path.match(/\/projects\/([^\/]+)/)?.[1];
      const taskId = req.path.match(/\/tasks\/([^\/]+)/)?.[1];

      // タスク情報取得
      const taskDoc = await db
        .collection("projects")
        .doc(projectId)
        .collection("tasks")
        .doc(taskId)
        .get();

      if (!taskDoc.exists) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      const task = taskDoc.data();
      const projectDoc = await db.collection("projects").doc(projectId).get();
      const project = projectDoc.data();

      if (!project?.driveParentId) {
        res.status(400).json({ error: "Drive parent ID not configured" });
        return;
      }

      // 既存フォルダを検索
      const folderName = `[${project.backlogProjectKey || ""}] ${task.external?.issueKey || ""} ${task.title}`;
      
      // Secrets取得
      const serviceAccountKey = await getSecret("DRIVE_SERVICE_ACCOUNT_KEY");
      const driveParentId = await getSecret("DRIVE_PARENT_ID");
      const checksheetTemplateId = await getSecret("CHECKSHEET_TEMPLATE_ID");

      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(serviceAccountKey),
        scopes: [
          "https://www.googleapis.com/auth/drive",
          "https://www.googleapis.com/auth/spreadsheets",
        ],
      });

      const drive = google.drive({ version: "v3", auth });

      // 同名フォルダ検索
      const searchResponse = await drive.files.list({
        q: `name='${folderName.replace(/'/g, "\\'")}' and parents in '${driveParentId}' and trashed=false`,
        fields: "files(id, name)",
      });

      let folderId: string;
      let folderUrl: string;

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        // 既存フォルダを使用
        folderId = searchResponse.data.files[0].id!;
        folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
      } else {
        // 新規フォルダ作成
        const folderResponse = await drive.files.create({
          requestBody: {
            name: folderName,
            parents: [driveParentId],
            mimeType: "application/vnd.google-apps.folder",
          },
          fields: "id",
        });

        folderId = folderResponse.data.id!;
        folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

        // チェックシートテンプレートを複製
        const copyResponse = await drive.files.copy({
          fileId: checksheetTemplateId,
          requestBody: {
            name: "チェックリスト",
            parents: [folderId],
          },
        });

        const sheetId = copyResponse.data.id!;
        const sheets = google.sheets({ version: "v4", auth });

        // セル書き込み
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: "シート1!C4",
          valueInputOption: "RAW",
          requestBody: {
            values: [[task.title]],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: "シート1!C5",
          valueInputOption: "RAW",
          requestBody: {
            values: [[task.external?.url || ""]],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: "シート1!C7",
          valueInputOption: "RAW",
          requestBody: {
            values: [[folderUrl]],
          },
        });
      }

      // タスクにURLを保存
      await db
        .collection("projects")
        .doc(projectId)
        .collection("tasks")
        .doc(taskId)
        .update({
          googleDriveUrl: folderUrl,
          updatedAt: new Date(),
        });

      res.status(200).json({
        success: true,
        url: folderUrl,
      });
    } catch (error) {
      console.error("Create Drive folder error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

