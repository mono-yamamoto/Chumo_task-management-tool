import { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (email: string, role: 'Admin' | 'Member') => void;
}

export function AddMemberModal({ isOpen, onClose, onAdd }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Member'>('Member');
  const [roleOpen, setRoleOpen] = useState(false);

  const handleAdd = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return;
    onAdd(trimmedEmail, role);
    setEmail('');
    setRole('Member');
  };

  const handleClose = () => {
    setEmail('');
    setRole('Member');
    setRoleOpen(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="メンバーを追加"
      footer={
        <>
          <Button variant="outline" size="sm" onPress={handleClose}>
            キャンセル
          </Button>
          <Button variant="primary" size="sm" onPress={handleAdd}>
            <Plus size={16} />
            追加
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="memberEmail" className="text-sm font-medium text-text-primary">
            メールアドレス
          </label>
          <input
            id="memberEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="h-10 w-full rounded-md border border-border-default bg-transparent px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
          />
        </div>

        {/* Role */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">ロール</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleOpen(!roleOpen)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-border-default px-3 text-sm text-text-primary transition-colors hover:bg-bg-secondary"
            >
              <span>{role}</span>
              <ChevronDown size={16} className="text-text-secondary" />
            </button>
            {roleOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-md border border-border-default bg-bg-primary shadow-lg">
                  {(['Admin', 'Member'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setRoleOpen(false);
                      }}
                      className="flex h-10 w-full items-center px-3 text-sm text-text-primary transition-colors hover:bg-bg-secondary"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
