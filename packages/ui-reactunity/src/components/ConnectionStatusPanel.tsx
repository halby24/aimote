import type { ConnectionStatus } from '@acme/shared-types';

interface Props {
  connectionStatus: ConnectionStatus;
  configError: string | null;
}

const statusLabels: Record<string, string> = {
  idle: '未接続',
  connecting: '接続中...',
  error: '接続エラー',
  disconnected: '切断されました',
};

export function ConnectionStatusPanel({
  connectionStatus,
  configError,
}: Props): React.ReactElement {
  const label = statusLabels[connectionStatus] ?? connectionStatus;

  return (
    <view
      style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <text style={{ fontSize: 16, color: '#888' }}>{label}</text>
      {configError && (
        <text style={{ fontSize: 13, color: '#c00', maxWidth: 400, textAlign: 'center' }}>
          {configError}
        </text>
      )}
    </view>
  );
}
