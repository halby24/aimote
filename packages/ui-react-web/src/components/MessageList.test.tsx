import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageList } from './MessageList.js';
import { createMessageViewModel } from '../__testing__/factories.js';
import type { MessageId } from '@acme/shared-types';

describe('MessageList', () => {
  it('shows placeholder when no messages', () => {
    render(<MessageList messages={[]} />);
    expect(screen.getByText('メッセージを送信してください')).toBeInTheDocument();
  });

  it('does not show placeholder when messages exist', () => {
    render(<MessageList messages={[createMessageViewModel()]} />);
    expect(screen.queryByText('メッセージを送信してください')).not.toBeInTheDocument();
  });

  it('renders user message content', () => {
    render(
      <MessageList
        messages={[createMessageViewModel({ role: 'user', content: 'Hi there' })]}
      />,
    );
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('renders assistant message content', () => {
    render(
      <MessageList
        messages={[
          createMessageViewModel({
            id: 'msg-2' as MessageId,
            role: 'assistant',
            content: 'Hello! How can I help?',
          }),
        ]}
      />,
    );
    expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
  });

  it('shows streaming cursor for streaming messages', () => {
    const { container } = render(
      <MessageList
        messages={[
          createMessageViewModel({
            role: 'assistant',
            content: 'Typing...',
            isStreaming: true,
          }),
        ]}
      />,
    );
    const cursor = container.querySelector('span.animate-blink');
    expect(cursor).toBeInTheDocument();
  });

  it('shows error indicator for error messages', () => {
    render(
      <MessageList
        messages={[
          createMessageViewModel({
            role: 'assistant',
            content: 'Failed',
            isError: true,
          }),
        ]}
      />,
    );
    expect(screen.getByText(/エラー/)).toBeInTheDocument();
  });

  it('renders multiple messages', () => {
    render(
      <MessageList
        messages={[
          createMessageViewModel({ id: 'msg-1' as MessageId, role: 'user', content: 'Q1' }),
          createMessageViewModel({ id: 'msg-2' as MessageId, role: 'assistant', content: 'A1' }),
          createMessageViewModel({ id: 'msg-3' as MessageId, role: 'user', content: 'Q2' }),
        ]}
      />,
    );
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
  });
});
