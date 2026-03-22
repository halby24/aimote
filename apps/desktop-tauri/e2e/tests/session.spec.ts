import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Session', () => {
  test('shows default title', async ({ appPage }) => {
    await expect(appPage.getByText('AI チャット')).toBeVisible();
  });

  test('updates session title', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'sessionStarted',
        sessionId: 'test-session-1',
      });
      window.__tauriMock.emitEvent('agent-event', {
        type: 'sessionInfoUpdate',
        sessionId: 'test-session-1',
        title: 'My Custom Chat',
      });
    });

    await expect(appPage.getByText('My Custom Chat')).toBeVisible();
  });
});
