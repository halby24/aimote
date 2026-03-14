import { describe, it, expect } from 'vitest';
import { TransportError, ConnectionError, SessionError, MessageError } from './errors.js';

describe('TransportError', () => {
  it('sets code, message, and name', () => {
    const err = new TransportError('MY_CODE', 'something went wrong');
    expect(err.code).toBe('MY_CODE');
    expect(err.message).toBe('something went wrong');
    expect(err.name).toBe('TransportError');
    expect(err).toBeInstanceOf(Error);
  });

  it('stores cause when provided', () => {
    const cause = new Error('root cause');
    const err = new TransportError('CODE', 'msg', cause);
    expect(err.cause).toBe(cause);
  });

  it('cause is undefined when not provided', () => {
    const err = new TransportError('CODE', 'msg');
    expect(err.cause).toBeUndefined();
  });
});

describe('ConnectionError', () => {
  it('has code CONNECTION_ERROR and correct name', () => {
    const err = new ConnectionError('connection failed');
    expect(err.code).toBe('CONNECTION_ERROR');
    expect(err.name).toBe('ConnectionError');
    expect(err.message).toBe('connection failed');
  });

  it('is an instance of TransportError and Error', () => {
    const err = new ConnectionError('failed');
    expect(err).toBeInstanceOf(TransportError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('SessionError', () => {
  it('has code SESSION_ERROR and correct name', () => {
    const err = new SessionError('session not found');
    expect(err.code).toBe('SESSION_ERROR');
    expect(err.name).toBe('SessionError');
  });

  it('is an instance of TransportError', () => {
    expect(new SessionError('x')).toBeInstanceOf(TransportError);
  });
});

describe('MessageError', () => {
  it('has code MESSAGE_ERROR and correct name', () => {
    const err = new MessageError('bad message');
    expect(err.code).toBe('MESSAGE_ERROR');
    expect(err.name).toBe('MessageError');
  });

  it('is an instance of TransportError', () => {
    expect(new MessageError('x')).toBeInstanceOf(TransportError);
  });
});
