import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { AgentEvent } from '@acme/shared-types';
import { AcpClientHandler } from './acp-client-handler.js';
import { PermissionResolver } from './permission-resolver.js';

function createMockSink() {
  const events: AgentEvent[] = [];
  return {
    next(event: AgentEvent) { events.push(event); },
    events,
  };
}

describe('AcpClientHandler', () => {
  let sink: ReturnType<typeof createMockSink>;
  let handler: AcpClientHandler;
  let tmpDir: string;

  beforeEach(async () => {
    sink = createMockSink();
    handler = new AcpClientHandler(sink, new PermissionResolver());
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'acp-test-'));
  });

  afterEach(async () => {
    handler.releaseAll();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('sessionUpdate', () => {
    it('maps update to AgentEvent and emits', async () => {
      await handler.sessionUpdate({
        sessionId: 'session-1',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Hello' },
          messageId: 'msg-1',
        } as never,
      });
      expect(sink.events).toHaveLength(1);
      expect(sink.events[0]!.type).toBe('messageDelta');
    });
  });

  describe('requestPermission', () => {
    it('delegates to permissionResolver', async () => {
      const promise = handler.requestPermission({
        sessionId: 'session-1',
        toolCall: { toolCallId: 'tc-1', title: 'Test' },
        options: [{ optionId: 'opt-1', name: 'Allow', kind: 'allow_once' }],
      } as never);

      expect(sink.events).toHaveLength(1);
      const event = sink.events[0]!;
      if (event.type !== 'permissionRequested') throw new Error('unexpected');

      handler.permissionResolver.resolve(event.requestId, 'opt-1');
      const result = await promise;
      expect(result.outcome).toEqual({ outcome: 'selected', optionId: 'opt-1' });
    });
  });

  describe('readTextFile', () => {
    it('reads file content', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fs.writeFile(filePath, 'hello world', 'utf-8');
      const result = await handler.readTextFile({ path: filePath, sessionId: 's1' });
      expect(result.content).toBe('hello world');
    });

    it('throws for non-existent path', async () => {
      await expect(
        handler.readTextFile({ path: path.join(tmpDir, 'nonexistent.txt'), sessionId: 's1' }),
      ).rejects.toThrow();
    });
  });

  describe('writeTextFile', () => {
    it('writes file content', async () => {
      const filePath = path.join(tmpDir, 'output.txt');
      await handler.writeTextFile({ path: filePath, content: 'written', sessionId: 's1' });
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('written');
    });
  });

  describe('terminal lifecycle', () => {
    it('createTerminal → terminalOutput → waitForExit', async () => {
      const { terminalId } = await handler.createTerminal({
        command: 'echo',
        args: ['hello'],
        sessionId: 's1',
      });
      expect(terminalId).toBeTruthy();

      const exit = await handler.waitForTerminalExit({ terminalId, sessionId: 's1' });
      expect(exit.exitCode).toBe(0);

      const output = await handler.terminalOutput({ terminalId, sessionId: 's1' });
      expect(output.output).toContain('hello');
      expect(output.truncated).toBe(false);
    });

    it('killTerminal terminates process', async () => {
      // Use a long-running command
      const { terminalId } = await handler.createTerminal({
        command: process.platform === 'win32' ? 'ping' : 'sleep',
        args: process.platform === 'win32' ? ['-n', '100'] : ['100'],
        sessionId: 's1',
      });

      await handler.killTerminal({ terminalId, sessionId: 's1' });
      const exit = await handler.waitForTerminalExit({ terminalId, sessionId: 's1' });
      // Killed process typically has non-zero exit code or signal
      expect(exit.exitCode !== undefined || exit.signal !== undefined).toBe(true);
    });

    it('releaseTerminal removes from internal map', async () => {
      const { terminalId } = await handler.createTerminal({
        command: 'echo',
        args: ['test'],
        sessionId: 's1',
      });

      await handler.releaseTerminal({ terminalId, sessionId: 's1' });

      // Accessing released terminal should throw
      await expect(
        handler.terminalOutput({ terminalId, sessionId: 's1' }),
      ).rejects.toThrow();
    });
  });
});
