import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Tool Calls', () => {
  test('shows active tool call and hides on completion', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'sessionStarted',
        sessionId: 'test-session-1',
      });
      window.__tauriMock.emitEvent('agent-event', {
        type: 'toolCallStarted',
        sessionId: 'test-session-1',
        toolCall: {
          toolCallId: 'tc-1',
          title: 'Reading file.ts',
          kind: 'read',
          status: 'in_progress',
        },
      });
    });

    await expect(appPage.getByText('Reading file.ts')).toBeVisible();

    // Complete the tool call
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'toolCallUpdated',
        sessionId: 'test-session-1',
        toolCallId: 'tc-1',
        update: { status: 'completed' },
      });
    });

    await expect(appPage.getByText('Reading file.ts')).not.toBeVisible();
  });
});
