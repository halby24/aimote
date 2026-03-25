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
    <view
      style={{
        padding: 8,
        paddingLeft: 16,
        paddingRight: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        backgroundColor: '#fafafa',
      }}
    >
      {active.map((tc) => (
        <view key={tc.toolCallId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <view
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: statusColors[tc.status ?? 'pending'] ?? '#94a3b8',
              flexShrink: 0,
            }}
          />
          <text style={{ color: '#555', fontSize: 13 }}>{tc.title}</text>
        </view>
      ))}
    </view>
  );
}
