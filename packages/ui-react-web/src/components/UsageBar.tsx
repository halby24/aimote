import React from 'react';
import type { UsageViewModel } from '@acme/ui-common';

interface Props {
  usage: UsageViewModel;
}

export function UsageBar({ usage }: Props): React.ReactElement {
  const barColor = usage.percentage > 80 ? '#ef4444' : usage.percentage > 50 ? '#f59e0b' : '#22c55e';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
      <div
        style={{
          width: '80px',
          height: '6px',
          backgroundColor: '#e5e7eb',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(usage.percentage, 100)}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ color: '#666' }}>{usage.percentage}%</span>
      {usage.costDisplay && <span style={{ color: '#888' }}>{usage.costDisplay}</span>}
    </div>
  );
}
