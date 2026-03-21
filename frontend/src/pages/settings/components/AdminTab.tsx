import { useState } from 'react';
import { Plus, Trash2, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { AddMemberModal } from './AddMemberModal';
import { DeleteMemberModal } from './DeleteMemberModal';

interface Member {
  id: string;
  name: string;
  email: string;
  googleChat: string;
  role: 'Admin' | 'Member';
}

const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Tanaka Yui',
    email: 'tanaka@example.com',
    googleChat: 'tanaka.yui',
    role: 'Admin',
  },
  {
    id: '2',
    name: 'Suzuki Kenji',
    email: 'suzuki@example.com',
    googleChat: 'suzuki.kenji',
    role: 'Member',
  },
  {
    id: '3',
    name: 'Yamada Taro',
    email: 'yamada@example.com',
    googleChat: 'yamada.taro',
    role: 'Member',
  },
];

const TABLE_COLUMNS = [
  { label: 'メンバー', width: 'w-[230px]' },
  { label: 'メール', width: 'w-[240px]' },
  { label: 'Google Chat', width: 'w-[170px]' },
  { label: 'ロール', width: 'w-[100px]' },
  { label: '', width: 'w-[76px]' },
];

interface RoleDropdownProps {
  value: 'Admin' | 'Member';
  onChange: (role: 'Admin' | 'Member') => void;
}

function RoleDropdown({ value, onChange }: RoleDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 w-[100px] items-center justify-between rounded-md border border-border-default px-2 text-xs text-text-primary transition-colors hover:bg-bg-secondary"
      >
        <span>{value}</span>
        <ChevronDown size={14} className="text-text-tertiary" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-[120px] overflow-hidden rounded-md border border-border-default bg-bg-primary shadow-lg">
            {(['Admin', 'Member'] as const).map((role) => (
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
                <span>{role}</span>
                {value === role && <Check size={14} className="text-primary-default" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AdminTab() {
  const [members, setMembers] = useState(MOCK_MEMBERS);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const handleRoleChange = (memberId: string, role: 'Admin' | 'Member') => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
  };

  const handleAddMember = (email: string, role: 'Admin' | 'Member') => {
    const newMember: Member = {
      id: String(Date.now()),
      name: email.split('@')[0] ?? email,
      email,
      googleChat: '',
      role,
    };
    setMembers((prev) => [...prev, newMember]);
    setAddModalOpen(false);
  };

  const handleDeleteMember = () => {
    if (!deleteTarget) return;
    setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-6 py-8 px-10">
      {/* Header Row */}
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

      {/* User Table */}
      <div className="overflow-hidden rounded-lg border border-border-default bg-bg-primary">
        {/* Table Header */}
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

        {/* Table Rows */}
        {members.map((member) => (
          <div
            key={member.id}
            className="flex h-[52px] items-center gap-4 border-t border-border-default px-5"
          >
            <span className="w-[230px] truncate text-sm font-medium text-text-primary">
              {member.name}
            </span>
            <span className="w-[240px] truncate text-sm text-text-secondary">{member.email}</span>
            <span className="w-[170px] truncate text-sm text-text-secondary">
              {member.googleChat}
            </span>
            <div className="w-[100px]">
              <RoleDropdown
                value={member.role}
                onChange={(role) => handleRoleChange(member.id, role)}
              />
            </div>
            <div className="w-[76px]">
              <button
                type="button"
                onClick={() => setDeleteTarget(member)}
                className="flex h-7 w-full items-center justify-center gap-2 rounded-md bg-red-600 text-xs font-medium text-white transition-colors hover:bg-red-700"
              >
                <Trash2 size={14} />
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddMember}
      />
      <DeleteMemberModal
        isOpen={deleteTarget !== null}
        memberName={deleteTarget?.name ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteMember}
      />
    </div>
  );
}
