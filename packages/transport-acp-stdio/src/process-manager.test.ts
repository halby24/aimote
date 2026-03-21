import { describe, it, expect, vi } from 'vitest';
import { EventEmitter as NodeEventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcess } from 'node:child_process';
import { spawnAgent, type SpawnFn } from './process-manager.js';
import type { AgentConfig } from './agent-registry.js';

function createMockProcess(): ChildProcess {
  const proc = new NodeEventEmitter() as unknown as ChildProcess;
  Object.defineProperty(proc, 'stdin', { value: new PassThrough(), writable: true });
  Object.defineProperty(proc, 'stdout', { value: new PassThrough(), writable: true });
  Object.defineProperty(proc, 'stderr', { value: new PassThrough(), writable: true });
  Object.defineProperty(proc, 'pid', { value: 12345, writable: true });
  Object.defineProperty(proc, 'kill', {
    value: vi.fn(() => {
      proc.emit('exit', null, 'SIGTERM');
      return true;
    }),
    writable: true,
  });
  return proc;
}

const testConfig: AgentConfig = {
  name: 'test-agent',
  command: 'echo',
  args: ['hello'],
};

describe('spawnAgent', () => {
  it('creates a stream from mock process', () => {
    const mockProc = createMockProcess();
    const spawnFn: SpawnFn = vi.fn(() => mockProc);

    const result = spawnAgent(testConfig, { spawnFn });

    expect(result.stream).toBeDefined();
    expect(result.stream.readable).toBeDefined();
    expect(result.stream.writable).toBeDefined();
    expect(result.pid).toBe(12345);
    expect(spawnFn).toHaveBeenCalledWith(
      'echo',
      ['hello'],
      expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
    );
  });

  it('kill() calls process.kill()', () => {
    const mockProc = createMockProcess();
    const spawnFn: SpawnFn = vi.fn(() => mockProc);

    const result = spawnAgent(testConfig, { spawnFn });
    result.kill();

    expect(mockProc.kill).toHaveBeenCalled();
  });

  it('exitPromise resolves on process exit', async () => {
    const mockProc = createMockProcess();
    const spawnFn: SpawnFn = vi.fn(() => mockProc);

    const result = spawnAgent(testConfig, { spawnFn });

    // Simulate process exit
    mockProc.emit('exit', 0, null);
    const code = await result.exitPromise;
    expect(code).toBe(0);
  });

  it('exitPromise rejects on spawn error', async () => {
    const mockProc = createMockProcess();
    const spawnFn: SpawnFn = vi.fn(() => mockProc);

    const result = spawnAgent(testConfig, { spawnFn });

    mockProc.emit('error', new Error('spawn failed'));
    await expect(result.exitPromise).rejects.toThrow('spawn failed');
  });

  it('throws if stdin/stdout not available', () => {
    const mockProc = new NodeEventEmitter() as unknown as ChildProcess;
    Object.defineProperty(mockProc, 'stdin', { value: null, writable: true });
    Object.defineProperty(mockProc, 'stdout', { value: null, writable: true });
    const spawnFn: SpawnFn = vi.fn(() => mockProc);

    expect(() => spawnAgent(testConfig, { spawnFn })).toThrow('stdio not available');
  });
});
