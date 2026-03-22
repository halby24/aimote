import { test as base, type Page } from '@playwright/test';

interface AppFixtures {
  appPage: Page;
}

export const test = base.extend<AppFixtures>({
  appPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.__tauriMock = {
        invokeHandlers: new Map<string, (...args: unknown[]) => unknown>([
          ['validate_config', () => ({ valid: true, errors: [] })],
          ['connect', () => undefined],
          ['disconnect', () => undefined],
          ['start_session', () => 'test-session-1'],
          ['send_user_message', () => undefined],
          ['cancel_session', () => undefined],
          ['approve_permission', () => undefined],
          ['get_connection_status', () => 'ready'],
          ['list_sessions', () => []],
          ['load_session', () => undefined],
        ]),
        eventListeners: new Map(),
        emitEvent(eventName: string, payload: unknown) {
          const listeners = this.eventListeners.get(eventName);
          if (listeners) {
            for (const listener of listeners) {
              listener({ payload });
            }
          }
        },
      };
    });

    await page.goto('/');
    await use(page);
  },
});

export { expect } from '@playwright/test';
