import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MessageInput } from './MessageInput.js';
import { createInputViewModel } from '../__testing__/factories.js';

describe('MessageInput', () => {
  it('renders textarea', () => {
    render(<MessageInput input={createInputViewModel()} onSend={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('disables textarea when isDisabled is true', () => {
    render(
      <MessageInput
        input={createInputViewModel({ isDisabled: true })}
        onSend={vi.fn()}
      />,
    );
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('shows default placeholder text', () => {
    render(<MessageInput input={createInputViewModel()} onSend={vi.fn()} />);
    expect(screen.getByPlaceholderText('メッセージを入力... (Enter で送信)')).toBeInTheDocument();
  });

  it('disables send button when text is empty', () => {
    render(<MessageInput input={createInputViewModel()} onSend={vi.fn()} />);
    expect(screen.getByText('送信')).toBeDisabled();
  });

  it('enables send button when text is entered', async () => {
    const user = userEvent.setup();
    render(<MessageInput input={createInputViewModel()} onSend={vi.fn()} />);

    await user.type(screen.getByRole('textbox'), 'Hello');
    expect(screen.getByText('送信')).toBeEnabled();
  });

  it('calls onSend on Enter key', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn(async () => {});
    render(<MessageInput input={createInputViewModel()} onSend={onSend} />);

    await user.type(screen.getByRole('textbox'), 'Hello{Enter}');
    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('does not send on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn(async () => {});
    render(<MessageInput input={createInputViewModel()} onSend={onSend} />);

    await user.type(screen.getByRole('textbox'), 'Line1{Shift>}{Enter}{/Shift}Line2');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears text after sending', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn(async () => {});
    render(<MessageInput input={createInputViewModel()} onSend={onSend} />);

    await user.type(screen.getByRole('textbox'), 'Hello{Enter}');
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('does not send empty/whitespace text', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn(async () => {});
    render(<MessageInput input={createInputViewModel()} onSend={onSend} />);

    await user.type(screen.getByRole('textbox'), '   {Enter}');
    expect(onSend).not.toHaveBeenCalled();
  });
});
