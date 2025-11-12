import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { Octokit } from "@octokit/rest";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const db = getFirestore();
const secretClient = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GCLOUD_PROJECT || "";
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload?.data?.toString() || "";
}

export const createFireIssue = onRequest(
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

      if (!projectId || !taskId) {
        res.status(400).json({ error: "Missing projectId or taskId" });
        return;
      }

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
      if (!task) {
        res.status(404).json({ error: "Task data not found" });
        return;
      }

      // 既にIssueが作成されている場合はスキップ
      if (task.fireIssueUrl) {
        res.status(200).json({
          success: true,
          url: task.fireIssueUrl,
          alreadyExists: true,
        });
        return;
      }

      // GitHubトークン取得
      const githubToken = await getSecret("GITHUB_TOKEN");
      if (!githubToken) {
        res.status(500).json({ error: "Failed to retrieve GitHub token" });
        return;
      }
      const octokit = new Octokit({ auth: githubToken });

      // ユーザー情報取得（assignees用）
      const assigneeIds = task.assigneeIds || [];
      const assignees: string[] = [];

      for (const userId of assigneeIds) {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const user = userDoc.data();
          if (user?.githubUsername) {
            assignees.push(user.githubUsername);
          }
        }
      }

      // Issue作成
      const issueTitle = `${task.external?.issueKey || ""} ${task.title}`;
      const issueBody = [
        task.external?.url ? `Backlog: ${task.external.url}` : "",
        task.description || "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const issueResponse = await octokit.rest.issues.create({
        owner: "monosus",
        repo: "ss-fire-design-system",
        title: issueTitle,
        body: issueBody,
        assignees: assignees.length > 0 ? assignees : undefined,
      });

      const issueUrl = issueResponse.data.html_url;

      // タスクにURLを保存
      await db
        .collection("projects")
        .doc(projectId)
        .collection("tasks")
        .doc(taskId)
        .update({
          fireIssueUrl: issueUrl,
          updatedAt: new Date(),
        });

      res.status(200).json({
        success: true,
        url: issueUrl,
      });
    } catch (error) {
      console.error("Create Fire issue error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

