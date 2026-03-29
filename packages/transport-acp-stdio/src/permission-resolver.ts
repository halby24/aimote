import type { AgentEvent, PermissionOption } from '@acme/shared-types';
import { makeSessionId, makeRequestId } from '@acme/shared-types';
import type {
  RequestPermissionRequest,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk/dist/acp.js';

type EventSink = { next(event: AgentEvent): void };

interface PendingRequest {
  resolve: (response: RequestPermissionResponse) => void;
}

export class PermissionResolver {
  private readonly pending = new Map<string, PendingRequest>();
  private requestCounter = 0;

  request(
    params: RequestPermissionRequest,
    sink: EventSink,
  ): Promise<RequestPermissionResponse> {
    const requestId = `perm-${++this.requestCounter}`;
    const options: PermissionOption[] = params.options.map((o) => ({
      optionId: o.optionId,
      name: o.name,
      kind: o.kind,
    }));

    return new Promise<RequestPermissionResponse>((resolve) => {
      this.pending.set(requestId, { resolve });

      const toolCallInfo = params.toolCall
        ? {
            toolCallId: params.toolCall.toolCallId,
            ...(params.toolCall.title != null && { title: params.toolCall.title }),
            ...(params.toolCall.status != null && { status: params.toolCall.status }),
          }
        : undefined;

      sink.next({
        type: 'permissionRequested',
        sessionId: makeSessionId(params.sessionId),
        requestId: makeRequestId(requestId),
        payload: {
          ...(toolCallInfo && { toolCall: toolCallInfo }),
          options,
        },
      });
    });
  }

  resolve(requestId: string, optionId: string): void {
    const entry = this.pending.get(requestId);
    if (!entry) return;
    this.pending.delete(requestId);
    entry.resolve({
      outcome: { outcome: 'selected', optionId },
    });
  }

  cancelAll(): void {
    for (const [id, entry] of this.pending) {
      entry.resolve({ outcome: { outcome: 'cancelled' } });
      this.pending.delete(id);
    }
  }

  get pendingCount(): number {
    return this.pending.size;
  }
}
