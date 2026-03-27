import React from 'react';
import type { PlanViewModel } from '@acme/ui-common';

interface Props {
  plan: PlanViewModel;
}

const statusIcon: Record<string, string> = {
  pending: '\u25cb',
  in_progress: '\u25d4',
  completed: '\u25cf',
};

export function PlanPanel({ plan }: Props): React.ReactElement | null {
  if (!plan.hasEntries) return null;

  return (
    <div className="border-t border-border bg-surface-muted px-4 py-2 text-[13px]">
      <div className="mb-1 font-semibold text-text-secondary">Plan</div>
      <ul className="m-0 list-none p-0">
        {plan.entries.map((entry, i) => (
          <li
            key={i}
            className={`flex items-center gap-1.5 py-0.5 ${
              entry.status === 'completed' ? 'text-success' : 'text-text'
            }`}
          >
            <span>{statusIcon[entry.status] ?? '\u25cb'}</span>
            <span>{entry.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
