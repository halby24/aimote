import * as fs from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Client, RequestPermissionRequest, RequestPermissionResponse, SessionNotification } from '@agentclientprotocol/sdk/dist/acp.js';
import { RequestError } from '@agentclientprotocol/sdk/dist/acp.js';
import type { AgentEvent } from '@acme/shared-types';
import { mapSessionUpdate } from './session-update-mapper.js';
import { PermissionResolver } from './permission-resolver.js';

type Emitter = { emit(event: AgentEvent): void };

interface TerminalEntry {
  process: ChildProcess;
  output: string;
  exitCode: number | null;
  exitSignal: string | null;
  exitPromise: Promise<void>;
  exitResolve: () => void;
}

export class AcpClientHandler implements Client {
  private readonly terminals = new Map<string, TerminalEntry>();

  constructor(
    private readonly emitter: Emitter,
    readonly permissionResolver: PermissionResolver,
  ) {}

  async sessionUpdate(params: SessionNotification): Promise<void> {
    const events = mapSessionUpdate(params.sessionId, params.update);
    for (const event of events) {
      this.emitter.emit(event);
    }
  }

  async requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    return this.permissionResolver.request(params, this.emitter);
  }

  async readTextFile(params: { path: string; sessionId: string }): Promise<{ content: string }> {
    try {
      const content = await fs.readFile(params.path, 'utf-8');
      return { content };
    } catch {
      throw RequestError.resourceNotFound(params.path);
    }
  }

  async writeTextFile(params: { path: string; content: string; sessionId: string }): Promise<Record<string, never>> {
    await fs.writeFile(params.path, params.content, 'utf-8');
    return {};
  }

  async createTerminal(params: { command: string; args?: string[]; cwd?: string; sessionId: string }): Promise<{ terminalId: string }> {
    const terminalId = randomUUID();
    let exitResolve!: () => void;
    const exitPromise = new Promise<void>((resolve) => { exitResolve = resolve; });

    const proc = spawn(params.command, params.args ?? [], {
      cwd: params.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    const entry: TerminalEntry = {
      process: proc,
      output: '',
      exitCode: null,
      exitSignal: null,
      exitPromise,
      exitResolve,
    };

    proc.stdout?.on('data', (chunk: Buffer) => { entry.output += chunk.toString(); });
    proc.stderr?.on('data', (chunk: Buffer) => { entry.output += chunk.toString(); });
    proc.on('exit', (code, signal) => {
      entry.exitCode = code;
      entry.exitSignal = signal;
      exitResolve();
    });

    this.terminals.set(terminalId, entry);
    return { terminalId };
  }

  async terminalOutput(params: { terminalId: string; sessionId: string }): Promise<{ output: string; truncated: boolean; exitStatus?: { exitCode?: number; signal?: string } }> {
    const entry = this.terminals.get(params.terminalId);
    if (!entry) throw RequestError.resourceNotFound(params.terminalId);
    const result: { output: string; truncated: boolean; exitStatus?: { exitCode?: number; signal?: string } } = {
      output: entry.output,
      truncated: false,
    };
    if (entry.exitCode !== null || entry.exitSignal !== null) {
      result.exitStatus = {
        ...(entry.exitCode !== null && { exitCode: entry.exitCode }),
        ...(entry.exitSignal !== null && { signal: entry.exitSignal }),
      };
    }
    return result;
  }

  async waitForTerminalExit(params: { terminalId: string; sessionId: string }): Promise<{ exitCode?: number; signal?: string }> {
    const entry = this.terminals.get(params.terminalId);
    if (!entry) throw RequestError.resourceNotFound(params.terminalId);
    await entry.exitPromise;
    return {
      ...(entry.exitCode !== null && { exitCode: entry.exitCode }),
      ...(entry.exitSignal !== null && { signal: entry.exitSignal }),
    };
  }

  async killTerminal(params: { terminalId: string; sessionId: string }): Promise<Record<string, never>> {
    const entry = this.terminals.get(params.terminalId);
    if (!entry) throw RequestError.resourceNotFound(params.terminalId);
    entry.process.kill();
    return {};
  }

  async releaseTerminal(params: { terminalId: string; sessionId: string }): Promise<Record<string, never>> {
    const entry = this.terminals.get(params.terminalId);
    if (entry) {
      entry.process.kill();
      this.terminals.delete(params.terminalId);
    }
    return {};
  }

  releaseAll(): void {
    for (const [id, entry] of this.terminals) {
      entry.process.kill();
      this.terminals.delete(id);
    }
  }
}
