import { describe, it, expect } from 'vitest';
import type { AgentEvent } from '@acme/shared-types';
import {
  AgentSideConnection,
  type Agent,
  type Stream,
} from '@agentclientprotocol/sdk/dist/acp.js';
import { AcpStdioTransport } from './acp-stdio-transport.js';
import { createAgentRegistry } from './agent-registry.js';

function createInMemoryStreamPair(): { clientStream: Stream; agentStream: Stream } {
  const c2a = new TransformStream<unknown, unknown>();
  const a2c = new TransformStream<unknown, unknown>();

  return {
    clientStream: {
      writable: c2a.writable,
      readable: a2c.readable,
    } as Stream,
    agentStream: {
      writable: a2c.writable,
      readable: c2a.readable,
    } as Stream,
  };
}

function collectEvents(transport: AcpStdioTransport): AgentEvent[] {
  const events: AgentEvent[] = [];
  transport.events$.subscribe((e) => events.push(e));
  return events;
}

function setupMockAgent(
  agentStream: Stream,
  handlers?: Partial<Agent>,
) {
  const defaultHandlers: Agent = {
    async initialize() {
      return {
        protocolVersion: 1,
        agentInfo: { name: 'test-agent', version: '1.0.0' },
        agentCapabilities: {
          sessionCapabilities: { list: {} },
          loadSession: true,
        },
      };
    },
    async newSession() {
      return { sessionId: 'sid-1' };
    },
    async prompt() {
      return { stopReason: 'end_turn' as const };
    },
    async cancel() {},
    async authenticate() { return {}; },
    ...handlers,
  };

  return new AgentSideConnection(
    () => defaultHandlers,
    agentStream,
  );
}

