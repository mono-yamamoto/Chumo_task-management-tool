import type { Contact, ContactType } from '../../../types';

const TYPE_CONFIG: Record<ContactType, { label: string; bgClass: string; textClass: string }> = {
  error: {
    label: 'エラー報告',
    bgClass: 'bg-error-bg',
    textClass: 'text-error-text',
  },
  feature: {
    label: '要望',
    bgClass: 'bg-info-bg',
    textClass: 'text-info-text',
  },
  other: {
    label: 'そのほか',
    bgClass: 'bg-warning-bg',
    textClass: 'text-warning-text',
  },
};

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
  const config = TYPE_CONFIG[contact.type];
  const dateStr = new Date(contact.createdAt).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-primary p-5">
      {/* タイプバッジ */}
      <span
        className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-bold ${config.bgClass} ${config.textClass}`}
      >
        {config.label}
      </span>

      {/* タイトル */}
      <h3 className="text-md font-bold leading-normal text-text-primary">{contact.title}</h3>

      {/* 本文 */}
      <p className="text-sm font-normal leading-relaxed text-text-secondary">{contact.content}</p>

      {/* フッター */}
      <div className="flex items-center justify-between">
        <span className="text-xs leading-normal text-text-tertiary">
          {contact.userName} &middot; {dateStr}
        </span>
      </div>
    </div>
  );
}
