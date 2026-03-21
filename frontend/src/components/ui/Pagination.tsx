import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationProps {
  totalItems: number;
  currentPage: number;
  perPage: number;
  onPageChange?: (page: number) => void;
}

export function Pagination({ totalItems, currentPage, perPage, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  const pages = generatePageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">
        全{totalItems}件中 {startItem}〜{endItem}件表示
      </span>
      <nav className="flex items-center gap-1">
        <PageButton
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
          aria-label="前のページ"
        >
          <ChevronLeft size={14} />
        </PageButton>

        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-xs text-text-tertiary">
              ...
            </span>
          ) : (
            <PageButton
              key={page}
              active={page === currentPage}
              variant="page"
              onClick={() => onPageChange?.(page as number)}
            >
              {page}
            </PageButton>
          )
        )}

        <PageButton
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
          aria-label="次のページ"
        >
          <ChevronRight size={14} />
        </PageButton>
      </nav>
    </div>
  );
}

function PageButton({
  active = false,
  disabled = false,
  variant = 'nav',
  children,
  ...props
}: {
  active?: boolean;
  disabled?: boolean;
  variant?: 'nav' | 'page';
  children: React.ReactNode;
  onClick?: () => void;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex h-7 min-w-7 items-center justify-center rounded text-xs transition-colors',
        active
          ? 'bg-primary-default text-text-inverse'
          : variant === 'nav'
            ? 'border border-border-default text-text-primary hover:bg-bg-secondary'
            : 'text-text-primary hover:bg-bg-secondary',
        disabled && 'opacity-40 pointer-events-none'
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}
