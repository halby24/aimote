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
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-muted">
      <span className="text-base">{label}</span>
      {configError && (
        <span className="max-w-[400px] text-center text-[13px] text-[#c00]">
          {configError}
        </span>
      )}
    </div>
  );
}
