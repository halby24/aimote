import type { UsageViewModel } from '@acme/ui-common';

interface Props {
  usage: UsageViewModel;
}

export function UsageBar({ usage }: Props): React.ReactElement {
  const barColor =
    usage.percentage > 80 ? 'bg-error' : usage.percentage > 50 ? 'bg-warning' : 'bg-success';

  return (
    <view className="flex flex-row items-center gap-2">
      <view className="h-1.5 w-20 overflow-hidden rounded-sm bg-[#e5e7eb]">
        <view
          className={`h-full rounded-sm ${barColor}`}
          style={{ width: `${Math.min(usage.percentage, 100)}%` }}
        />
      </view>
      <text className="text-xs text-[#666]">{usage.percentage}%</text>
      {usage.costDisplay && <text className="text-xs text-text-muted">{usage.costDisplay}</text>}
    </view>
  );
}
