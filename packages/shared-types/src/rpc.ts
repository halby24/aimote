import type { SessionId, MessageId } from './ids.js';

export interface RpcRequest<TMethod extends string, TParams> {
  readonly id: string;
  readonly method: TMethod;
  readonly params: TParams;
}

export interface RpcResponse<TResult> {
  readonly id: string;
  readonly result?: TResult;
  readonly error?: RpcError;
}

export interface RpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

export type SendMessageParams = {
  sessionId: SessionId;
  messageId: MessageId;
  text: string;
};

export type StartSessionParams = {
  workspace?: string;
};

export type StartSessionResult = {
  sessionId: SessionId;
};
