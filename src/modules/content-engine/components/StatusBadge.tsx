import type { ContentItemStatus } from '../types';
import { STATUS_LABELS } from '../types';

const STATUS_STYLES: Record<ContentItemStatus, string> = {
  draft: 'bg-navy-50 text-navy-500',
  review: 'bg-amber-50 text-amber-700',
  approved: 'bg-brand-50 text-brand-700',
  scheduled: 'bg-purple-50 text-purple-700',
  published: 'bg-success-bg text-success',
};

export function StatusBadge({ status }: { status: ContentItemStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
