import type { PermissionViewModel } from '@acme/ui-common';

interface Props {
  permission: PermissionViewModel;
  onApprove: (requestId: string, optionId: string) => void;
}

export function PermissionDialog({ permission, onApprove }: Props): React.ReactElement {
  return (
    <view
      style={{
        padding: 12,
        paddingLeft: 16,
        paddingRight: 16,
        borderTopWidth: 1,
        borderTopColor: '#f59e0b',
        backgroundColor: '#fffbeb',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <text style={{ fontSize: 14, fontWeight: '600', color: '#92400e' }}>
        {permission.description}
      </text>
      <view style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {permission.options.map((opt) => (
          <button
            key={opt.optionId}
            onClick={() => onApprove(permission.requestId, opt.optionId)}
            style={{
              padding: 6,
              paddingLeft: 14,
              paddingRight: 14,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#d1d5db',
              backgroundColor:
                opt.kind === 'allow_once' || opt.kind === 'allow_always' ? '#22c55e' : '#ef4444',
              color: '#fff',
              fontSize: 13,
            }}
          >
            {opt.name}
          </button>
        ))}
      </view>
    </view>
  );
}
