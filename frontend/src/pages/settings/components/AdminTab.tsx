import { useState } from 'react';
import { Plus, Trash2, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { AddMemberModal } from './AddMemberModal';
import { DeleteMemberModal } from './DeleteMemberModal';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useUsers } from '../../../hooks/useUsers';
import { useUpdateUser } from '../../../hooks/useUpdateUser';
import type { User } from '../../../types';

const TABLE_COLUMNS = [
  { label: 'メンバー', width: 'w-[230px]' },
  { label: 'メール', width: 'w-[240px]' },
  { label: 'Google Chat', width: 'w-[170px]' },
  { label: 'ロール', width: 'w-[100px]' },
  { label: '', width: 'w-[76px]' },
];

interface RoleDropdownProps {
  value: 'admin' | 'member';
  onChange: (role: 'admin' | 'member') => void;
  disabled?: boolean;
}

function RoleDropdown({ value, onChange, disabled }: RoleDropdownProps) {
  const [open, setOpen] = useState(false);
  const displayValue = value === 'admin' ? 'Admin' : 'Member';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          'flex h-8 w-[100px] items-center justify-between rounded-md border border-border-default px-2 text-xs transition-colors',
          disabled
            ? 'cursor-not-allowed text-text-tertiary'
            : 'text-text-primary hover:bg-bg-secondary'
        )}
      >
        <span>{displayValue}</span>
        <ChevronDown size={14} className="text-text-tertiary" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-[120px] overflow-hidden rounded-md border border-border-default bg-bg-primary shadow-lg">
            {(['admin', 'member'] as const).map((role) => {
              const label = role === 'admin' ? 'Admin' : 'Member';
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    onChange(role);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex h-9 w-full items-center justify-between px-3 text-xs transition-colors',
                    value === role
                      ? 'bg-bg-brand-subtle font-medium text-primary-default'
                      : 'text-text-primary hover:bg-bg-secondary'
                  )}
                >
                  <span>{label}</span>
                  {value === role && <Check size={14} className="text-primary-default" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function AdminTab() {
  const { data: currentUser } = useCurrentUser();
  const { data: users = [], isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const handleRoleChange = (userId: string, role: 'admin' | 'member') => {
    if (userId === currentUser?.id) return;
    updateUser.mutate({ userId, data: { role } });
  };

  const handleAddMember = (_email: string, _role: 'Admin' | 'Member') => {
    // TODO: メンバー追加 API（Clerk ユーザー招待）
    setAddModalOpen(false);
  };

  const handleDeleteMember = () => {
    if (!deleteTarget) return;
    updateUser.mutate({ userId: deleteTarget.id, data: { isAllowed: false } });
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8 px-10">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-text-primary">ユーザー管理</h2>
          <p className="text-sm text-text-secondary">
            メンバーのアクセス権限とアカウントを管理します
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          className="gap-1.5 text-sm"
          onPress={() => setAddModalOpen(true)}
        >
          <Plus size={16} />
          メンバー追加
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-default bg-bg-primary">
        <div className="flex h-11 items-center gap-4 px-5">
          {TABLE_COLUMNS.map((col) => (
            <span
              key={col.label || 'actions'}
              className={cn('text-sm font-medium text-primary-default', col.width)}
            >
              {col.label}
            </span>
          ))}
        </div>

        {users.map((user) => (
          <div
            key={user.id}
            className="flex h-[52px] items-center gap-4 border-t border-border-default px-5"
          >
            <span className="w-[230px] truncate text-sm font-medium text-text-primary">
              {user.displayName}
            </span>
            <span className="w-[240px] truncate text-sm text-text-secondary">{user.email}</span>
            <span className="w-[170px] truncate text-sm text-text-secondary">
              {user.chatId ?? '-'}
            </span>
            <div className="w-[100px]">
              <RoleDropdown
                value={user.role}
                onChange={(role) => handleRoleChange(user.id, role)}
                disabled={user.id === currentUser?.id}
              />
            </div>
            <div className="w-[76px]">
              <button
                type="button"
                onClick={() => setDeleteTarget(user)}
                className="flex h-7 w-full items-center justify-center gap-2 rounded-md bg-red-600 text-xs font-medium text-white transition-colors hover:bg-red-700"
              >
                <Trash2 size={14} />
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      <AddMemberModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddMember}
      />
      <DeleteMemberModal
        isOpen={deleteTarget !== null}
        memberName={deleteTarget?.displayName ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteMember}
      />
    </div>
  );
}
