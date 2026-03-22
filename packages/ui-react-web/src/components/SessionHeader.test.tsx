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
    onSettingsClick: vi.fn(),
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
    const buttons = screen.getAllByRole('button');
    // gear button + cancel button
    expect(buttons).toHaveLength(2);
  });

  it('hides cancel button when turn is not active', () => {
    render(<SessionHeader {...defaultProps} isTurnActive={false} />);
    // only gear button
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<SessionHeader {...defaultProps} isTurnActive={true} onCancel={onCancel} />);

    const buttons = screen.getAllByRole('button');
    // cancel button is the second one (after gear)
    await user.click(buttons[1]);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows settings gear button', () => {
    render(<SessionHeader {...defaultProps} />);
    expect(screen.getByLabelText('設定')).toBeInTheDocument();
  });

  it('calls onSettingsClick when gear button is clicked', async () => {
    const user = userEvent.setup();
    const onSettingsClick = vi.fn();
    render(<SessionHeader {...defaultProps} onSettingsClick={onSettingsClick} />);

    await user.click(screen.getByLabelText('設定'));
    expect(onSettingsClick).toHaveBeenCalledOnce();
  });
});
