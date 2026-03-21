import type { AgentTransport } from '@acme/transport';
import type { ConnectionStatus } from '@acme/shared-types';
import { makeSessionId } from '@acme/shared-types';
import { ChatStoreManager } from './store.js';

export interface ChatControllerOptions {
  transport: AgentTransport;
}

export class ChatController {
  private readonly transport: AgentTransport;
  readonly storeManager: ChatStoreManager;
  private connectionStatus: ConnectionStatus = 'idle';
  private unsubscribe: (() => void) | null = null;
  private activeSessionId: string | null = null;
  private streamingMessageId: string | null = null;

  constructor(options: ChatControllerOptions) {
    this.transport = options.transport;
    this.storeManager = new ChatStoreManager();
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  async connect(): Promise<void> {
    this.unsubscribe = this.transport.subscribe((event) => {
      switch (event.type) {
        case 'connectionStatus':
          this.connectionStatus = event.status;
          break;
        case 'sessionStarted':
          this.storeManager.createSession(event.sessionId);
          this.activeSessionId = event.sessionId;
          break;
        case 'messageDelta': {
          const { sessionId, messageId, delta } = event;
          if (this.streamingMessageId !== messageId) {
            if (this.streamingMessageId === null) {
              this.storeManager.addAssistantMessage(sessionId, messageId);
              this.streamingMessageId = messageId;
            }
          }
          this.storeManager.appendMessageDelta(sessionId, messageId, delta);
          break;
        }
        case 'messageCompleted': {
          const { sessionId, messageId } = event;
          this.storeManager.completeMessage(sessionId, messageId);
          this.streamingMessageId = null;
          break;
        }
        case 'toolCallStarted':
          this.storeManager.addToolCall(event.sessionId, event.toolCall);
          break;
        case 'toolCallUpdated':
          this.storeManager.updateToolCall(event.sessionId, event.toolCallId, event.update);
          break;
        case 'plan':
          this.storeManager.setPlan(event.sessionId, event.entries);
          break;
        case 'thoughtDelta':
          this.storeManager.appendThought(event.sessionId, event.delta);
          break;
        case 'modeChanged':
          this.storeManager.setMode(event.sessionId, event.modeId);
          break;
        case 'commandsChanged':
          this.storeManager.setCommands(event.sessionId, event.commands);
          break;
        case 'usageUpdate':
          this.storeManager.setUsage(event.sessionId, event.usage);
          break;
        case 'sessionInfoUpdate':
          if (event.title !== undefined && event.title !== null) {
            this.storeManager.setSessionTitle(event.sessionId, event.title);
          }
          break;
        case 'permissionRequested':
          this.storeManager.setPermission(event.sessionId, event.requestId, event.payload);
          break;
        case 'turnCompleted':
          this.storeManager.setTurnActive(event.sessionId, false);
          this.streamingMessageId = null;
          break;
        case 'error':
          if (this.activeSessionId) {
            this.storeManager.addErrorMessage(this.activeSessionId, event.code, event.message);
          }
          console.error(`[transport error] ${event.code}: ${event.message}`);
          break;
        default:
          break;
      }
    });
    await this.transport.connect();
  }

  async disconnect(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    await this.transport.disconnect();
  }

  async startSession(workspace?: string): Promise<string> {
    const input = workspace !== undefined ? { workspace } : undefined;
    const { sessionId } = await this.transport.startSession(input);
    return sessionId;
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.activeSessionId) {
      throw new Error('No active session. Call startSession() first.');
    }
    this.storeManager.setTurnActive(this.activeSessionId, true);
    const userMsgId = this.storeManager.addUserMessage(this.activeSessionId, text);
    try {
      await this.transport.sendUserMessage(this.activeSessionId, text);
      this.storeManager.markMessageSent(this.activeSessionId, userMsgId);
    } catch (err) {
      this.storeManager.markMessageError(this.activeSessionId, userMsgId);
      throw err;
    }
  }

  async approve(requestId: string, optionId: string): Promise<void> {
    await this.transport.approve(requestId, optionId);
    if (this.activeSessionId) {
      this.storeManager.clearPermission(this.activeSessionId);
    }
  }

  async cancel(): Promise<void> {
    if (!this.activeSessionId) return;
    await this.transport.cancel(this.activeSessionId);
    this.streamingMessageId = null;
  }

  getActiveSession() {
    if (!this.activeSessionId) return null;
    return this.storeManager.getStore().sessions.get(makeSessionId(this.activeSessionId)) ?? null;
  }

  subscribe(listener: (store: import('./store.js').ChatStore) => void): () => void {
    return this.storeManager.subscribe(listener);
  }
}
