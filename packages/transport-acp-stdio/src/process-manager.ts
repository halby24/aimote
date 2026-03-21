import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { ndJsonStream, type Stream } from '@agentclientprotocol/sdk/dist/stream.js';
import type { AgentConfig } from './agent-registry.js';

export interface SpawnResult {
  stream: Stream;
  kill(): void;
  exitPromise: Promise<number | null>;
  pid?: number;
}

export type SpawnFn = (command: string, args: string[], options: SpawnOptions) => ChildProcess;

export interface ProcessManagerOptions {
  spawnFn?: SpawnFn;
}

export function spawnAgent(config: AgentConfig, options?: ProcessManagerOptions): SpawnResult {
  const doSpawn = options?.spawnFn ?? nodeSpawn;

  const proc = doSpawn(config.command, [...config.args], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: config.env ? { ...process.env, ...config.env } : process.env,
  });

  if (!proc.stdin || !proc.stdout) {
    throw new Error(`Failed to spawn agent "${config.name}": stdio not available`);
  }

  const writable = Writable.toWeb(proc.stdin) as WritableStream<Uint8Array>;
  const readable = Readable.toWeb(proc.stdout) as ReadableStream<Uint8Array>;
  const stream = ndJsonStream(writable, readable);

  const exitPromise = new Promise<number | null>((resolve, reject) => {
    proc.on('exit', (code) => resolve(code));
    proc.on('error', (err) => reject(err));
  });

  const result: SpawnResult = {
    stream,
    kill() { proc.kill(); },
    exitPromise,
  };
  if (proc.pid !== undefined) {
    result.pid = proc.pid;
  }
  return result;
}
