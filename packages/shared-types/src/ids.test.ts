import { describe, it, expect } from 'vitest';
import { makeSessionId, makeMessageId, makeRequestId } from './ids.js';

describe('makeSessionId', () => {
  it('returns the raw string value', () => {
    expect(makeSessionId('session-1')).toBe('session-1');
  });

  it('preserves arbitrary strings', () => {
    expect(makeSessionId('abc-123')).toBe('abc-123');
  });
});

describe('makeMessageId', () => {
  it('returns the raw string value', () => {
    expect(makeMessageId('msg-1')).toBe('msg-1');
  });
});

describe('makeRequestId', () => {
  it('returns the raw string value', () => {
    expect(makeRequestId('req-1')).toBe('req-1');
  });
});
