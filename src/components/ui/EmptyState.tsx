import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-12 text-center">
      {icon && <div className="text-3xl" aria-hidden="true">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-xs text-sm text-foreground-muted">{description}</p>
      {action}
    </div>
  );
}
