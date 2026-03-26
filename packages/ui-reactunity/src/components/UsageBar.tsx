import type { UsageViewModel } from '@acme/ui-common';

interface Props {
  usage: UsageViewModel;
}

export function UsageBar({ usage }: Props): React.ReactElement {
  const barColor = usage.percentage > 80 ? '#ef4444' : usage.percentage > 50 ? '#f59e0b' : '#22c55e';

  return (
    <view style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <view
        style={{
          width: 80,
          height: 6,
          backgroundColor: '#e5e7eb',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <view
          style={{
            width: `${Math.min(usage.percentage, 100)}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 3,
          }}
        />
      </view>
      <text style={{ fontSize: 12, color: '#666' }}>{usage.percentage}%</text>
      {usage.costDisplay && <text style={{ fontSize: 12, color: '#888' }}>{usage.costDisplay}</text>}
    </view>
  );
}
