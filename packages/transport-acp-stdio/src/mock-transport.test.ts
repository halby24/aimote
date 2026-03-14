import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AcpStdioMockTransport } from './mock-transport.js';

describe('AcpStdioMockTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connect', () => {
    it('emits connecting then ready', async () => {
      const transport = new AcpStdioMockTransport();
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
      const transport = new AcpStdioMockTransport();
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
    it('returns incrementing session IDs', async () => {
      const transport = new AcpStdioMockTransport();
      const p = transport.connect();
      await vi.runAllTimersAsync();
      await p;

      const p1 = transport.startSession();
      await vi.runAllTimersAsync();
      const r1 = await p1;

      const p2 = transport.startSession();
      await vi.runAllTimersAsync();
      const r2 = await p2;

      expect(r1.sessionId).toBe('session-1');
      expect(r2.sessionId).toBe('session-2');
    });

    it('throws if not connected', async () => {
      const transport = new AcpStdioMockTransport();
      await expect(transport.startSession()).rejects.toThrow('Not connected');
    });

    it('emits sessionStarted event', async () => {
      const transport = new AcpStdioMockTransport();
      const p = transport.connect();
      await vi.runAllTimersAsync();
      await p;

      let sessionStarted = false;
      transport.subscribe((e) => {
        if (e.type === 'sessionStarted') sessionStarted = true;
      });
      const sp = transport.startSession();
      await vi.runAllTimersAsync();
      await sp;
      expect(sessionStarted).toBe(true);
    });
  });

  describe('sendUserMessage', () => {
    it('streams messageDelta events and emits messageCompleted', async () => {
      const transport = new AcpStdioMockTransport();
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

      await transport.sendUserMessage(sessionId, 'hello');
      await vi.runAllTimersAsync();

      expect(deltas.length).toBeGreaterThan(0);
      expect(completed).toBe(true);
      expect(deltas.join('')).toBeTruthy();
    });

    it('throws if not connected', async () => {
      const transport = new AcpStdioMockTransport();
      await expect(transport.sendUserMessage('s1', 'hi')).rejects.toThrow('Not connected');
    });
  });

  describe('subscribe', () => {
    it('returned unsubscribe stops event delivery', async () => {
      const transport = new AcpStdioMockTransport();
      const listener = vi.fn();
      const unsub = transport.subscribe(listener);
      unsub();
      const p = transport.connect();
      await vi.runAllTimersAsync();
      await p;
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
