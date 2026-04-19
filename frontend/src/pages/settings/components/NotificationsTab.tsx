import { BellRing } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { usePushNotifications } from '../../../hooks/usePushNotifications';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-labelledby'?: string;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  'aria-labelledby': ariaLabelledBy,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-primary-default' : 'bg-neutral-200 dark:bg-neutral-600',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export function NotificationsTab() {
  const { isSupported, permission, isSubscribed, isPending, error, toggle } =
    usePushNotifications();

  const isDenied = permission === 'denied';
  const isDisabled = !isSupported || isDenied || isPending;

  const descText = !isSupported
    ? 'このブラウザはプッシュ通知に対応していません'
    : isDenied
      ? 'ブラウザの設定から通知を許可してください'
      : 'タスクの更新やメンションを受け取ります';

  return (
    <div className="flex flex-col gap-6 py-8 px-10">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-text-primary">通知設定</h2>
        <p className="text-sm text-text-secondary">プッシュ通知の受信設定を管理します</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Push Notification Card */}
      <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-primary p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50">
            <BellRing size={20} className="text-amber-600" />
          </div>
          <div className="flex flex-col gap-1">
            <span id="push-notifications-label" className="text-sm font-medium text-text-primary">
              プッシュ通知
            </span>
            <span
              className={cn(
                'text-xs',
                !isSupported || isDenied ? 'text-amber-600' : 'text-text-secondary'
              )}
            >
              {descText}
            </span>
          </div>
        </div>
        <ToggleSwitch
          checked={isSubscribed}
          onChange={toggle}
          disabled={isDisabled}
          aria-labelledby="push-notifications-label"
        />
      </div>
    </div>
  );
}
