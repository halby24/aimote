import { describe, it, expect } from 'vitest';
import { PermissionResolver } from './permission-resolver.js';
import type { AgentEvent } from '@acme/shared-types';
import type { RequestPermissionRequest } from '@agentclientprotocol/sdk/dist/acp.js';

function createMockEmitter() {
  const events: AgentEvent[] = [];
  return {
    emit(event: AgentEvent) { events.push(event); },
    events,
  };
}

function makePermRequest(overrides?: Partial<RequestPermissionRequest>): RequestPermissionRequest {
  return {
    sessionId: 'session-1',
    toolCall: {
      toolCallId: 'tc-1',
      title: 'Write file',
      status: 'pending',
    },
    options: [
      { optionId: 'opt-allow', name: 'Allow once', kind: 'allow_once' },
      { optionId: 'opt-reject', name: 'Reject', kind: 'reject_once' },
    ],
    ...overrides,
  } as RequestPermissionRequest;
}

describe('PermissionResolver', () => {
  it('emits permissionRequested on request', () => {
    const resolver = new PermissionResolver();
    const emitter = createMockEmitter();
    void resolver.request(makePermRequest(), emitter);

    expect(emitter.events).toHaveLength(1);
    expect(emitter.events[0]!.type).toBe('permissionRequested');
  });

  it('promise resolves when resolve() is called', async () => {
    const resolver = new PermissionResolver();
    const emitter = createMockEmitter();
    const promise = resolver.request(makePermRequest(), emitter);

    // Extract requestId from emitted event
    const event = emitter.events[0]!;
    if (event.type !== 'permissionRequested') throw new Error('unexpected');
    const requestId = event.requestId;

    resolver.resolve(requestId, 'opt-allow');
    const response = await promise;
    expect(response.outcome).toEqual({ outcome: 'selected', optionId: 'opt-allow' });
  });

  it('unknown requestId is no-op', () => {
    const resolver = new PermissionResolver();
    // Should not throw
    resolver.resolve('nonexistent', 'opt-allow');
  });

  it('cancelAll resolves all pending as cancelled', async () => {
    const resolver = new PermissionResolver();
    const emitter = createMockEmitter();
    const p1 = resolver.request(makePermRequest(), emitter);
    const p2 = resolver.request(makePermRequest(), emitter);

    expect(resolver.pendingCount).toBe(2);
    resolver.cancelAll();
    expect(resolver.pendingCount).toBe(0);

    const r1 = await p1;
    const r2 = await p2;
    expect(r1.outcome).toEqual({ outcome: 'cancelled' });
    expect(r2.outcome).toEqual({ outcome: 'cancelled' });
  });

  it('emitted event contains correct payload structure', () => {
    const resolver = new PermissionResolver();
    const emitter = createMockEmitter();
    void resolver.request(makePermRequest(), emitter);

    const event = emitter.events[0]!;
    if (event.type !== 'permissionRequested') throw new Error('unexpected');
    expect(event.payload.options).toHaveLength(2);
    expect(event.payload.options[0]).toEqual({
      optionId: 'opt-allow',
      name: 'Allow once',
      kind: 'allow_once',
    });
    expect(event.payload.toolCall).toEqual({
      toolCallId: 'tc-1',
      title: 'Write file',
      status: 'pending',
    });
  });
});
