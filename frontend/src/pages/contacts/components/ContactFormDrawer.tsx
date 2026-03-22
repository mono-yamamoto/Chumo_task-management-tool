import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Upload, ChevronDown, Send } from 'lucide-react';
import type {
  ContactType,
  DeviceType,
  PCOSType,
  SPOSType,
  SmartphoneType,
  BrowserType,
} from '../../../types';

interface ContactFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
}

export interface ContactFormData {
  type: ContactType;
  title: string;
  content: string;
  errorDetails?: {
    issue: string;
    reproductionSteps: string;
    device: DeviceType;
    os: PCOSType | SPOSType | SmartphoneType;
    browser: BrowserType;
    browserVersion: string;
    osVersion?: string;
    screenshotUrl?: string;
  };
}

const CONTACT_TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: 'error', label: 'エラー報告' },
  { value: 'feature', label: '要望' },
  { value: 'other', label: 'そのほか' },
];

const PC_OS_OPTIONS: { value: PCOSType; label: string }[] = [
  { value: 'Mac', label: 'Mac' },
  { value: 'Windows', label: 'Windows' },
  { value: 'Linux', label: 'Linux' },
  { value: 'other', label: 'その他' },
];

const SP_OS_OPTIONS: { value: SmartphoneType; label: string }[] = [
  { value: 'iPhone', label: 'iPhone' },
  { value: 'Android', label: 'Android' },
  { value: 'other', label: 'その他' },
];

const BROWSER_OPTIONS: { value: BrowserType; label: string }[] = [
  { value: 'Chrome', label: 'Chrome' },
  { value: 'Safari', label: 'Safari' },
  { value: 'Arc', label: 'Arc' },
  { value: 'other', label: 'その他' },
];

/* 共通のインプットクラス（デザイン仕様: h-10, cornerRadius 8, fill #FFF, border #E5E7EB, padding [0,12]） */
const INPUT_CLASS =
  'h-10 w-full rounded-md border border-border-default bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus';

const TEXTAREA_CLASS =
  'w-full rounded-md border border-border-default bg-bg-primary p-3 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus resize-none';

