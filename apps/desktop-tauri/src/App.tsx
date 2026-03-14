import React, { useMemo } from 'react';
import { ChatScreen } from '@acme/ui-react-web';
import { ChatController } from '@acme/app-core';
import { AcpStdioMockTransport } from '@acme/transport-acp-stdio';

export function App(): React.ReactElement {
  const controller = useMemo(
    () =>
      new ChatController({
        transport: new AcpStdioMockTransport(),
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
