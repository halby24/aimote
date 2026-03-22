import { test as base, expect, type Page } from '@playwright/test';

/**
 * Custom fixture that simulates a failed config validation (command not found).
 */
const test = base.extend<{ appPage: Page }>({
  appPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.__tauriMock = {
        invokeHandlers: new Map<string, (...args: unknown[]) => unknown>([
          ['validate_config', () => ({
            valid: false,
            errors: [
              { code: 'COMMAND_NOT_FOUND', message: 'Command "claude" not found in PATH.' },
            ],
          })],
          ['connect', () => undefined],
          ['disconnect', () => undefined],
          ['start_session', () => 'test-session-1'],
          ['send_user_message', () => undefined],
          ['cancel_session', () => undefined],
          ['approve_permission', () => undefined],
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

test.describe('Config Validation', () => {
  test('shows config error message in header when command not found', async ({ appPage }) => {
    // The app should call validate_config before connect,
    // get the invalid result, and display the error in the header.
    await expect(
      appPage.getByText('Command "claude" not found in PATH.'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('does not call connect when validation fails', async ({ appPage }) => {
    // Wait for the error to appear
    await expect(
      appPage.getByText('Command "claude" not found in PATH.'),
    ).toBeVisible({ timeout: 5000 });

    // Verify start_session was not called (no session header title change)
    // The connect mock should not have been invoked either
    // We verify this indirectly: no "接続しています..." or "接続中" text should appear
    await expect(appPage.getByText('接続しています...')).not.toBeVisible();
    await expect(appPage.getByText('接続中')).not.toBeVisible();
  });

  test('input is disabled when config validation fails', async ({ appPage }) => {
    await expect(
      appPage.getByText('Command "claude" not found in PATH.'),
    ).toBeVisible({ timeout: 5000 });

    const input = appPage.getByRole('textbox');
    await expect(input).toBeDisabled();
  });

  test('no uncaught errors in console', async ({ appPage }) => {
    const errors: string[] = [];
    appPage.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Wait for the error display to appear (app has settled)
    await expect(
      appPage.getByText('Command "claude" not found in PATH.'),
    ).toBeVisible({ timeout: 5000 });

    // Allow a brief moment for any async errors to surface
    await appPage.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});

/**
 * Custom fixture that simulates connect failure (validation passes but spawn fails).
 */
const testSpawnFail = base.extend<{ appPage: Page }>({
  appPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.__tauriMock = {
        invokeHandlers: new Map<string, (...args: unknown[]) => unknown>([
          ['validate_config', () => ({ valid: true, errors: [] })],
          ['connect', () => { throw new Error('Spawn error: Failed to spawn agent "claude": program not found'); }],
          ['disconnect', () => undefined],
          ['start_session', () => 'test-session-1'],
          ['send_user_message', () => undefined],
          ['cancel_session', () => undefined],
          ['approve_permission', () => undefined],
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

testSpawnFail.describe('Spawn Failure (validation passes, connect fails)', () => {
  testSpawnFail('shows spawn error in header', async ({ appPage }) => {
    await expect(
      appPage.getByText(/Spawn error.*program not found/),
    ).toBeVisible({ timeout: 5000 });
  });

  testSpawnFail('input is disabled', async ({ appPage }) => {
    await expect(
      appPage.getByText(/Spawn error.*program not found/),
    ).toBeVisible({ timeout: 5000 });

    const input = appPage.getByRole('textbox');
    await expect(input).toBeDisabled();
  });

  testSpawnFail('no uncaught errors in console', async ({ appPage }) => {
    const errors: string[] = [];
    appPage.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await expect(
      appPage.getByText(/Spawn error.*program not found/),
    ).toBeVisible({ timeout: 5000 });

    await appPage.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});
