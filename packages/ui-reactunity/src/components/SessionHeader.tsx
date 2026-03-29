import type { UsageViewModel } from '@acme/ui-common';
import { UsageBar } from './UsageBar.js';

interface Props {
  title: string | null;
  currentMode: string | null;
  usage: UsageViewModel | null;
  connectionStatus: string;
  isTurnActive: boolean;
  onCancel: () => void;
  onSettingsClick: () => void;
  configError?: string | null;
}

const statusColorClass: Record<string, string> = {
  ready: 'text-success',
  connecting: 'text-warning',
  error: 'text-error',
};

const statusDotClass: Record<string, string> = {
  ready: 'bg-success',
  connecting: 'bg-warning',
  error: 'bg-error',
};

const statusLabelMap: Record<string, string> = {
  ready: '接続中',
  connecting: '接続しています...',
  error: 'エラー',
};

export function SessionHeader({
  title,
  currentMode,
  usage,
  connectionStatus,
  isTurnActive,
  onCancel,
  onSettingsClick,
  configError,
}: Props): React.ReactElement {
  const label = connectionStatus === 'error' && configError
    ? configError
    : (statusLabelMap[connectionStatus] ?? '未接続');

  return (
    <view className="flex flex-row items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <view className="flex min-w-0 flex-row items-center gap-2">
        <text className="overflow-hidden whitespace-nowrap text-lg font-semibold text-text">
          {title ?? 'AI チャット'}
        </text>
        {currentMode && (
          <text className="rounded bg-surface-indigo-subtle px-1.5 py-0.5 text-[11px] text-indigo-700">
            {currentMode}
          </text>
        )}
      </view>
      <view className="flex shrink-0 flex-row items-center gap-2">
        {usage && <UsageBar usage={usage} />}
        <view
          className={`flex flex-row items-center gap-1 ${
            statusColorClass[connectionStatus] ?? 'text-status-idle'
          }`}
        >
          <view
            className={`h-2 w-2 rounded-full ${
              statusDotClass[connectionStatus] ?? 'bg-status-idle'
            }`}
          />
          <text className="text-xs text-text-secondary">{label}</text>
        </view>
        <button
          onClick={onSettingsClick}
          className="rounded border border-border bg-surface px-2 py-1 text-base text-text"
        >
          {'\u2699'}
        </button>
        {isTurnActive ? (
          <button
            onClick={onCancel}
            className="rounded border border-border bg-surface px-2.5 py-1 text-xs text-text"
          >
            キャンセル
          </button>
        ) : null}
      </view>
    </view>
  );
}
