import type { ReactNode } from 'react';

// Board 6 states A and B: a calm card in place of an empty table, with what to do next.
export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-lg border border-border bg-card px-5 py-7 text-center">
      <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
      {body && <p className="m-0 text-sm text-muted-foreground">{body}</p>}
      {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
