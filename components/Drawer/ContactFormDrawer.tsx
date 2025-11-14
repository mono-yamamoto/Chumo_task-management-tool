"use client";

import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  Alert,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Link as MUILink,
  LinearProgress,
} from "@mui/material";
import { Drawer } from "@mui/material";
import { Close, CloudUpload, Image as ImageIcon } from "@mui/icons-material";
import { ContactType, DeviceType, PCOSType, SPOSType, BrowserType, SmartphoneType } from "@/types";

interface ContactFormDrawerProps {
  open: boolean;
  onClose: () => void;
  type: ContactType;
  onTypeChange: (type: ContactType) => void;
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  message: { type: "success" | "error"; text: string } | null;
  onMessageClose: () => void;
  errorIssue: string;
  onErrorIssueChange: (issue: string) => void;
  errorReproductionSteps: string;
  onErrorReproductionStepsChange: (steps: string) => void;
  errorDevice: DeviceType | "";
  onErrorDeviceChange: (device: DeviceType) => void;
  errorOS: PCOSType | SPOSType | SmartphoneType | "";
  onErrorOSChange: (os: PCOSType | SPOSType | SmartphoneType) => void;
  errorOSVersion: string;
  onErrorOSVersionChange: (version: string) => void;
  errorBrowser: BrowserType | "";
  onErrorBrowserChange: (browser: BrowserType) => void;
  errorBrowserVersion: string;
  onErrorBrowserVersionChange: (version: string) => void;
  errorScreenshotUrl: string;
  onErrorScreenshotUrlChange: (url: string) => void;
  errorScreenshotFile: File | null;
  errorScreenshotPreview: string | null;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: () => void;
  imageUploading: boolean;
  progress: number;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function ContactFormDrawer({
  open,
  onClose,
  type,
  onTypeChange,
  title,
  onTitleChange,
  content,
  onContentChange,
  message,
  onMessageClose,
  errorIssue,
  onErrorIssueChange,
  errorReproductionSteps,
  onErrorReproductionStepsChange,
  errorDevice,
  onErrorDeviceChange,
  errorOS,
  onErrorOSChange,
  errorOSVersion,
  onErrorOSVersionChange,
  errorBrowser,
  onErrorBrowserChange,
  errorBrowserVersion,
  onErrorBrowserVersionChange,
  errorScreenshotUrl,
  onErrorScreenshotUrlChange,
  errorScreenshotFile,
  errorScreenshotPreview,
  onImageSelect,
  onImageUpload,
  imageUploading,
  progress,
  onSubmit,
  isSubmitting,
}: ContactFormDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
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
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {message && (
          <Alert
            severity={message.type}
            onClose={onMessageClose}
            sx={{ mb: 2 }}
          >
            {message.text}
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="contact-type-label">お問い合わせの種類</InputLabel>
              <Select
                labelId="contact-type-label"
                id="contact-type"
                value={type}
                label="お問い合わせの種類"
                onChange={(e) => onTypeChange(e.target.value as ContactType)}
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
              onChange={(e) => onTitleChange(e.target.value)}
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
                  onChange={(e) => onErrorIssueChange(e.target.value)}
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
                  onChange={(e) => onErrorReproductionStepsChange(e.target.value)}
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
                      onChange={(e) => onErrorDeviceChange(e.target.value as DeviceType)}
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
                      onChange={(e) => onErrorOSChange(e.target.value as PCOSType | SPOSType | SmartphoneType)}
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
                    onChange={(e) => onErrorOSVersionChange(e.target.value)}
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
                      onChange={(e) => onErrorBrowserChange(e.target.value as BrowserType)}
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
                  onChange={(e) => onErrorBrowserVersionChange(e.target.value)}
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
                      onChange={onImageSelect}
                    />
                    <label htmlFor="screenshot-upload-drawer">
                          <Button
                            component="span"
                            variant="outlined"
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
                                onClick={onImageUpload}
                                disabled={imageUploading}
                                variant="contained"
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
                      onChange={(e) => onErrorScreenshotUrlChange(e.target.value)}
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
                  onChange={(e) => onContentChange(e.target.value)}
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
                onChange={(e) => onContentChange(e.target.value)}
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
                onClick={onClose}
                variant="outlined"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="contained"
              >
                {isSubmitting ? "送信中..." : "送信"}
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Drawer>
  );
}

