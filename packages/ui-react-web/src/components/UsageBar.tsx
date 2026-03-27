import React from 'react';
import type { UsageViewModel } from '@acme/ui-common';

interface Props {
  usage: UsageViewModel;
}

export function UsageBar({ usage }: Props): React.ReactElement {
  const barColor =
    usage.percentage > 80 ? 'bg-error' : usage.percentage > 50 ? 'bg-warning' : 'bg-success';

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="h-1.5 w-20 overflow-hidden rounded-sm bg-[#e5e7eb]">
        <div
          className={`h-full rounded-sm transition-[width] duration-300 ease-in-out ${barColor}`}
          style={{ width: `${Math.min(usage.percentage, 100)}%` }}
        />
      </div>
      <span className="text-[#666]">{usage.percentage}%</span>
      {usage.costDisplay && <span className="text-text-muted">{usage.costDisplay}</span>}
    </div>
  );
}
