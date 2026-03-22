import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Connection', () => {
  test('shows connecting state then transitions to ready', async ({ appPage }) => {
    // Initially the app calls connect, which triggers event listener setup
    // Then emits connectionStatus events
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'connectionStatus',
        status: 'connecting',
      });
    });

    // Wait for connecting state to appear
    await expect(appPage.getByText('接続しています...')).toBeVisible();

    // Transition to ready
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'connectionStatus',
        status: 'ready',
      });
    });

    await expect(appPage.getByText('接続中')).toBeVisible();
  });

  test('shows error state on connection error', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'connectionStatus',
        status: 'error',
      });
    });

    await expect(appPage.getByText('エラー')).toBeVisible();
  });
});
