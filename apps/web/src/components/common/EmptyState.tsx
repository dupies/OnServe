import type { ComponentType, ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
