import { Subject, type Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import type { AgentEvent } from '@acme/shared-types';

export interface EventBus {
  readonly subject: Subject<AgentEvent>;
  readonly events$: Observable<AgentEvent>;
}

export function createEventBus(): EventBus {
  const subject = new Subject<AgentEvent>();
  const events$ = subject.asObservable().pipe(share());
  return { subject, events$ };
}
