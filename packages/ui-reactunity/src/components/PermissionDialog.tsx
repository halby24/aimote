import type { PermissionViewModel } from '@acme/ui-common';

interface Props {
  permission: PermissionViewModel;
  onApprove: (requestId: string, optionId: string) => void;
}

export function PermissionDialog({ permission, onApprove }: Props): React.ReactElement {
  return (
    <view className="flex flex-col gap-2 border-t border-warning bg-surface-warning-subtle px-4 py-3">
      <text className="text-sm font-semibold text-text-warning-emphasis">
        {permission.description}
      </text>
      <view className="flex flex-row flex-wrap gap-2">
        {permission.options.map((opt) => (
          <button
            key={opt.optionId}
            onClick={() => onApprove(permission.requestId, opt.optionId)}
            className={`rounded-md border border-border-input px-3.5 py-1.5 text-[13px] text-white ${
              opt.kind === 'allow_once' || opt.kind === 'allow_always'
                ? 'bg-success'
                : 'bg-error'
            }`}
          >
            {opt.name}
          </button>
        ))}
      </view>
    </view>
  );
}
