"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Contact, ContactType, DeviceType, PCOSType, SPOSType, BrowserType, SmartphoneType, ErrorReportDetails } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import { Button } from "@/components/ui/button";
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
  List,
  Chip,
  Link as MUILink,
  Drawer,
  IconButton,
  LinearProgress,
} from "@mui/material";
import { Close, CloudUpload, Image as ImageIcon, CheckCircle } from "@mui/icons-material";

function getContactTypeLabel(type: ContactType): string {
  switch (type) {
    case "error":
      return "エラー報告";
    case "feature":
      return "要望";
    case "other":
      return "そのほか";
    default:
      return "そのほか";
  }
}

function getContactTypeColor(type: ContactType): "error" | "info" | "warning" {
  switch (type) {
    case "error":
      return "error";
    case "feature":
      return "info";
    case "other":
      return "warning";
    default:
      return "warning";
  }
}

export default function ContactPage() {
  const { user, firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { uploadImage, uploading: imageUploading, error: imageUploadError, progress } = useImageUpload();
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<"pending" | "resolved">("pending");
  const [type, setType] = useState<ContactType>("error");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // エラー報告用の詳細情報
  const [errorIssue, setErrorIssue] = useState("");
  const [errorReproductionSteps, setErrorReproductionSteps] = useState("");
  const [errorDevice, setErrorDevice] = useState<DeviceType | "">("");
  const [errorOS, setErrorOS] = useState<PCOSType | SPOSType | SmartphoneType | "">("");
  const [errorBrowser, setErrorBrowser] = useState<BrowserType | "">("");
  const [errorOSVersion, setErrorOSVersion] = useState("");
  const [errorBrowserVersion, setErrorBrowserVersion] = useState("");
  const [errorScreenshotUrl, setErrorScreenshotUrl] = useState("");
  const [errorScreenshotFile, setErrorScreenshotFile] = useState<File | null>(null);
  const [errorScreenshotPreview, setErrorScreenshotPreview] = useState<string | null>(null);

  // 未解決のお問い合わせを取得
  const { data: pendingContacts, isLoading: isLoadingPending } = useQuery({
    queryKey: ["contacts", "pending"],
    queryFn: async () => {
      if (!db) return [];
      const contactsRef = collection(db, "contacts");
      const q = query(contactsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const allContacts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Contact[];
      return allContacts.filter((contact) => contact.status === "pending");
    },
    enabled: !!user && !!db,
  });

  // 解決済みのお問い合わせを取得
  const { data: resolvedContacts, isLoading: isLoadingResolved } = useQuery({
    queryKey: ["contacts", "resolved"],
    queryFn: async () => {
      if (!db) return [];
      const contactsRef = collection(db, "contacts");
      const q = query(contactsRef, orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);
      const allContacts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Contact[];
      return allContacts.filter((contact) => contact.status === "resolved");
    },
    enabled: !!user && !!db,
  });

  const updateContactStatus = useMutation({
    mutationFn: async ({ contactId, status }: { contactId: string; status: "pending" | "resolved" }) => {
      if (!db) throw new Error("Firestore not initialized");
      await updateDoc(doc(db, "contacts", contactId), {
        status,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  // 種類が変更されたときにエラー報告の詳細情報をリセット
  useEffect(() => {
    if (type !== "error") {
      setErrorIssue("");
      setErrorReproductionSteps("");
      setErrorDevice("");
      setErrorOS("");
      setErrorBrowser("");
      setErrorOSVersion("");
      setErrorBrowserVersion("");
      setErrorScreenshotUrl("");
      setErrorScreenshotFile(null);
      setErrorScreenshotPreview(null);
    }
  }, [type]);

  // 画像ファイル選択時の処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像ファイルかチェック
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "画像ファイルを選択してください。" });
      return;
    }

    // ファイルサイズチェック（10MBまで）
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "画像ファイルは10MB以下にしてください。" });
      return;
    }

    setErrorScreenshotFile(file);
    setErrorScreenshotUrl(""); // URL入力はクリア

    // プレビュー用のURLを作成
    const reader = new FileReader();
    reader.onload = (e) => {
      setErrorScreenshotPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 画像アップロード処理
  const handleImageUpload = async () => {
    if (!errorScreenshotFile || !firebaseUser) {
      return;
    }

    const timestamp = Date.now();
    const fileName = `${firebaseUser.uid}/${timestamp}_${errorScreenshotFile.name}`;
    const path = `contacts/${fileName}`;

    const url = await uploadImage(errorScreenshotFile, path, {
      compress: true,
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      maxSizeKB: 500,
    });

    if (url) {
      setErrorScreenshotUrl(url);
      setMessage({ type: "success", text: "画像のアップロードが完了しました。" });
    } else {
      setMessage({ type: "error", text: imageUploadError || "画像のアップロードに失敗しました。" });
    }
  };

  const submitContact = useMutation({
    mutationFn: async (data: {
      type: ContactType;
      title: string;
      content: string;
      errorReportDetails?: ErrorReportDetails;
    }) => {
      if (!firebaseUser) {
        throw new Error("認証が必要です");
      }

      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "お問い合わせの送信に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      setMessage({ type: "success", text: "お問い合わせを送信しました。ありがとうございます。" });
      setTitle("");
      setContent("");
      setType("error");
      setErrorIssue("");
      setErrorReproductionSteps("");
      setErrorDevice("");
      setErrorOS("");
      setErrorBrowser("");
      setErrorOSVersion("");
      setErrorBrowserVersion("");
      setErrorScreenshotUrl("");
      setErrorScreenshotFile(null);
      setErrorScreenshotPreview(null);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (error: Error) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage({ type: "error", text: "タイトルを入力してください。" });
      return;
    }

    // エラー報告以外の場合、内容を必須とする
    if (type !== "error" && !content.trim()) {
      setMessage({ type: "error", text: "内容を入力してください。" });
      return;
    }

    // エラー報告の場合、詳細情報を検証
    if (type === "error") {
      if (!errorIssue.trim()) {
        setMessage({ type: "error", text: "事象を入力してください。" });
        return;
      }
      if (!errorReproductionSteps.trim()) {
        setMessage({ type: "error", text: "再現方法を入力してください。" });
        return;
      }
      if (!errorDevice) {
        setMessage({ type: "error", text: "デバイス（PC/SP）を選択してください。" });
        return;
      }
      if (!errorOS) {
        setMessage({ type: "error", text: errorDevice === "SP" ? "スマホの種類を選択してください。" : "OSを選択してください。" });
        return;
      }
      if (!errorBrowser) {
        setMessage({ type: "error", text: "ブラウザを選択してください。" });
        return;
      }
      if (!errorBrowserVersion.trim()) {
        setMessage({ type: "error", text: "ブラウザのバージョンを入力してください。" });
        return;
      }
      if (errorDevice === "SP" && !errorOSVersion.trim()) {
        setMessage({ type: "error", text: "スマホのバージョンを入力してください。" });
        return;
      }
    }

    // エラー報告の場合、テンプレートに基づいて内容を生成
    let finalContent = content.trim();
    if (type === "error") {
      const errorDetails: ErrorReportDetails = {
        issue: errorIssue.trim(),
        reproductionSteps: errorReproductionSteps.trim(),
        environment: {
          device: errorDevice as DeviceType,
          os: errorOS as PCOSType | SPOSType | SmartphoneType,
          browser: errorBrowser as BrowserType,
          osVersion: errorOSVersion?.trim() || undefined,
          browserVersion: errorBrowserVersion.trim(),
        },
        screenshotUrl: errorScreenshotUrl?.trim() || undefined,
      };

      // テンプレートに基づいて内容を生成
      const environmentLines = [
        `- デバイス: ${errorDevice}`,
      ];

      if (errorDevice === "PC") {
        environmentLines.push(`- OS: ${errorOS}`);
        if (errorOSVersion.trim()) {
          environmentLines.push(`- OSのバージョン: ${errorOSVersion.trim()}`);
        }
      } else {
        environmentLines.push(`- スマホの種類: ${errorOS}`);
        if (errorOSVersion.trim()) {
          environmentLines.push(`- スマホのバージョン: ${errorOSVersion.trim()}`);
        }
      }

      environmentLines.push(`- ブラウザ: ${errorBrowser}`);
      if (errorBrowserVersion.trim()) {
        environmentLines.push(`- ブラウザのバージョン: ${errorBrowserVersion.trim()}`);
      }

      if (errorScreenshotUrl.trim()) {
        environmentLines.push(`- スクリーンショット: ${errorScreenshotUrl.trim()}`);
      }

      finalContent = [
        "## 事象",
        errorIssue.trim(),
        "",
        "## 再現方法",
        errorReproductionSteps.trim(),
        "",
        "## 環境",
        ...environmentLines,
        "",
        "---",
        "",
        content.trim() ? `**その他の情報**:\n${content.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      submitContact.mutate({
        type,
        title: title.trim(),
        content: finalContent,
        errorReportDetails: errorDetails,
      });
    } else {
      submitContact.mutate({
        type,
        title: title.trim(),
        content: finalContent,
      });
    }
  };
  const handleDeviceChange = (device: DeviceType) => {
    setErrorDevice(device);
    // デバイスが変更されたらOSをリセット
    setErrorOS("");
    setErrorOSVersion("");
  };

  const handleOSChange = (os: PCOSType | SPOSType | SmartphoneType) => {
    setErrorOS(os);
  };

  const handleBrowserChange = (browser: BrowserType) => {
    setErrorBrowser(browser);
  };


  if (!user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      {/* 左側: お問い合わせ一覧（管理者のみ）または新規作成フォーム（一般ユーザー） */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
            お問い合わせ
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              onClick={() => {
                setViewMode(viewMode === "pending" ? "resolved" : "pending");
              }}
              variant="outline"
              size="sm"
            >
              {viewMode === "pending" ? "解決済みを表示" : "対応中を表示"}
            </Button>
            {isAdmin && (
              <Button onClick={() => setShowForm(true)} variant="default">
                新規作成
              </Button>
            )}
          </Box>
        </Box>

        {/* 未解決のお問い合わせ */}
        {viewMode === "pending" && (
          <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: "bold", mb: 2 }}>
            対応中
          </Typography>
          {isLoadingPending ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : pendingContacts && pendingContacts.length === 0 ? (
            <Alert severity="info">対応中のお問い合わせはありません</Alert>
          ) : (
            <List>
              {pendingContacts?.map((contact) => (
              <Card
                key={contact.id}
                sx={{ mb: 2 }}
              >
                    <CardContent>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                            <Chip
                              label={getContactTypeLabel(contact.type)}
                              color={getContactTypeColor(contact.type)}
                              size="small"
                            />
                            <Chip
                              label="対応中"
                              color="warning"
                              size="small"
                            />
                          </Box>
                          <Typography variant="h6" component="h2" sx={{ fontWeight: "semibold", mb: 1 }}>
                            {contact.title}
                          </Typography>
                          {contact.type === "error" && contact.errorReportDetails ? (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1 }}>
                                事象
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {contact.errorReportDetails.issue}
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1 }}>
                                再現方法
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {contact.errorReportDetails.reproductionSteps}
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1 }}>
                                環境
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                - デバイス: {contact.errorReportDetails.environment.device}
                              </Typography>
                              {contact.errorReportDetails.environment.device === "PC" ? (
                                <>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    - OS: {contact.errorReportDetails.environment.os}
                                  </Typography>
                                  {contact.errorReportDetails.environment.osVersion && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                      - OSのバージョン: {contact.errorReportDetails.environment.osVersion}
                                    </Typography>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    - スマホの種類: {contact.errorReportDetails.environment.os}
                                  </Typography>
                                  {contact.errorReportDetails.environment.osVersion && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                      - スマホのバージョン: {contact.errorReportDetails.environment.osVersion}
                                    </Typography>
                                  )}
                                </>
                              )}
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                - ブラウザ: {contact.errorReportDetails.environment.browser}
                              </Typography>
                              {contact.errorReportDetails.environment.browserVersion && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  - ブラウザのバージョン: {contact.errorReportDetails.environment.browserVersion}
                                </Typography>
                              )}
                              {contact.errorReportDetails.screenshotUrl && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1 }}>
                                    スクリーンショット
                                  </Typography>
                                  <Box
                                    component="img"
                                    src={contact.errorReportDetails.screenshotUrl}
                                    alt="スクリーンショット"
                                    sx={{
                                      maxWidth: "100%",
                                      maxHeight: "400px",
                                      borderRadius: 1,
                                      border: 1,
                                      borderColor: "divider",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => window.open(contact.errorReportDetails.screenshotUrl, "_blank")}
                                  />
                                  <MUILink
                                    href={contact.errorReportDetails.screenshotUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ mt: 1, display: "block" }}
                                  >
                                    画像を別ウィンドウで開く
                                  </MUILink>
                                </Box>
                              )}
                              {contact.content && (
                                <>
                                  <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1, mt: 2 }}>
                                    その他の情報
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {contact.content}
                                  </Typography>
                                </>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: "pre-wrap" }}>
                              {contact.content}
                            </Typography>
                          )}
                          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              送信者: {contact.userName} ({contact.userEmail})
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              送信日時: {new Date(contact.createdAt).toLocaleString("ja-JP")}
                            </Typography>
                          </Box>
                          {contact.githubIssueUrl && (
                            <Box sx={{ mt: 1 }}>
                              <MUILink href={contact.githubIssueUrl} target="_blank" rel="noopener noreferrer">
                                GitHub Issueを開く
                              </MUILink>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, ml: 2 }}>
                          <Button
                            onClick={() =>
                              updateContactStatus.mutate({
                                contactId: contact.id,
                                status: contact.status === "pending" ? "resolved" : "pending",
                              })
                            }
                            disabled={updateContactStatus.isPending}
                            variant="outline"
                            size="sm"
                          >
                            解決済みにする
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
            </List>
          )}
          </Box>
        )}

        {/* 解決済みのお問い合わせ */}
        {viewMode === "resolved" && (
          <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: "bold", mb: 2 }}>
            解決済み
          </Typography>
          {isLoadingResolved ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : resolvedContacts && resolvedContacts.length === 0 ? (
            <Alert severity="info">解決済みのお問い合わせはありません</Alert>
          ) : (
            <List>
              {resolvedContacts?.map((contact) => (
                <Card
                  key={contact.id}
                  sx={{
                    mb: 2,
                    opacity: 0.6,
                    backgroundColor: "action.hover",
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                          <Chip
                            label={getContactTypeLabel(contact.type)}
                            color={getContactTypeColor(contact.type)}
                            size="small"
                          />
                          <Chip
                            icon={<CheckCircle sx={{ fontSize: 16 }} />}
                            label="解決済み"
                            color="success"
                            size="small"
                            sx={{ opacity: 0.8 }}
                          />
                        </Box>
                        <Typography
                          variant="h6"
                          component="h2"
                          sx={{
                            fontWeight: "semibold",
                            mb: 1,
                            color: "text.disabled",
                            textDecoration: "line-through",
                          }}
                        >
                          {contact.title}
                        </Typography>
                        {contact.type === "error" && contact.errorReportDetails ? (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1 }}>
                              事象
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {contact.errorReportDetails.issue}
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1 }}>
                              再現方法
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {contact.errorReportDetails.reproductionSteps}
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1 }}>
                              環境
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              - デバイス: {contact.errorReportDetails.environment.device}
                            </Typography>
                            {contact.errorReportDetails.environment.device === "PC" ? (
                              <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  - OS: {contact.errorReportDetails.environment.os}
                                </Typography>
                                {contact.errorReportDetails.environment.osVersion && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    - OSのバージョン: {contact.errorReportDetails.environment.osVersion}
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  - スマホの種類: {contact.errorReportDetails.environment.os}
                                </Typography>
                                {contact.errorReportDetails.environment.osVersion && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    - スマホのバージョン: {contact.errorReportDetails.environment.osVersion}
                                  </Typography>
                                )}
                              </>
                            )}
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              - ブラウザ: {contact.errorReportDetails.environment.browser}
                            </Typography>
                            {contact.errorReportDetails.environment.browserVersion && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                - ブラウザのバージョン: {contact.errorReportDetails.environment.browserVersion}
                              </Typography>
                            )}
                            {contact.errorReportDetails.screenshotUrl && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1 }}>
                                  スクリーンショット
                                </Typography>
                                <Box
                                  component="img"
                                  src={contact.errorReportDetails.screenshotUrl}
                                  alt="スクリーンショット"
                                  sx={{
                                    maxWidth: "100%",
                                    maxHeight: "400px",
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: "divider",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => window.open(contact.errorReportDetails.screenshotUrl, "_blank")}
                                />
                                <MUILink
                                  href={contact.errorReportDetails.screenshotUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ mt: 1, display: "block" }}
                                >
                                  画像を別ウィンドウで開く
                                </MUILink>
                              </Box>
                            )}
                            {contact.content && (
                              <>
                                <Typography variant="subtitle2" sx={{ fontWeight: "semibold", mb: 1, mt: 2 }}>
                                  その他の情報
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  {contact.content}
                                </Typography>
                              </>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: "pre-wrap" }}>
                            {contact.content}
                          </Typography>
                        )}
                        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            送信者: {contact.userName} ({contact.userEmail})
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            送信日時: {new Date(contact.createdAt).toLocaleString("ja-JP")}
                          </Typography>
                        </Box>
                        {contact.githubIssueUrl && (
                          <Box sx={{ mt: 1 }}>
                            <MUILink href={contact.githubIssueUrl} target="_blank" rel="noopener noreferrer">
                              GitHub Issueを開く
                            </MUILink>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, ml: 2 }}>
                        <Button
                          onClick={() =>
                            updateContactStatus.mutate({
                              contactId: contact.id,
                              status: "pending",
                            })
                          }
                          disabled={updateContactStatus.isPending}
                          variant="outline"
                          size="sm"
                        >
                          対応中に戻す
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </List>
          )}
          </Box>
        )}
      </Box>

      {/* 右側: 新規作成フォーム（管理者の場合のみDrawerで表示） */}
      {isAdmin && (
        <Drawer
          anchor="right"
          open={showForm}
          onClose={() => setShowForm(false)}
          PaperProps={{
            sx: {
              width: { xs: "100%", sm: 600 },
              p: 3,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          <Box sx={{ flex: 1, pb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                新規お問い合わせ
              </Typography>
              <IconButton onClick={() => setShowForm(false)} size="small">
                <Close />
              </IconButton>
            </Box>

            {message && (
              <Alert
                severity={message.type}
                onClose={() => setMessage(null)}
                sx={{ mb: 2 }}
              >
                {message.text}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <FormControl fullWidth>
                  <InputLabel id="contact-type-label">お問い合わせの種類</InputLabel>
                  <Select
                    labelId="contact-type-label"
                    id="contact-type"
                    value={type}
                    label="お問い合わせの種類"
                    onChange={(e) => setType(e.target.value as ContactType)}
                  >
                    <MenuItem value="error">エラー報告</MenuItem>
                    <MenuItem value="feature">要望</MenuItem>
                    <MenuItem value="other">そのほか</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="タイトル"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  variant="outlined"
                  placeholder="お問い合わせのタイトルを入力してください"
                />

                {type === "error" ? (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: "semibold", mb: 2 }}>
                      エラー報告の詳細情報
                    </Typography>

                    <TextField
                      fullWidth
                      label="事象"
                      value={errorIssue}
                      onChange={(e) => setErrorIssue(e.target.value)}
                      required
                      multiline
                      rows={3}
                      variant="outlined"
                      placeholder="どのような問題が発生しましたか？"
                    />

                    <TextField
                      fullWidth
                      label="再現方法"
                      value={errorReproductionSteps}
                      onChange={(e) => setErrorReproductionSteps(e.target.value)}
                      required
                      multiline
                      rows={4}
                      variant="outlined"
                      placeholder="問題を再現する手順を詳しく入力してください"
                    />

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <FormControl component="fieldset">
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          デバイス（必須）
                        </Typography>
                        <RadioGroup
                          row
                          value={errorDevice}
                          onChange={(e) => handleDeviceChange(e.target.value as DeviceType)}
                        >
                          <FormControlLabel value="PC" control={<Radio />} label="PC" />
                          <FormControlLabel value="SP" control={<Radio />} label="SP" />
                        </RadioGroup>
                      </FormControl>

                      <FormControl component="fieldset">
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          {errorDevice === "SP" ? "スマホの種類（必須）" : "OS（必須）"}
                        </Typography>
                        <RadioGroup
                          row
                          value={errorOS}
                          onChange={(e) => handleOSChange(e.target.value as PCOSType | SPOSType | SmartphoneType)}
                        >
                          {errorDevice === "PC" ? (
                            <>
                              <FormControlLabel value="Mac" control={<Radio />} label="Mac" />
                              <FormControlLabel value="Windows" control={<Radio />} label="Windows" />
                              <FormControlLabel value="Linux" control={<Radio />} label="Linux" />
                              <FormControlLabel value="other" control={<Radio />} label="その他" />
                            </>
                          ) : (
                            <>
                              <FormControlLabel value="iPhone" control={<Radio />} label="iPhone" />
                              <FormControlLabel value="Android" control={<Radio />} label="Android" />
                              <FormControlLabel value="other" control={<Radio />} label="その他" />
                            </>
                          )}
                        </RadioGroup>
                      </FormControl>

                      <TextField
                        fullWidth
                        label={errorDevice === "SP" ? "スマホのバージョン（必須）" : "OSのバージョン（任意）"}
                        value={errorOSVersion}
                        onChange={(e) => setErrorOSVersion(e.target.value)}
                        required={errorDevice === "SP"}
                        variant="outlined"
                        placeholder={errorDevice === "PC" ? "例: macOS 14.0、Windows 11など" : "例: iOS 17.0、Android 14など"}
                      />

                      <FormControl component="fieldset">
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          ブラウザ（必須）
                        </Typography>
                        <RadioGroup
                          row
                          value={errorBrowser}
                          onChange={(e) => handleBrowserChange(e.target.value as BrowserType)}
                        >
                          <FormControlLabel value="Chrome" control={<Radio />} label="Chrome" />
                          <FormControlLabel value="Firefox" control={<Radio />} label="Firefox" />
                          <FormControlLabel value="Safari" control={<Radio />} label="Safari" />
                          <FormControlLabel value="Arc" control={<Radio />} label="Arc" />
                          <FormControlLabel value="Comet" control={<Radio />} label="Comet" />
                          <FormControlLabel value="Dia" control={<Radio />} label="Dia" />
                          <FormControlLabel value="other" control={<Radio />} label="その他" />
                        </RadioGroup>
                      </FormControl>
                      </Box>

                      <TextField
                        fullWidth
                        label="ブラウザのバージョン（必須）"
                        value={errorBrowserVersion}
                        required
                        onChange={(e) => setErrorBrowserVersion(e.target.value)}
                        variant="outlined"
                        placeholder="例: Chrome 120.0.0.0、Safari 17.0など"
                      />

                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: "semibold" }}>
                          再現画面のスクリーンショット（任意）
                        </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <input
                          accept="image/*"
                          style={{ display: "none" }}
                          id="screenshot-upload-drawer"
                          type="file"
                          onChange={handleImageSelect}
                        />
                        <label htmlFor="screenshot-upload-drawer">
                          <Button
                            component="span"
                            variant="outline"
                            startIcon={<ImageIcon />}
                            disabled={imageUploading}
                            sx={{ mb: 1 }}
                          >
                            画像を選択
                          </Button>
                        </label>
                        {errorScreenshotPreview && (
                          <Box sx={{ mt: 1 }}>
                            <img
                              src={errorScreenshotPreview}
                              alt="プレビュー"
                              style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "4px" }}
                            />
                            {!errorScreenshotUrl && (
                              <Button
                                onClick={handleImageUpload}
                                disabled={imageUploading}
                                variant="default"
                                startIcon={<CloudUpload />}
                                sx={{ mt: 1 }}
                                fullWidth
                              >
                                {imageUploading ? "アップロード中..." : "アップロード"}
                              </Button>
                            )}
                            {imageUploading && (
                              <Box sx={{ mt: 1 }}>
                                <LinearProgress variant="determinate" value={progress} />
                                <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
                                  {progress}% アップロード中...
                                </Typography>
                              </Box>
                            )}
                            {errorScreenshotUrl && (
                              <Alert severity="success" sx={{ mt: 1 }}>
                                アップロード完了
                              </Alert>
                            )}
                          </Box>
                        )}
                        {errorScreenshotUrl && !errorScreenshotPreview && (
                          <Box sx={{ mt: 1 }}>
                            <Alert severity="info">
                              画像がアップロード済みです
                              <MUILink href={errorScreenshotUrl} target="_blank" rel="noopener noreferrer" sx={{ ml: 1 }}>
                                画像を表示
                              </MUILink>
                            </Alert>
                          </Box>
                        )}
                        <TextField
                          fullWidth
                          label="またはURLを直接入力"
                          value={errorScreenshotUrl}
                          onChange={(e) => {
                            setErrorScreenshotUrl(e.target.value);
                            setErrorScreenshotFile(null);
                            setErrorScreenshotPreview(null);
                          }}
                          variant="outlined"
                          placeholder="画像のURLを入力してください（任意）"
                          helperText="画像ファイルをアップロードするか、URLを直接入力してください"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />
                    <TextField
                      fullWidth
                      label="その他の情報"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      multiline
                      rows={4}
                      variant="outlined"
                      placeholder="その他、補足情報があれば入力してください（任意）"
                    />
                  </>
                ) : (
                  <TextField
                    fullWidth
                    label="内容"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    multiline
                    rows={8}
                    variant="outlined"
                    placeholder="お問い合わせの内容を詳しく入力してください"
                  />
                )}

                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                  <Button
                    type="button"
                    onClick={() => setShowForm(false)}
                    variant="outline"
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitContact.isPending}
                    variant="default"
                  >
                    {submitContact.isPending ? "送信中..." : "送信"}
                  </Button>
                </Box>
              </Box>
            </form>
          </Box>
        </Drawer>
      )}
    </Box>
  );
}
