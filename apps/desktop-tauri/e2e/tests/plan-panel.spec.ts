import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Plan Panel', () => {
  test('displays plan entries', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'sessionStarted',
        sessionId: 'test-session-1',
      });
      window.__tauriMock.emitEvent('agent-event', {
        type: 'plan',
        sessionId: 'test-session-1',
        entries: [
          { content: 'Analyze codebase', priority: 'high', status: 'completed' },
          { content: 'Write tests', priority: 'medium', status: 'in_progress' },
          { content: 'Run validation', priority: 'low', status: 'pending' },
        ],
      });
    });

    await expect(appPage.getByText('Plan')).toBeVisible();
    await expect(appPage.getByText('Analyze codebase')).toBeVisible();
    await expect(appPage.getByText('Write tests')).toBeVisible();
    await expect(appPage.getByText('Run validation')).toBeVisible();
  });
});
