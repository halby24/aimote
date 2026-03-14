export class TransportError extends Error {
  readonly code: string;
  override readonly cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'TransportError';
    this.code = code;
    this.cause = cause;
  }
}

export class ConnectionError extends TransportError {
  constructor(message: string, cause?: unknown) {
    super('CONNECTION_ERROR', message, cause);
    this.name = 'ConnectionError';
  }
}

export class SessionError extends TransportError {
  constructor(message: string, cause?: unknown) {
    super('SESSION_ERROR', message, cause);
    this.name = 'SessionError';
  }
}

export class MessageError extends TransportError {
  constructor(message: string, cause?: unknown) {
    super('MESSAGE_ERROR', message, cause);
    this.name = 'MessageError';
  }
}
