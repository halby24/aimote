import type { AgentEvent } from '@acme/shared-types';

export type Listener = (event: AgentEvent) => void;
export type Unsubscribe = () => void;

export class EventEmitter {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: AgentEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
