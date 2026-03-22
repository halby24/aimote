import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useChat } from './useChat.js';
import { createMockController } from '../__testing__/mock-controller.js';

describe('useChat', () => {
  it('returns initial viewModel', () => {
    const controller = createMockController();
    const { result } = renderHook(() => useChat({ controller }));

    expect(result.current.viewModel).toBeDefined();
    expect(result.current.viewModel.connectionStatus).toBe('ready');
    expect(result.current.viewModel.messages).toEqual([]);
  });

  it('provides sendMessage function', async () => {
    const controller = createMockController();
    const { result } = renderHook(() => useChat({ controller }));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(controller.sendMessage).toHaveBeenCalledWith('Hello');
  });

  it('sets isSubmitting during sendMessage', async () => {
    const controller = createMockController();
    let resolveMessage: () => void;
    controller.sendMessage.mockImplementation(
      () => new Promise<void>((resolve) => { resolveMessage = resolve; }),
    );

    const { result } = renderHook(() => useChat({ controller }));

    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('Hello');
    });

    // isSubmitting should be true during send
    expect(result.current.viewModel.input.isSubmitting).toBe(true);

    await act(async () => {
      resolveMessage!();
      await sendPromise!;
    });

    expect(result.current.viewModel.input.isSubmitting).toBe(false);
  });

  it('provides cancel function', async () => {
    const controller = createMockController();
    const { result } = renderHook(() => useChat({ controller }));

    await act(async () => {
      await result.current.cancel();
    });

    expect(controller.cancel).toHaveBeenCalledOnce();
  });

  it('provides approve function', async () => {
    const controller = createMockController();
    const { result } = renderHook(() => useChat({ controller }));

    await act(async () => {
      await result.current.approve('req-1', 'allow');
    });

    expect(controller.approve).toHaveBeenCalledWith('req-1', 'allow');
  });

  it('subscribes to store changes', () => {
    const controller = createMockController();
    renderHook(() => useChat({ controller }));

    expect(controller.subscribe).toHaveBeenCalledOnce();
  });

  it('polls connection status', async () => {
    const controller = createMockController({ connectionStatus: 'connecting' });
    const { result } = renderHook(() => useChat({ controller }));

    expect(result.current.viewModel.connectionStatus).toBe('connecting');

    controller.getConnectionStatus.mockReturnValue('ready');

    await waitFor(() => {
      expect(result.current.viewModel.connectionStatus).toBe('ready');
    }, { timeout: 1000 });
  });
});
