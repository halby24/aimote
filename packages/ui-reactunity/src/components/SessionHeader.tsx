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

const statusColorMap: Record<string, string> = {
  ready: '#22c55e',
  connecting: '#f59e0b',
  error: '#ef4444',
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
  const color = statusColorMap[connectionStatus] ?? '#94a3b8';
  const label = connectionStatus === 'error' && configError
    ? configError
    : (statusLabelMap[connectionStatus] ?? '未接続');

  return (
    <view
      style={{
        padding: 12,
        paddingLeft: 16,
        paddingRight: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        gap: 12,
      }}
    >
      <view style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <text
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: '600',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {title ?? 'AI チャット'}
        </text>
        {currentMode && (
          <text
            style={{
              fontSize: 11,
              padding: 2,
              paddingLeft: 6,
              paddingRight: 6,
              borderRadius: 4,
              backgroundColor: '#e0e7ff',
              color: '#4338ca',
            }}
          >
            {currentMode}
          </text>
        )}
      </view>
      <view style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {usage && <UsageBar usage={usage} />}
        <view style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <view
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: color,
            }}
          />
          <text style={{ fontSize: 12, color }}>{label}</text>
        </view>
        <button
          onClick={onSettingsClick}
          style={{
            padding: 4,
            paddingLeft: 8,
            paddingRight: 8,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: '#ccc',
            backgroundColor: '#fff',
            fontSize: 16,
          }}
        >
          {'\u2699'}
        </button>
        {isTurnActive ? (
          <button
            onClick={onCancel}
            style={{
              padding: 4,
              paddingLeft: 10,
              paddingRight: 10,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: '#ccc',
              backgroundColor: '#fff',
              fontSize: 12,
            }}
          >
            キャンセル
          </button>
        ) : null}
      </view>
    </view>
  );
}
