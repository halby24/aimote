import { BehaviorSubject, type Subscription } from 'rxjs';
import type { AgentTransport } from '@acme/transport';
import type { AgentEvent, ConnectionStatus, ConfigValidationResult, AgentsFile } from '@acme/shared-types';
import { makeSessionId, makeMessageId } from '@acme/shared-types';
import { ChatStoreManager } from './store.js';

export interface ChatControllerOptions {
  transport: AgentTransport;
}

export class ChatController {
  private readonly transport: AgentTransport;
  readonly storeManager: ChatStoreManager;
  readonly connectionStatus$ = new BehaviorSubject<ConnectionStatus>('idle');
  readonly configValidation$ = new BehaviorSubject<ConfigValidationResult | null>(null);
  readonly connectError$ = new BehaviorSubject<string | null>(null);
  private subscription: Subscription | null = null;
  private connectGeneration = 0;
  private activeSessionId: string | null = null;
  private streamingMessageId: string | null = null;

  constructor(options: ChatControllerOptions) {
    this.transport = options.transport;
    this.storeManager = new ChatStoreManager();
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus$.getValue();
  }

  getConfigValidation(): ConfigValidationResult | null {
    return this.configValidation$.getValue();
  }

  getConnectError(): string | null {
    return this.connectError$.getValue();
  }

  async connect(): Promise<void> {
    // Clean up any leaked subscription from a previous connect() that was
    // interrupted by disconnect() before it could complete
    // (happens with React StrictMode double-mount).
    this.subscription?.unsubscribe();
    this.subscription = null;

    const gen = ++this.connectGeneration;

    const validation = await this.runValidateConfig();
    if (gen !== this.connectGeneration) return; // superseded
    this.configValidation$.next(validation);
    if (!validation.valid) {
      this.connectionStatus$.next('error');
      return;
    }

    this.subscription = this.transport.events$.subscribe((event) => {
      this.handleEvent(event);
    });

    try {
      await this.transport.connect();
    } catch (err) {
      // Only set error if this connect attempt is still current.
      // A stale attempt (superseded by disconnect + reconnect) is silently ignored.
      if (gen === this.connectGeneration) {
        this.connectError$.next(err instanceof Error ? err.message : String(err));
        this.connectionStatus$.next('error');
      }
    }
  }

  async disconnect(): Promise<void> {
    this.connectGeneration++; // invalidate any in-flight connect
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.activeSessionId = null;
    this.streamingMessageId = null;
    await this.transport.disconnect();
  }

  async startSession(workspace?: string): Promise<string> {
    const input = workspace !== undefined ? { workspace } : undefined;
    const { sessionId } = await this.transport.startSession(input);
    // Set activeSessionId immediately — the sessionStarted event travels
    // through a separate async channel and may arrive after this resolves.
    if (!this.activeSessionId) {
      this.storeManager.createSession(sessionId);
      this.activeSessionId = sessionId;
    }
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

  async getAgentsConfig(): Promise<AgentsFile | null> {
    if (!this.transport.getAgentsConfig) return null;
    return this.transport.getAgentsConfig();
  }

  async saveAgentsConfig(config: AgentsFile): Promise<void> {
    if (!this.transport.saveAgentsConfig) {
      throw new Error('saveAgentsConfig not supported');
    }
    await this.transport.saveAgentsConfig(config);
  }

  subscribe(listener: (store: import('./store.js').ChatStore) => void): () => void {
    return this.storeManager.subscribe(listener);
  }

  private handleEvent(event: AgentEvent): void {
    switch (event.type) {
      case 'connectionStatus':
        this.connectionStatus$.next(event.status);
        break;
      case 'sessionStarted':
        if (this.activeSessionId !== event.sessionId) {
          this.storeManager.createSession(event.sessionId);
          this.activeSessionId = event.sessionId;
        }
        break;
      case 'messageDelta': {
        const { sessionId, delta } = event;
        if (this.streamingMessageId === null) {
          const localId = makeMessageId(`assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`);
          this.storeManager.addAssistantMessage(sessionId, localId);
          this.streamingMessageId = localId;
        }
        this.storeManager.appendMessageDelta(sessionId, this.streamingMessageId, delta);
        break;
      }
      case 'messageCompleted': {
        const { sessionId } = event;
        if (this.streamingMessageId) {
          this.storeManager.completeMessage(sessionId, this.streamingMessageId);
          this.streamingMessageId = null;
        }
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
        if (this.streamingMessageId && this.activeSessionId) {
          this.storeManager.completeMessage(event.sessionId, this.streamingMessageId);
        }
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
  }

  private async runValidateConfig(): Promise<ConfigValidationResult> {
    if (this.transport.validateConfig) {
      return this.transport.validateConfig();
    }
    return { valid: true, errors: [] };
  }
}
