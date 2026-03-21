import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface DeleteMemberModalProps {
  isOpen: boolean;
  memberName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteMemberModal({
  isOpen,
  memberName,
  onClose,
  onConfirm,
}: DeleteMemberModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="メンバーを削除"
      className="w-[420px]"
      footer={
        <>
          <Button variant="outline" size="sm" onPress={onClose}>
            キャンセル
          </Button>
          <Button variant="destructive" size="sm" onPress={onConfirm}>
            <Trash2 size={16} />
            削除
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
        <p className="text-center text-md font-medium text-text-primary">
          {memberName} を削除しますか？
        </p>
        <p className="text-center text-sm text-text-secondary">
          この操作はメンバーのアクセス権を無効化します。
        </p>
      </div>
    </Modal>
  );
}
