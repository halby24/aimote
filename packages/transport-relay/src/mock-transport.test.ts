import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RelayMockTransport } from './mock-transport.js';

describe('RelayMockTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('uses default URL', () => {
      const transport = new RelayMockTransport();
      expect(transport.getUrl()).toBe('ws://localhost:3001');
    });

    it('accepts a custom URL', () => {
      const transport = new RelayMockTransport({ url: 'ws://example.com:9000' });
      expect(transport.getUrl()).toBe('ws://example.com:9000');
    });
  });

  describe('connect', () => {
    it('emits connecting then ready', async () => {
      const transport = new RelayMockTransport();
      const statuses: string[] = [];
      transport.subscribe((e) => {
        if (e.type === 'connectionStatus') statuses.push(e.status);
      });
      const p = transport.connect();
      await vi.runAllTimersAsync();
      await p;
      expect(statuses).toEqual(['connecting', 'ready']);
    });
  });

  describe('disconnect', () => {
    it('emits disconnected', async () => {
      const transport = new RelayMockTransport();
      const p = transport.connect();
      await vi.runAllTimersAsync();
      await p;

      const statuses: string[] = [];
      transport.subscribe((e) => {
        if (e.type === 'connectionStatus') statuses.push(e.status);
      });
      await transport.disconnect();
      expect(statuses).toEqual(['disconnected']);
    });
  });

  describe('startSession', () => {
    it('returns relay-prefixed incrementing session IDs', async () => {
      const transport = new RelayMockTransport();
      const p = transport.connect();
      await vi.runAllTimersAsync();
      await p;

      const p1 = transport.startSession();
      await vi.runAllTimersAsync();
      const r1 = await p1;

      const p2 = transport.startSession();
      await vi.runAllTimersAsync();
      const r2 = await p2;

      expect(r1.sessionId).toBe('relay-session-1');
      expect(r2.sessionId).toBe('relay-session-2');
    });

    it('throws if not connected', async () => {
      const transport = new RelayMockTransport();
      await expect(transport.startSession()).rejects.toThrow('Not connected');
    });
  });

  describe('sendUserMessage', () => {
    it('streams messageDelta events and emits messageCompleted', async () => {
      const transport = new RelayMockTransport();
      const connectP = transport.connect();
      await vi.runAllTimersAsync();
      await connectP;

      const startP = transport.startSession();
      await vi.runAllTimersAsync();
      const { sessionId } = await startP;

      const deltas: string[] = [];
      let completed = false;
      transport.subscribe((e) => {
        if (e.type === 'messageDelta') deltas.push(e.delta);
        if (e.type === 'messageCompleted') completed = true;
      });

      await transport.sendUserMessage(sessionId, 'test');
      await vi.runAllTimersAsync();

      expect(deltas.length).toBeGreaterThan(0);
      expect(completed).toBe(true);
      expect(deltas.join('')).toContain('[Relay]');
    });

    it('throws if not connected', async () => {
      const transport = new RelayMockTransport();
      await expect(transport.sendUserMessage('s1', 'hi')).rejects.toThrow('Not connected');
    });
  });
});
