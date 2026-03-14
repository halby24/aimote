import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from './utils.js';

describe('EventEmitter', () => {
  it('calls subscribed listener on emit', () => {
    const emitter = new EventEmitter();
    const listener = vi.fn();
    emitter.subscribe(listener);
    const event = { type: 'connectionStatus' as const, status: 'ready' as const };
    emitter.emit(event);
    expect(listener).toHaveBeenCalledWith(event);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('calls all subscribed listeners', () => {
    const emitter = new EventEmitter();
    const l1 = vi.fn();
    const l2 = vi.fn();
    emitter.subscribe(l1);
    emitter.subscribe(l2);
    emitter.emit({ type: 'connectionStatus', status: 'idle' });
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops listener from receiving events', () => {
    const emitter = new EventEmitter();
    const listener = vi.fn();
    const unsubscribe = emitter.subscribe(listener);
    unsubscribe();
    emitter.emit({ type: 'connectionStatus', status: 'ready' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('clear removes all listeners', () => {
    const emitter = new EventEmitter();
    const l1 = vi.fn();
    const l2 = vi.fn();
    emitter.subscribe(l1);
    emitter.subscribe(l2);
    emitter.clear();
    emitter.emit({ type: 'connectionStatus', status: 'ready' });
    expect(l1).not.toHaveBeenCalled();
    expect(l2).not.toHaveBeenCalled();
  });

  it('only removes the unsubscribed listener, not others', () => {
    const emitter = new EventEmitter();
    const l1 = vi.fn();
    const l2 = vi.fn();
    const unsub1 = emitter.subscribe(l1);
    emitter.subscribe(l2);
    unsub1();
    emitter.emit({ type: 'connectionStatus', status: 'ready' });
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });
});
