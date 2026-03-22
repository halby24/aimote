import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Usage Bar', () => {
  test('displays usage information', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'sessionStarted',
        sessionId: 'test-session-1',
      });
      window.__tauriMock.emitEvent('agent-event', {
        type: 'usageUpdate',
        sessionId: 'test-session-1',
        usage: {
          size: 100000,
          used: 45000,
          cost: {
            currency: 'USD',
            amount: 1.5,
          },
        },
      });
    });

    await expect(appPage.getByText('45%')).toBeVisible();
    await expect(appPage.getByText('USD 1.50')).toBeVisible();
  });
});
