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
    <view className="flex flex-col gap-1 border-b border-border bg-surface-subtle px-4 py-2">
      {active.map((tc) => (
        <view key={tc.toolCallId} className="flex flex-row items-center gap-2">
          <view
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              statusClasses[tc.status ?? 'pending'] ?? 'bg-[#94a3b8]'
            }`}
          />
          <text className="text-[13px] text-text-secondary">{tc.title}</text>
        </view>
      ))}
    </view>
  );
}
