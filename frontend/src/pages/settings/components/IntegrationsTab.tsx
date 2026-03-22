import { useState } from 'react';
import { HardDrive, Github, MessageCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface IntegrationCardProps {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  description: string;
  connected?: boolean;
  onConnect?: () => void;
  inputField?: {
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
  };
}

function IntegrationCard({
  icon,
  iconBg,
  name,
  description,
  connected,
  onConnect,
  inputField,
}: IntegrationCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-default bg-bg-primary p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconBg}`}
          >
            {icon}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-primary">{name}</span>
            <span className="text-xs text-text-secondary">{description}</span>
          </div>
        </div>
        {onConnect &&
          !inputField &&
          (connected ? (
            <span className="flex h-9 items-center rounded-md border border-green-200 bg-green-50 px-4 text-xs font-medium text-green-700">
              {'✓ 連携済み'}
            </span>
          ) : (
            <Button variant="primary" size="md" className="text-xs gap-1.5" onClick={onConnect}>
              連携する
            </Button>
          ))}
      </div>
      {inputField && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputField.value}
            onChange={(e) => inputField.onChange(e.target.value)}
            aria-label={`${name} の設定値`}
            className="h-10 flex-1 rounded-md border border-border-default bg-transparent px-3 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
          />
          <Button variant="outline" size="lg" className="text-sm px-4" onClick={inputField.onSave}>
            保存
          </Button>
        </div>
      )}
    </div>
  );
}

export function IntegrationsTab() {
  const [driveConnected, setDriveConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState('tanaka-yui');
  const [chatUserId, setChatUserId] = useState('spaces/xxx/members/123456');

  return (
    <div className="flex flex-col gap-6 py-8 px-10">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-text-primary">連携サービス</h2>
        <p className="text-sm text-text-secondary">外部サービスとの連携を管理します</p>
      </div>

      {/* Google Drive */}
      <IntegrationCard
        icon={<HardDrive size={20} className="text-blue-600" />}
        iconBg="bg-blue-50"
        name="Google Drive"
        description="レポートの自動エクスポート先"
        connected={driveConnected}
        onConnect={() => setDriveConnected(true)}
      />

      {/* GitHub */}
      <IntegrationCard
        icon={<Github size={20} className="text-neutral-800 dark:text-neutral-200" />}
        iconBg="bg-bg-tertiary"
        name="GitHub"
        description="Issue連携に使用するユーザー名"
        inputField={{
          value: githubUsername,
          onChange: setGithubUsername,
          onSave: () => {},
        }}
      />

      {/* Google Chat */}
      <IntegrationCard
        icon={<MessageCircle size={20} className="text-green-600" />}
        iconBg="bg-green-50"
        name="Google Chat"
        description="通知の送信先ユーザーID"
        inputField={{
          value: chatUserId,
          onChange: setChatUserId,
          onSave: () => {},
        }}
      />
    </div>
  );
}
