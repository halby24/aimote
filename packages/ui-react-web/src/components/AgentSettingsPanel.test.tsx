import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AgentSettingsPanel } from './AgentSettingsPanel.js';
import { createMockController } from '../__testing__/mock-controller.js';

async function waitForLoaded() {
  await waitFor(() => {
    expect(screen.getByPlaceholderText('名前')).toBeInTheDocument();
  });
}

describe('AgentSettingsPanel', () => {
  it('does not render when isOpen is false', () => {
    const controller = createMockController();
    render(<AgentSettingsPanel controller={controller} isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('エージェント設定')).not.toBeInTheDocument();
  });

  it('renders the settings panel when isOpen is true', async () => {
    const controller = createMockController();
    render(<AgentSettingsPanel controller={controller} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('エージェント設定')).toBeInTheDocument();
    await waitForLoaded();
    const nameInput = screen.getByPlaceholderText('名前') as HTMLInputElement;
    expect(nameInput.value).toBe('claude');
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const controller = createMockController();
    const onClose = vi.fn();
    render(<AgentSettingsPanel controller={controller} isOpen={true} onClose={onClose} />);
    await waitForLoaded();

    await user.click(screen.getByText('キャンセル'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('adds a new agent when add button is clicked', async () => {
    const user = userEvent.setup();
    const controller = createMockController();
    render(<AgentSettingsPanel controller={controller} isOpen={true} onClose={vi.fn()} />);
    await waitForLoaded();

    await user.click(screen.getByText('+ エージェント追加'));
    const nameInputs = screen.getAllByPlaceholderText('名前');
    expect(nameInputs).toHaveLength(2);
  });

  it('removes an agent when delete button is clicked', async () => {
    const user = userEvent.setup();
    const controller = createMockController();
    render(<AgentSettingsPanel controller={controller} isOpen={true} onClose={vi.fn()} />);
    await waitForLoaded();

    await user.click(screen.getByLabelText('claude を削除'));
    expect(screen.queryByPlaceholderText('名前')).not.toBeInTheDocument();
  });

  it('calls saveAgentsConfig and reconnects on save', async () => {
    const user = userEvent.setup();
    const controller = createMockController();
    const onClose = vi.fn();
    render(<AgentSettingsPanel controller={controller} isOpen={true} onClose={onClose} />);
    await waitForLoaded();

    await user.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(controller.saveAgentsConfig).toHaveBeenCalledOnce();
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(controller.disconnect).toHaveBeenCalled();
    expect(controller.connect).toHaveBeenCalled();
  });

  it('shows error when loading fails', async () => {
    const controller = createMockController();
    controller.getAgentsConfig.mockRejectedValueOnce(new Error('load failed'));
    render(<AgentSettingsPanel controller={controller} isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('load failed')).toBeInTheDocument();
    });
  });
});
