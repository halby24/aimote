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
    <div
      style={{
        padding: '8px 16px',
        borderTop: '1px solid #e0e0e0',
        fontSize: '13px',
        backgroundColor: '#f8f9fa',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '4px', color: '#555' }}>Plan</div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {plan.entries.map((entry, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 0',
              color: entry.status === 'completed' ? '#22c55e' : '#333',
            }}
          >
            <span>{statusIcon[entry.status] ?? '\u25cb'}</span>
            <span>{entry.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
