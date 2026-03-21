import React from 'react';
import type { ToolCallViewModel } from '@acme/ui-common';

interface Props {
  toolCalls: readonly ToolCallViewModel[];
}

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
};

export function ToolCallList({ toolCalls }: Props): React.ReactElement | null {
  const active = toolCalls.filter((tc) => tc.isActive);
  if (active.length === 0) return null;

  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '13px',
        backgroundColor: '#fafafa',
      }}
    >
      {active.map((tc) => (
        <div key={tc.toolCallId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColors[tc.status ?? 'pending'] ?? '#94a3b8',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#555' }}>{tc.title}</span>
        </div>
      ))}
    </div>
  );
}
