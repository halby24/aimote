import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConnectionStatusPanel } from './ConnectionStatusPanel.js';

describe('ConnectionStatusPanel', () => {
  it('shows 未接続 for idle status', () => {
    render(<ConnectionStatusPanel connectionStatus="idle" configError={null} />);
    expect(screen.getByText('未接続')).toBeInTheDocument();
  });

  it('shows 接続中... for connecting status', () => {
    render(<ConnectionStatusPanel connectionStatus="connecting" configError={null} />);
    expect(screen.getByText('接続中...')).toBeInTheDocument();
  });

  it('shows 接続エラー for error status', () => {
    render(<ConnectionStatusPanel connectionStatus="error" configError={null} />);
    expect(screen.getByText('接続エラー')).toBeInTheDocument();
  });

  it('shows 切断されました for disconnected status', () => {
    render(<ConnectionStatusPanel connectionStatus="disconnected" configError={null} />);
    expect(screen.getByText('切断されました')).toBeInTheDocument();
  });

  it('shows configError when provided', () => {
    render(<ConnectionStatusPanel connectionStatus="error" configError="cmd not found" />);
    expect(screen.getByText('接続エラー')).toBeInTheDocument();
    expect(screen.getByText('cmd not found')).toBeInTheDocument();
  });

  it('does not show configError when null', () => {
    render(<ConnectionStatusPanel connectionStatus="error" configError={null} />);
    expect(screen.queryByText('cmd not found')).not.toBeInTheDocument();
  });
});
