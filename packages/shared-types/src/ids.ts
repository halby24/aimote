export type SessionId = string & { readonly __brand: 'SessionId' };
export type MessageId = string & { readonly __brand: 'MessageId' };
export type RequestId = string & { readonly __brand: 'RequestId' };

export function makeSessionId(raw: string): SessionId {
  return raw as SessionId;
}

export function makeMessageId(raw: string): MessageId {
  return raw as MessageId;
}

export function makeRequestId(raw: string): RequestId {
  return raw as RequestId;
}
