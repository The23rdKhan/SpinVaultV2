import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  chips?: ReactNode;
};

/** §B2.6 shared header pattern */
export function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  chips,
}: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
            {subtitle}
          </p>
        ) : null}
        {chips ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">{chips}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {secondaryAction}
        {primaryAction}
      </div>
    </header>
  );
}
