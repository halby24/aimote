import React from 'react';
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
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '16px' }}>{label}</span>
      {configError && (
        <span
          style={{ fontSize: '13px', color: '#c00', maxWidth: '400px', textAlign: 'center' }}
        >
          {configError}
        </span>
      )}
    </div>
  );
}
