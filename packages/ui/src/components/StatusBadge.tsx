export interface StatusBadgeProps {
  status: string;
  label: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-attention',
  confirmed: 'bg-action-primary',
  preparing: 'bg-attention',
  ready: 'bg-success',
  delivered: 'bg-success',
  cancelled: 'bg-danger',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const dotColor = statusColors[status] ?? 'bg-text-secondary';

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-bg-surface border border-border-default px-3 py-1 text-sm font-medium text-text-primary">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
      {label}
    </span>
  );
}
