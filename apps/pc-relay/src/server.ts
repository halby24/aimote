import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'node:http';

const PORT = Number(process.env['PORT'] ?? 3001);

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

log('info', `PC relay server starting on port ${PORT}`);

/**
 * WebSocket イベント仕様 (transport-relay が接続する想定)
 *
 * クライアント → サーバ (JSON):
 *   { type: 'connect' }
 *   { type: 'startSession', workspace?: string }
 *   { type: 'sendMessage', sessionId: string, text: string }
 *   { type: 'cancel', sessionId: string }
 *   { type: 'disconnect' }
 *
 * サーバ → クライアント (JSON, AgentEvent 準拠):
 *   { type: 'connectionStatus', status: 'connecting' | 'ready' | 'disconnected' }
 *   { type: 'sessionStarted', sessionId: string }
 *   { type: 'messageDelta', sessionId: string, messageId: string, delta: string }
 *   { type: 'messageCompleted', sessionId: string, messageId: string }
 *   { type: 'error', code: string, message: string }
 */
wss.on('connection', (ws: WebSocket, req) => {
  const clientId = Math.random().toString(36).slice(2, 8);
  log('info', `Client connected: ${clientId} from ${req.socket.remoteAddress ?? 'unknown'}`);

  send(ws, { type: 'connectionStatus', status: 'ready' });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString()) as Record<string, unknown>;
      log('debug', `[${clientId}] recv: ${JSON.stringify(msg)}`);
      handleMessage(ws, clientId, msg);
    } catch (err) {
      log('error', `[${clientId}] Invalid message: ${String(err)}`);
      send(ws, { type: 'error', code: 'INVALID_MESSAGE', message: 'JSON parse error' });
    }
  });

  ws.on('close', () => {
    log('info', `Client disconnected: ${clientId}`);
  });

  ws.on('error', (err) => {
    log('error', `[${clientId}] WebSocket error: ${String(err)}`);
  });
});

let sessionCounter = 0;

function handleMessage(
  ws: WebSocket,
  clientId: string,
  msg: Record<string, unknown>,
): void {
  switch (msg['type']) {
    case 'startSession': {
      const sessionId = `relay-${clientId}-${++sessionCounter}`;
      log('info', `[${clientId}] Session started: ${sessionId}`);
      send(ws, { type: 'sessionStarted', sessionId });
      break;
    }
    case 'sendMessage': {
      const sessionId = String(msg['sessionId'] ?? '');
      const text = String(msg['text'] ?? '');
      log('info', `[${clientId}] Message received: "${text.slice(0, 50)}"`);
      // Echo response (stub)
      void echoResponse(ws, sessionId, text);
      break;
    }
    case 'cancel': {
      log('info', `[${clientId}] Cancel requested`);
      break;
    }
    case 'disconnect': {
      log('info', `[${clientId}] Client requested disconnect`);
      ws.close();
      break;
    }
    default:
      log('debug', `[${clientId}] Unknown message type: ${String(msg['type'])}`);
  }
}

let messageCounter = 0;

async function echoResponse(ws: WebSocket, sessionId: string, text: string): Promise<void> {
  const messageId = `relay-msg-${++messageCounter}`;
  const response = `[PC Relay] "${text}" の応答: AIエージェントが処理中です。`;
  const chunks = response.match(/.{1,4}/g) ?? [];
  for (const chunk of chunks) {
    await delay(80);
    if (ws.readyState !== WebSocket.OPEN) return;
    send(ws, { type: 'messageDelta', sessionId, messageId, delta: chunk });
  }
  await delay(50);
  if (ws.readyState === WebSocket.OPEN) {
    send(ws, { type: 'messageCompleted', sessionId, messageId });
  }
}

function send(ws: WebSocket, data: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type LogLevel = 'info' | 'debug' | 'error' | 'warn';

function log(level: LogLevel, message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

httpServer.listen(PORT, () => {
  log('info', `HTTP server listening on http://localhost:${PORT}`);
  log('info', `WebSocket server ready on ws://localhost:${PORT}`);
  log('info', `Health check: http://localhost:${PORT}/health`);
});
