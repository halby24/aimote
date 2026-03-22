import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Thought Bubble', () => {
  test('shows thinking content and toggles collapse', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'sessionStarted',
        sessionId: 'test-session-1',
      });
      window.__tauriMock.emitEvent('agent-event', {
        type: 'thoughtDelta',
        sessionId: 'test-session-1',
        delta: 'I need to analyze the problem carefully...',
      });
    });

    // Thought content should be visible
    await expect(appPage.getByText('I need to analyze the problem carefully...')).toBeVisible();
    await expect(appPage.getByText(/Thinking\.\.\./)).toBeVisible();

    // Click to collapse
    await appPage.getByText(/Thinking\.\.\./).click();
    await expect(appPage.getByText('I need to analyze the problem carefully...')).not.toBeVisible();

    // Click to expand
    await appPage.getByText(/Thinking\.\.\./).click();
    await expect(appPage.getByText('I need to analyze the problem carefully...')).toBeVisible();
  });
});
