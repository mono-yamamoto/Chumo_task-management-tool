import { Play, FolderOpen, MessageCircle, Flame, PawPrint, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function TaskDetailActionBar() {
  return (
    <div className="flex items-center gap-2 py-2">
      {/* タイマー開始 */}
      <Button
        variant="primary"
        onPress={() => {}} // TODO: タイマー開始処理
      >
        <Play size={16} />
        タイマー開始
      </Button>

      {/* 外部サービス連携ボタン群 */}
      <OutlinedActionButton icon={<FolderOpen size={16} />} label="DRIVE作成" />
      <OutlinedActionButton icon={<MessageCircle size={16} />} label="CHAT作成" />
      <OutlinedActionButton icon={<Flame size={16} />} label="FIRE issue作成" />
      <OutlinedActionButton icon={<PawPrint size={16} />} label="PET issue作成" />

      {/* BACKLOG */}
      <Button
        variant="outline"
        size="sm"
        onPress={() => {}} // TODO: BACKLOG連携処理
        className="border-teal-200 bg-bg-brand-subtle text-xs text-primary-default hover:bg-teal-100"
      >
        <ExternalLink size={16} />
        BACKLOGを開く
      </Button>
    </div>
  );
}

function OutlinedActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Button
      variant="outline"
      onPress={() => {}} // TODO: 外部サービス連携処理
      className="text-xs text-text-secondary"
    >
      {icon}
      {label}
    </Button>
  );
}
