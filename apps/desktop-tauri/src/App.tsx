import React, { useMemo } from 'react';
import { ChatScreen } from '@acme/ui-react-web';
import { ChatController } from '@acme/app-core';
import { TauriIpcTransport } from '@acme/transport-tauri-ipc';

export function App(): React.ReactElement {
  const controller = useMemo(
    () =>
      new ChatController({
        transport: new TauriIpcTransport(),
      }),
    [],
  );

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fafafa',
      }}
    >
      <ChatScreen controller={controller} />
    </div>
  );
}
