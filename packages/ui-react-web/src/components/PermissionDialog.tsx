import React from 'react';
import type { PermissionViewModel } from '@acme/ui-common';

interface Props {
  permission: PermissionViewModel;
  onApprove: (requestId: string, optionId: string) => void;
}

export function PermissionDialog({ permission, onApprove }: Props): React.ReactElement {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid #f59e0b',
        backgroundColor: '#fffbeb',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
        {permission.description}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {permission.options.map((opt) => (
          <button
            key={opt.optionId}
            onClick={() => onApprove(permission.requestId, opt.optionId)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor:
                opt.kind === 'allow_once' || opt.kind === 'allow_always' ? '#22c55e' : '#ef4444',
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}
