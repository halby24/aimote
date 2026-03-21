import type {
  AgentEvent,
  ToolCallInfo,
  ToolCallUpdateInfo,
  ToolCallContentItem,
  ToolCallLocation,
  PlanEntry,
  CommandInfo,
  UsageInfo,
} from '@acme/shared-types';
import { makeSessionId, makeMessageId } from '@acme/shared-types';
import type {
  SessionUpdate,
  ContentChunk,
  ToolCall,
  ToolCallUpdate,
  ToolCallContent,
  ToolCallLocation as AcpToolCallLocation,
  Plan,
  AvailableCommandsUpdate,
  CurrentModeUpdate,
  SessionInfoUpdate,
  UsageUpdate,
  ContentBlock,
} from '@agentclientprotocol/sdk/dist/acp.js';

export function mapSessionUpdate(sessionId: string, update: SessionUpdate): AgentEvent[] {
  const sid = makeSessionId(sessionId);
  const tag = (update as { sessionUpdate: string }).sessionUpdate;

  switch (tag) {
    case 'agent_message_chunk':
      return mapContentChunk(sid, update as ContentChunk & { sessionUpdate: string });

    case 'user_message_chunk':
      return mapContentChunk(sid, update as ContentChunk & { sessionUpdate: string });

    case 'agent_thought_chunk':
      return mapThoughtChunk(sid, update as ContentChunk & { sessionUpdate: string });

    case 'tool_call':
      return mapToolCall(sid, update as ToolCall & { sessionUpdate: string });

    case 'tool_call_update':
      return mapToolCallUpdate(sid, update as ToolCallUpdate & { sessionUpdate: string });

    case 'plan':
      return mapPlan(sid, update as Plan & { sessionUpdate: string });

    case 'available_commands_update':
      return mapCommandsUpdate(sid, update as AvailableCommandsUpdate & { sessionUpdate: string });

    case 'current_mode_update':
      return mapModeUpdate(sid, update as CurrentModeUpdate & { sessionUpdate: string });

    case 'config_option_update':
      // Ignored — pass through silently
      return [];

    case 'session_info_update':
      return mapSessionInfoUpdate(sid, update as SessionInfoUpdate & { sessionUpdate: string });

    case 'usage_update':
      return mapUsageUpdate(sid, update as UsageUpdate & { sessionUpdate: string });

    default:
      // Unknown update types are safely ignored
      return [];
  }
}

function mapContentChunk(sessionId: string, chunk: ContentChunk): AgentEvent[] {
  const text = extractTextFromContentBlock(chunk.content);
  if (!text) return [];
  const messageId = makeMessageId(chunk.messageId ?? 'default');
  return [{
    type: 'messageDelta',
    sessionId: makeSessionId(sessionId),
    messageId,
    delta: text,
  }];
}

function mapThoughtChunk(sessionId: string, chunk: ContentChunk): AgentEvent[] {
  const text = extractTextFromContentBlock(chunk.content);
  if (!text) return [];
  return [{
    type: 'thoughtDelta',
    sessionId: makeSessionId(sessionId),
    delta: text,
  }];
}

function extractTextFromContentBlock(block: ContentBlock): string | null {
  if ((block as { type: string }).type === 'text') {
    return (block as { text: string }).text;
  }
  return null;
}

function mapToolCall(sessionId: string, tc: ToolCall): AgentEvent[] {
  const toolCall: ToolCallInfo = {
    toolCallId: tc.toolCallId,
    title: tc.title,
    ...(tc.kind && { kind: tc.kind }),
    ...(tc.status && { status: tc.status }),
    ...(tc.content && { content: mapToolCallContentArray(tc.content) }),
    ...(tc.locations && { locations: mapLocations(tc.locations) }),
  };
  return [{
    type: 'toolCallStarted',
    sessionId: makeSessionId(sessionId),
    toolCall,
  }];
}

function mapToolCallUpdate(sessionId: string, tcu: ToolCallUpdate): AgentEvent[] {
  const update: ToolCallUpdateInfo = {
    toolCallId: tcu.toolCallId,
    ...(tcu.title != null && { title: tcu.title }),
    ...(tcu.status != null && { status: tcu.status }),
    ...(tcu.content && { content: mapToolCallContentArray(tcu.content) }),
    ...(tcu.locations && { locations: mapLocations(tcu.locations) }),
  };
  return [{
    type: 'toolCallUpdated',
    sessionId: makeSessionId(sessionId),
    toolCallId: tcu.toolCallId,
    update,
  }];
}

function mapToolCallContentArray(items: ToolCallContent[]): ToolCallContentItem[] {
  return items.map(mapToolCallContentItem).filter((x): x is ToolCallContentItem => x !== null);
}

function mapToolCallContentItem(item: ToolCallContent): ToolCallContentItem | null {
  const typed = item as { type: string };
  switch (typed.type) {
    case 'content': {
      const content = item as { content: ContentBlock };
      const text = extractTextFromContentBlock(content.content);
      if (!text) return null;
      return { type: 'text', text };
    }
    case 'diff': {
      const diff = item as { path: string; oldText?: string | null; newText: string };
      return {
        type: 'diff' as const,
        path: diff.path,
        ...(diff.oldText != null && { oldText: diff.oldText }),
        newText: diff.newText,
      };
    }
    case 'terminal': {
      const term = item as { terminalId: string };
      return { type: 'terminal', terminalId: term.terminalId };
    }
    default:
      return null;
  }
}

function mapLocations(locs: AcpToolCallLocation[]): ToolCallLocation[] {
  return locs.map((l) => ({
    path: l.path,
    ...(l.line != null && { line: l.line }),
  }));
}

function mapPlan(sessionId: string, plan: Plan): AgentEvent[] {
  const entries: PlanEntry[] = plan.entries.map((e) => ({
    content: e.content,
    priority: e.priority,
    status: e.status,
  }));
  return [{
    type: 'plan',
    sessionId: makeSessionId(sessionId),
    entries,
  }];
}

function mapCommandsUpdate(sessionId: string, upd: AvailableCommandsUpdate): AgentEvent[] {
  const commands: CommandInfo[] = upd.availableCommands.map((c) => ({
    name: c.name,
    description: c.description,
    ...(c.input && { inputHint: 'unstructured' as const }),
  }));
  return [{
    type: 'commandsChanged',
    sessionId: makeSessionId(sessionId),
    commands,
  }];
}

function mapModeUpdate(sessionId: string, upd: CurrentModeUpdate): AgentEvent[] {
  return [{
    type: 'modeChanged',
    sessionId: makeSessionId(sessionId),
    modeId: upd.currentModeId,
  }];
}

function mapSessionInfoUpdate(sessionId: string, upd: SessionInfoUpdate): AgentEvent[] {
  const event: AgentEvent = {
    type: 'sessionInfoUpdate',
    sessionId: makeSessionId(sessionId),
  };
  if (upd.title !== undefined) {
    (event as { title?: string | null }).title = upd.title;
  }
  return [event];
}

function mapUsageUpdate(sessionId: string, upd: UsageUpdate): AgentEvent[] {
  const usage: UsageInfo = {
    size: upd.size,
    used: upd.used,
    ...(upd.cost && { cost: { amount: upd.cost.amount, currency: upd.cost.currency } }),
  };
  return [{
    type: 'usageUpdate',
    sessionId: makeSessionId(sessionId),
    usage,
  }];
}