describe('AcpStdioTransport', () => {
  describe('connect (spawn-based)', () => {
    it('emits error when agent not found in registry', async () => {
      const registry = createAgentRegistry();
      const transport = new AcpStdioTransport({ agentName: 'nonexistent', registry });
      const events = collectEvents(transport);
      await expect(transport.connect()).rejects.toThrow('not found');
      expect(events.some((e) => e.type === 'error')).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('emits disconnected status', async () => {
      const registry = createAgentRegistry([{ name: 'test', command: 'echo', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });
      const events = collectEvents(transport);
      await transport.disconnect();
      expect(events.some((e) => e.type === 'connectionStatus' && e.status === 'disconnected')).toBe(true);
    });
  });

  describe('approve', () => {
    it('does not throw for unknown requestId', async () => {
      const registry = createAgentRegistry();
      const transport = new AcpStdioTransport({ agentName: 'test', registry });
      await transport.approve('unknown-id', 'opt-1');
    });
  });

  describe('events$', () => {
    it('provides subscribable observable', () => {
      const registry = createAgentRegistry();
      const transport = new AcpStdioTransport({ agentName: 'test', registry });
      const sub = transport.events$.subscribe(() => {});
      expect(typeof sub.unsubscribe).toBe('function');
      sub.unsubscribe();
    });
  });

  describe('methods without connection', () => {
    it('startSession throws', async () => {
      const transport = new AcpStdioTransport({ agentName: 'x', registry: createAgentRegistry() });
      await expect(transport.startSession()).rejects.toThrow('Not connected');
    });

    it('sendUserMessage throws', async () => {
      const transport = new AcpStdioTransport({ agentName: 'x', registry: createAgentRegistry() });
      await expect(transport.sendUserMessage('s1', 'hi')).rejects.toThrow('Not connected');
    });

    it('cancel throws', async () => {
      const transport = new AcpStdioTransport({ agentName: 'x', registry: createAgentRegistry() });
      await expect(transport.cancel('s1')).rejects.toThrow('Not connected');
    });

    it('listSessions throws', async () => {
      const transport = new AcpStdioTransport({ agentName: 'x', registry: createAgentRegistry() });
      await expect(transport.listSessions()).rejects.toThrow('Not connected');
    });

    it('loadSession throws', async () => {
      const transport = new AcpStdioTransport({ agentName: 'x', registry: createAgentRegistry() });
      await expect(transport.loadSession('s1')).rejects.toThrow('Not connected');
    });
  });

  describe('integration via connectWithStream', () => {
    it('connect → ready', async () => {
      const { clientStream, agentStream } = createInMemoryStreamPair();
      const _agentConn = setupMockAgent(agentStream);

      const registry = createAgentRegistry([{ name: 'test', command: 'test', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });
      const events = collectEvents(transport);

      await transport.connectWithStream(clientStream);

      expect(events.some((e) => e.type === 'connectionStatus' && e.status === 'connecting')).toBe(true);
      expect(events.some((e) => e.type === 'connectionStatus' && e.status === 'ready')).toBe(true);

      await transport.disconnect();
    });

    it('startSession returns sessionId and emits sessionStarted', async () => {
      const { clientStream, agentStream } = createInMemoryStreamPair();
      const _agentConn = setupMockAgent(agentStream);

      const registry = createAgentRegistry([{ name: 'test', command: 'test', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });
      const events = collectEvents(transport);

      await transport.connectWithStream(clientStream);
      const { sessionId } = await transport.startSession({ workspace: '/tmp' });

      expect(sessionId).toBe('sid-1');
      expect(events.some((e) => e.type === 'sessionStarted')).toBe(true);

      await transport.disconnect();
    });

    it('sendUserMessage with agent_message_chunk → messageDelta + turnCompleted', async () => {
      const { clientStream, agentStream } = createInMemoryStreamPair();
      setupMockAgent(agentStream, {
        async prompt() {
          return { stopReason: 'end_turn' };
        },
      });

      const registry = createAgentRegistry([{ name: 'test', command: 'test', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });
      const events = collectEvents(transport);

      await transport.connectWithStream(clientStream);
      const { sessionId } = await transport.startSession();
      await transport.sendUserMessage(sessionId, 'hello');

      expect(events.some((e) => e.type === 'turnCompleted')).toBe(true);
      const turnEvent = events.find((e) => e.type === 'turnCompleted')!;
      if (turnEvent.type === 'turnCompleted') {
        expect(turnEvent.stopReason).toBe('end_turn');
      }

      await transport.disconnect();
    });

    it('sendUserMessage with streaming chunks → messageDelta events', async () => {
      const { clientStream, agentStream } = createInMemoryStreamPair();

      // Set up agent that sends session updates via its connection
      new AgentSideConnection(
        (conn) => ({
          async initialize() {
            return {
              protocolVersion: 1,
              agentInfo: { name: 'test-agent', version: '1.0.0' },
            };
          },
          async newSession() {
            return { sessionId: 'sid-1' };
          },
          async prompt(params) {
            await conn.sessionUpdate({
              sessionId: params.sessionId,
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'Chunk 1' },
                messageId: 'msg-a1',
              } as never,
            });
            await conn.sessionUpdate({
              sessionId: params.sessionId,
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: ' Chunk 2' },
                messageId: 'msg-a1',
              } as never,
            });
            return { stopReason: 'end_turn' as const };
          },
          async cancel() {},
          async authenticate() { return {}; },
        } as Agent),
        agentStream,
      );

      const registry = createAgentRegistry([{ name: 'test', command: 'test', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });
      const events = collectEvents(transport);

      await transport.connectWithStream(clientStream);
      const { sessionId } = await transport.startSession();
      await transport.sendUserMessage(sessionId, 'hello');

      const deltas = events.filter((e) => e.type === 'messageDelta');
      expect(deltas).toHaveLength(2);
      if (deltas[0]!.type === 'messageDelta') {
        expect(deltas[0]!.delta).toBe('Chunk 1');
      }
      if (deltas[1]!.type === 'messageDelta') {
        expect(deltas[1]!.delta).toBe(' Chunk 2');
      }

      await transport.disconnect();
    });

    it('sendUserMessage with tool_call → toolCallStarted', async () => {
      const { clientStream, agentStream } = createInMemoryStreamPair();

      new AgentSideConnection(
        (conn) => ({
          async initialize() {
            return {
              protocolVersion: 1,
              agentInfo: { name: 'test-agent', version: '1.0.0' },
            };
          },
          async newSession() { return { sessionId: 'sid-1' }; },
          async prompt(params) {
            await conn.sessionUpdate({
              sessionId: params.sessionId,
              update: {
                sessionUpdate: 'tool_call',
                toolCallId: 'tc-1',
                title: 'Read file',
                kind: 'read',
                status: 'in_progress',
              } as never,
            });
            await conn.sessionUpdate({
              sessionId: params.sessionId,
              update: {
                sessionUpdate: 'tool_call_update',
                toolCallId: 'tc-1',
                status: 'completed',
              } as never,
            });
            return { stopReason: 'end_turn' as const };
          },
          async cancel() {},
          async authenticate() { return {}; },
        } as Agent),
        agentStream,
      );

      const registry = createAgentRegistry([{ name: 'test', command: 'test', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });
      const events = collectEvents(transport);

      await transport.connectWithStream(clientStream);
      const { sessionId } = await transport.startSession();
      await transport.sendUserMessage(sessionId, 'read foo.ts');

      expect(events.some((e) => e.type === 'toolCallStarted')).toBe(true);
      expect(events.some((e) => e.type === 'toolCallUpdated')).toBe(true);

      await transport.disconnect();
    });

    it('sendUserMessage with plan → plan event', async () => {
      const { clientStream, agentStream } = createInMemoryStreamPair();

      new AgentSideConnection(
        (conn) => ({
          async initialize() {
            return {
              protocolVersion: 1,
              agentInfo: { name: 'test-agent', version: '1.0.0' },
            };
          },
          async newSession() { return { sessionId: 'sid-1' }; },
          async prompt(params) {
            await conn.sessionUpdate({
              sessionId: params.sessionId,
              update: {
                sessionUpdate: 'plan',
                entries: [
                  { content: 'Step 1', priority: 'high', status: 'pending' },
                ],
              } as never,
            });
            return { stopReason: 'end_turn' as const };
          },
          async cancel() {},
          async authenticate() { return {}; },
        } as Agent),
        agentStream,
      );

      const registry = createAgentRegistry([{ name: 'test', command: 'test', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });
      const events = collectEvents(transport);

      await transport.connectWithStream(clientStream);
      const { sessionId } = await transport.startSession();
      await transport.sendUserMessage(sessionId, 'plan something');

      const planEvents = events.filter((e) => e.type === 'plan');
      expect(planEvents).toHaveLength(1);

      await transport.disconnect();
    });

    it('listSessions returns sessions from agent', async () => {
      const { clientStream, agentStream } = createInMemoryStreamPair();

      new AgentSideConnection(
        () => ({
          async initialize() {
            return {
              protocolVersion: 1,
              agentInfo: { name: 'test-agent', version: '1.0.0' },
              agentCapabilities: {
                sessionCapabilities: { list: {} },
              },
            };
          },
          async newSession() { return { sessionId: 'sid-1' }; },
          async listSessions() {
            return {
              sessions: [
                { sessionId: 'sid-a', title: 'Session A', cwd: '/tmp' },
                { sessionId: 'sid-b' },
              ],
            };
          },
          async prompt() { return { stopReason: 'end_turn' as const }; },
          async cancel() {},
          async authenticate() { return {}; },
        } as Agent),
        agentStream,
      );

      const registry = createAgentRegistry([{ name: 'test', command: 'test', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });

      await transport.connectWithStream(clientStream);
      const result = await transport.listSessions();

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0]!.sessionId).toBe('sid-a');
      expect(result.sessions[0]!.title).toBe('Session A');

      await transport.disconnect();
    });

    it('listSessions throws when capability not available', async () => {
      const { clientStream, agentStream } = createInMemoryStreamPair();

      new AgentSideConnection(
        () => ({
          async initialize() {
            return {
              protocolVersion: 1,
              agentInfo: { name: 'test-agent', version: '1.0.0' },
            };
          },
          async newSession() { return { sessionId: 'sid-1' }; },
          async prompt() { return { stopReason: 'end_turn' as const }; },
          async cancel() {},
          async authenticate() { return {}; },
        } as Agent),
        agentStream,
      );

      const registry = createAgentRegistry([{ name: 'test', command: 'test', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });

      await transport.connectWithStream(clientStream);
      await expect(transport.listSessions()).rejects.toThrow('does not support session listing');

      await transport.disconnect();
    });

    it('loadSession throws when capability not available', async () => {
      const { clientStream, agentStream } = createInMemoryStreamPair();

      new AgentSideConnection(
        () => ({
          async initialize() {
            return {
              protocolVersion: 1,
              agentInfo: { name: 'test-agent', version: '1.0.0' },
            };
          },
          async newSession() { return { sessionId: 'sid-1' }; },
          async prompt() { return { stopReason: 'end_turn' as const }; },
          async cancel() {},
          async authenticate() { return {}; },
        } as Agent),
        agentStream,
      );

      const registry = createAgentRegistry([{ name: 'test', command: 'test', args: [] }]);
      const transport = new AcpStdioTransport({ agentName: 'test', registry });

      await transport.connectWithStream(clientStream);
      await expect(transport.loadSession('sid-1')).rejects.toThrow('does not support session loading');

      await transport.disconnect();
    });
  });
});
