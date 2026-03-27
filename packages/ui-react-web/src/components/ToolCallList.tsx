import React from 'react';
import type { ToolCallViewModel } from '@acme/ui-common';

interface Props {
  toolCalls: readonly ToolCallViewModel[];
}

const statusClasses: Record<string, string> = {
  pending: 'bg-warning',
  in_progress: 'bg-indigo-400',
  completed: 'bg-success',
  failed: 'bg-error',
};

export function ToolCallList({ toolCalls }: Props): React.ReactElement | null {
  const active = toolCalls.filter((tc) => tc.isActive);
  if (active.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 border-b border-border bg-surface-subtle px-4 py-2 text-[13px]">
      {active.map((tc) => (
        <div key={tc.toolCallId} className="flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
              statusClasses[tc.status ?? 'pending'] ?? 'bg-[#94a3b8]'
            }`}
          />
          <span className="text-text-secondary">{tc.title}</span>
        </div>
      ))}
    </div>
  );
}
