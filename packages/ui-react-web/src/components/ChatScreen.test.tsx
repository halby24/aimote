import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatScreen } from './ChatScreen.js';
import { createMockController } from '../__testing__/mock-controller.js';

describe('ChatScreen', () => {
  it('renders all sub-components', () => {
    const controller = createMockController();
    render(<ChatScreen controller={controller} />);

    expect(screen.getByText('AI チャット')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('送信')).toBeInTheDocument();
    expect(screen.getByText('メッセージを送信してください')).toBeInTheDocument();
  });

  it('calls connect and startSession on mount', async () => {
    const controller = createMockController();
    render(<ChatScreen controller={controller} />);

    await waitFor(() => {
      expect(controller.connect).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(controller.startSession).toHaveBeenCalledOnce();
    });
  });

  it('calls disconnect on unmount', () => {
    const controller = createMockController();
    const { unmount } = render(<ChatScreen controller={controller} />);

    unmount();
    expect(controller.disconnect).toHaveBeenCalledOnce();
  });

  it('does not render PermissionDialog when no pending permission', () => {
    const controller = createMockController();
    render(<ChatScreen controller={controller} />);

    // PermissionDialog should not be visible - no permission-related text
    expect(screen.queryByText('許可')).not.toBeInTheDocument();
  });
});
