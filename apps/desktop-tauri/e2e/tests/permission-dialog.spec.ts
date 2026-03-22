import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Permission Dialog', () => {
  test('shows permission dialog and approves', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'sessionStarted',
        sessionId: 'test-session-1',
      });
      window.__tauriMock.emitEvent('agent-event', {
        type: 'permissionRequested',
        sessionId: 'test-session-1',
        requestId: 'perm-1',
        payload: {
          toolCall: { title: 'Write to /tmp/output.txt' },
          options: [
            { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
            { optionId: 'deny', name: 'Deny', kind: 'reject_once' },
          ],
        },
      });
    });

    // Permission description should be visible
    await expect(appPage.getByText('Write to /tmp/output.txt')).toBeVisible();

    // Click allow button
    await appPage.getByText('Allow').click();

    // Dialog should disappear after approval
    await expect(appPage.getByText('Write to /tmp/output.txt')).not.toBeVisible();
  });
});
