import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './Button';

interface IntegrationLinkButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  isPending?: boolean;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function IntegrationLinkButton({
  icon,
  label,
  onClick,
  isPending,
  active,
  size,
}: IntegrationLinkButtonProps) {
  return (
    <Button
      variant={active ? 'primary' : 'outline'}
      size={size}
      onPress={onClick}
      isDisabled={isPending}
      className={`text-xs ${active ? '' : 'text-text-secondary'}`}
    >
      {isPending ? <Loader2 size={16} className="animate-spin" /> : icon}
      {label}
    </Button>
  );
}
