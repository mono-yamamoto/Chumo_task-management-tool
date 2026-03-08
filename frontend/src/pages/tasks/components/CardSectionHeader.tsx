interface CardSectionHeaderProps {
  label: string;
  count: number;
}

export function CardSectionHeader({ label, count }: CardSectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <h3 className="text-sm font-bold text-text-primary">{label}</h3>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-tertiary px-1.5 text-xs font-medium text-text-secondary">
        {count}
      </span>
    </div>
  );
}
