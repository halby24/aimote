import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Message Flow', () => {
  test('sends user message and receives streaming response', async ({ appPage }) => {
    // Emit sessionStarted so controller knows the session
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'connectionStatus',
        status: 'ready',
      });
      window.__tauriMock.emitEvent('agent-event', {
        type: 'sessionStarted',
        sessionId: 'test-session-1',
      });
    });

    // Wait for the input to be enabled
    const textarea = appPage.locator('textarea');
    await expect(textarea).toBeEnabled();

    // Type and send a message
    await textarea.fill('Hello AI');
    await textarea.press('Enter');

    // User message should appear
    await expect(appPage.getByText('Hello AI')).toBeVisible();

    // Simulate streaming response
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'messageDelta',
        sessionId: 'test-session-1',
        messageId: 'msg-resp-1',
        delta: 'Hello! ',
      });
    });

    await expect(appPage.getByText('Hello!')).toBeVisible();

    // More streaming
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'messageDelta',
        sessionId: 'test-session-1',
        messageId: 'msg-resp-1',
        delta: 'How can I help?',
      });
    });

    await expect(appPage.getByText('Hello! How can I help?')).toBeVisible();

    // Complete the message
    await appPage.evaluate(() => {
      window.__tauriMock.emitEvent('agent-event', {
        type: 'messageCompleted',
        sessionId: 'test-session-1',
        messageId: 'msg-resp-1',
      });
      window.__tauriMock.emitEvent('agent-event', {
        type: 'turnCompleted',
        sessionId: 'test-session-1',
      });
    });

    // Message should still be visible after completion
    await expect(appPage.getByText('Hello! How can I help?')).toBeVisible();
  });

  test('shows empty state placeholder', async ({ appPage }) => {
    await expect(appPage.getByText('メッセージを送信してください')).toBeVisible();
  });
});
