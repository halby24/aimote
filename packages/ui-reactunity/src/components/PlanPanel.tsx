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
    <view
      style={{
        padding: 8,
        paddingLeft: 16,
        paddingRight: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
      }}
    >
      <text style={{ fontWeight: '600', marginBottom: 4, color: '#555', fontSize: 13 }}>
        Plan
      </text>
      {plan.entries.map((entry, i) => (
        <view
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingTop: 2,
            paddingBottom: 2,
          }}
        >
          <text
            style={{
              fontSize: 13,
              color: entry.status === 'completed' ? '#22c55e' : '#333',
            }}
          >
            {statusIcon[entry.status] ?? '\u25cb'}
          </text>
          <text
            style={{
              fontSize: 13,
              color: entry.status === 'completed' ? '#22c55e' : '#333',
            }}
          >
            {entry.content}
          </text>
        </view>
      ))}
    </view>
  );
}
