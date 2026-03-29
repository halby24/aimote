import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from './utils.js';

describe('createEventBus', () => {
  it('delivers events to subscribers', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.events$.subscribe(listener);
    const event = { type: 'connectionStatus' as const, status: 'ready' as const };
    bus.subject.next(event);
    expect(listener).toHaveBeenCalledWith(event);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('delivers events to multiple subscribers', () => {
    const bus = createEventBus();
    const l1 = vi.fn();
    const l2 = vi.fn();
    bus.events$.subscribe(l1);
    bus.events$.subscribe(l2);
    bus.subject.next({ type: 'connectionStatus', status: 'idle' });
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops delivery to that subscriber', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    const sub = bus.events$.subscribe(listener);
    sub.unsubscribe();
    bus.subject.next({ type: 'connectionStatus', status: 'ready' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('subject stays open across multiple subscribe/unsubscribe cycles', () => {
    const bus = createEventBus();
    const l1 = vi.fn();
    const sub1 = bus.events$.subscribe(l1);
    sub1.unsubscribe();
    // Resubscribe — should still work (subject not completed)
    const l2 = vi.fn();
    bus.events$.subscribe(l2);
    bus.subject.next({ type: 'connectionStatus', status: 'ready' });
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('only unsubscribed subscriber stops, not others', () => {
    const bus = createEventBus();
    const l1 = vi.fn();
    const l2 = vi.fn();
    const sub1 = bus.events$.subscribe(l1);
    bus.events$.subscribe(l2);
    sub1.unsubscribe();
    bus.subject.next({ type: 'connectionStatus', status: 'ready' });
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });
});
