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
    <view className="border-t border-border bg-surface-muted px-4 py-2">
      <text className="mb-1 text-[13px] font-semibold text-text-secondary">Plan</text>
      {plan.entries.map((entry, i) => (
        <view
          key={i}
          className={`flex flex-row items-center gap-1.5 py-0.5 ${
            entry.status === 'completed' ? 'text-success' : 'text-text'
          }`}
        >
          <text className="text-[13px]">{statusIcon[entry.status] ?? '\u25cb'}</text>
          <text className="text-[13px]">{entry.content}</text>
        </view>
      ))}
    </view>
  );
}
