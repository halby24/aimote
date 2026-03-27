import { render } from '@reactunity/renderer';
import { ChatController } from '@acme/app-core';
import { WsTransport } from '@acme/transport-ws';
import { ChatScreen } from './components/ChatScreen.js';

const Globals = (globalThis as Record<string, unknown>).Globals as
  | Record<string, unknown>
  | undefined;
const relayUrl = (Globals?.relayUrl as string) ?? 'ws://localhost:3001';

const transport = new WsTransport({ url: relayUrl });
const controller = new ChatController({ transport });

render(<ChatScreen controller={controller} />);
