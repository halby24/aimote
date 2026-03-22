import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SessionHeader } from './SessionHeader.js';

describe('SessionHeader', () => {
  const defaultProps = {
    title: null,
    currentMode: null,
    usage: null,
    connectionStatus: 'idle',
    isTurnActive: false,
    onCancel: vi.fn(),
  };

  it('shows default title "AI チャット" when title is null', () => {
    render(<SessionHeader {...defaultProps} />);
    expect(screen.getByText('AI チャット')).toBeInTheDocument();
  });

  it('shows custom title', () => {
    render(<SessionHeader {...defaultProps} title="My Session" />);
    expect(screen.getByText('My Session')).toBeInTheDocument();
  });

  it('shows connection status color for ready', () => {
    render(<SessionHeader {...defaultProps} connectionStatus="ready" />);
    expect(screen.getByText('接続中')).toBeInTheDocument();
  });

  it('shows connection status for connecting', () => {
    render(<SessionHeader {...defaultProps} connectionStatus="connecting" />);
    expect(screen.getByText('接続しています...')).toBeInTheDocument();
  });

  it('shows connection status for error', () => {
    render(<SessionHeader {...defaultProps} connectionStatus="error" />);
    expect(screen.getByText('エラー')).toBeInTheDocument();
  });

  it('shows fallback status for unknown', () => {
    render(<SessionHeader {...defaultProps} connectionStatus="idle" />);
    expect(screen.getByText('未接続')).toBeInTheDocument();
  });

  it('shows mode badge when currentMode is set', () => {
    render(<SessionHeader {...defaultProps} currentMode="code" />);
    expect(screen.getByText('code')).toBeInTheDocument();
  });

  it('does not show mode badge when currentMode is null', () => {
    render(<SessionHeader {...defaultProps} currentMode={null} />);
    expect(screen.queryByText('code')).not.toBeInTheDocument();
  });

  it('shows cancel button when turn is active', () => {
    render(<SessionHeader {...defaultProps} isTurnActive={true} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('hides cancel button when turn is not active', () => {
    render(<SessionHeader {...defaultProps} isTurnActive={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<SessionHeader {...defaultProps} isTurnActive={true} onCancel={onCancel} />);

    await user.click(screen.getByRole('button'));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
