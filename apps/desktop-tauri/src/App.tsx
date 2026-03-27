import React, { useMemo } from 'react';
import { ChatScreen } from '@acme/ui-react-web';
import { ChatController } from '@acme/app-core';
import { WsTransport } from '@acme/transport-ws';

export function App(): React.ReactElement {
  const controller = useMemo(() => {
    const port =
      (window as unknown as Record<string, unknown>).__AIMOTE_WS_PORT__ ?? 3001;
    return new ChatController({
      transport: new WsTransport({ url: `ws://localhost:${port}` }),
    });
  }, []);

  return (
    <div className="flex h-screen flex-col bg-surface-subtle">
      <ChatScreen controller={controller} />
    </div>
  );
}