export function ContactFormDrawer({ isOpen, onClose, onSubmit }: ContactFormDrawerProps) {
  const [type, setType] = useState<ContactType>('error');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [issue, setIssue] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [device, setDevice] = useState<DeviceType | ''>('');
  const [os, setOs] = useState<PCOSType | SPOSType | SmartphoneType | ''>('');
  const [browser, setBrowser] = useState<BrowserType | ''>('');
  const [browserVersion, setBrowserVersion] = useState('');
  const [otherInfo, setOtherInfo] = useState('');
  const [_screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const resetForm = () => {
    setType('error');
    setTitle('');
    setContent('');
    setIssue('');
    setReproductionSteps('');
    setDevice('');
    setOs('');
    setBrowser('');
    setBrowserVersion('');
    setOtherInfo('');
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleTypeChange = (newType: ContactType) => {
    setType(newType);
    if (newType !== 'error') {
      setIssue('');
      setReproductionSteps('');
      setDevice('');
      setOs('');
      setBrowser('');
      setBrowserVersion('');
      setOtherInfo('');
      setScreenshotFile(null);
      setScreenshotPreview(null);
    }
  };

  const handleDeviceChange = (newDevice: DeviceType) => {
    setDevice(newDevice);
    setOs('');
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: ContactFormData = {
      type,
      title,
      content: type === 'error' ? otherInfo : content,
    };

    if (type === 'error') {
      if (!device || !os || !browser) return;
      data.errorDetails = {
        issue,
        reproductionSteps,
        device,
        os,
        browser,
        browserVersion,
        screenshotUrl: screenshotPreview ?? undefined,
      };
    }

    onSubmit(data);
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-bg-primary shadow-xl border-l border-border-default"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label="お問い合わせ作成"
          >
            {/* Header: padding [20,24], border-bottom, fontSize 18 bold */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-default">
              <h2 className="text-lg font-bold leading-normal text-text-primary">
                お問い合わせ作成
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-text-tertiary transition-colors hover:text-text-primary"
                aria-label="閉じる"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content: padding 24, gap 20 */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* カテゴリ: ラベルなし、h-10 */}
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as ContactType)}
                  className="h-10 w-full appearance-none rounded-md border border-border-default bg-bg-primary px-3 pr-10 text-sm text-text-primary transition-colors focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                >
                  {CONTACT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={20}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
              </div>

              {/* タイトル */}
              <FormField label="タイトル">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="お問い合わせのタイトルを入力"
                  required
                  className={INPUT_CLASS}
                />
              </FormField>

              {type === 'error' ? (
                <ErrorFormFields
                  issue={issue}
                  onIssueChange={setIssue}
                  reproductionSteps={reproductionSteps}
                  onReproductionStepsChange={setReproductionSteps}
                  device={device}
                  onDeviceChange={handleDeviceChange}
                  os={os}
                  onOsChange={setOs}
                  browser={browser}
                  onBrowserChange={setBrowser}
                  browserVersion={browserVersion}
                  onBrowserVersionChange={setBrowserVersion}
                  otherInfo={otherInfo}
                  onOtherInfoChange={setOtherInfo}
                  screenshotPreview={screenshotPreview}
                  onScreenshotSelect={handleScreenshotSelect}
                />
              ) : (
                <FormField label="内容">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="要望の内容を詳しく記入してください"
                    required
                    rows={8}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>
              )}

              {/* 送信ボタン: h-10, icon "send" */}
              <button
                type="submit"
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary-default text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover active:bg-primary-active"
              >
                <Send size={16} />
                送信
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ========== Sub Components ========== */

/** ラベル: fontSize 14, fontWeight 500, fill #6B7280 (text-secondary), gap 6 */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-secondary">{label}</label>
      {children}
    </div>
  );
}

interface ErrorFormFieldsProps {
  issue: string;
  onIssueChange: (v: string) => void;
  reproductionSteps: string;
  onReproductionStepsChange: (v: string) => void;
  device: DeviceType | '';
  onDeviceChange: (v: DeviceType) => void;
  os: PCOSType | SPOSType | SmartphoneType | '';
  onOsChange: (v: PCOSType | SPOSType | SmartphoneType) => void;
  browser: BrowserType | '';
  onBrowserChange: (v: BrowserType) => void;
  browserVersion: string;
  onBrowserVersionChange: (v: string) => void;
  otherInfo: string;
  onOtherInfoChange: (v: string) => void;
  screenshotPreview: string | null;
  onScreenshotSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ErrorFormFields({
  issue,
  onIssueChange,
  reproductionSteps,
  onReproductionStepsChange,
  device,
  onDeviceChange,
  os,
  onOsChange,
  browser,
  onBrowserChange,
  browserVersion,
  onBrowserVersionChange,
  otherInfo,
  onOtherInfoChange,
  screenshotPreview,
  onScreenshotSelect,
}: ErrorFormFieldsProps) {
  const osOptions = device === 'SP' ? SP_OS_OPTIONS : PC_OS_OPTIONS;

  return (
    <>
      {/* 事象: height 72 */}
      <FormField label="事象">
        <textarea
          value={issue}
          onChange={(e) => onIssueChange(e.target.value)}
          placeholder="発生した問題を記入してください"
          required
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </FormField>

      {/* 再現方法: height 88 */}
      <FormField label="再現方法">
        <textarea
          value={reproductionSteps}
          onChange={(e) => onReproductionStepsChange(e.target.value)}
          placeholder="問題を再現する手順を記入してください"
          required
          rows={4}
          className={TEXTAREA_CLASS}
        />
      </FormField>

      {/* デバイス: gap 16 between radios */}
      <FormField label="デバイス">
        <RadioGroup
          name="device"
          options={[
            { value: 'PC', label: 'PC' },
            { value: 'SP', label: 'SP' },
          ]}
          value={device}
          onChange={(v) => onDeviceChange(v as DeviceType)}
        />
      </FormField>

      {/* OS */}
      {device && (
        <FormField label="OS">
          <RadioGroup
            name="os"
            options={osOptions}
            value={os}
            onChange={(v) => onOsChange(v as PCOSType | SPOSType | SmartphoneType)}
          />
        </FormField>
      )}

      {/* ブラウザ */}
      <FormField label="ブラウザ">
        <RadioGroup
          name="browser"
          options={BROWSER_OPTIONS}
          value={browser}
          onChange={(v) => onBrowserChange(v as BrowserType)}
        />
      </FormField>

      {/* ブラウザバージョン */}
      <FormField label="ブラウザバージョン">
        <input
          type="text"
          value={browserVersion}
          onChange={(e) => onBrowserVersionChange(e.target.value)}
          placeholder="例: Chrome 120.0.0.0"
          className={INPUT_CLASS}
        />
      </FormField>

      {/* スクリーンショット: centerVertical, icon 24, text 12px, height 80, bg #F9FAFB */}
      <FormField label="スクリーンショット（任意）">
        <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-border-default bg-bg-secondary transition-colors hover:bg-bg-tertiary">
          <Upload size={24} className="text-text-tertiary" />
          <span className="text-xs leading-normal text-text-tertiary">
            クリックまたはドラッグで画像をアップロード
          </span>
          <input type="file" accept="image/*" onChange={onScreenshotSelect} className="hidden" />
        </label>
        {screenshotPreview && (
          <img
            src={screenshotPreview}
            alt="プレビュー"
            className="mt-2 max-h-48 rounded-md border border-border-default"
          />
        )}
      </FormField>

      {/* その他の情報（任意） */}
      <FormField label="その他の情報（任意）">
        <textarea
          value={otherInfo}
          onChange={(e) => onOtherInfoChange(e.target.value)}
          placeholder="追加情報があれば記入してください"
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </FormField>
    </>
  );
}

/** ラジオグループ: gap 16 between options, gap 6 between circle and label */
function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-text-primary"
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
              value === opt.value
                ? 'border-primary-default bg-primary-default'
                : 'border-border-strong'
            }`}
          >
            {value === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </span>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
