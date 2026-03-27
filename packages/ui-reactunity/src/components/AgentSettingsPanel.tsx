import type { ChatController } from '@acme/app-core';
import { useAgentSettings } from '@acme/ui-common';

/** Extract string value from ReactUnity's C# ChangeEvent<string> or plain string */
function extractInputValue(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'newValue' in raw) return String((raw as Record<string, unknown>).newValue);
  return '';
}

interface Props {
  controller: ChatController;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentSettingsPanel({ controller, isOpen, onClose }: Props): React.ReactElement | null {
  const { viewModel, updateAgent, addAgent, removeAgent, setDefaultAgent, save } =
    useAgentSettings({ controller, isOpen, onClose });

  if (!isOpen) return null;

  return (
    <view className="absolute inset-0 flex items-center justify-center bg-overlay">
      <scroll className="w-[560px] max-h-[80%] rounded-lg bg-surface p-6">
        <text className="mb-4 text-lg font-semibold">
          エージェント設定
        </text>

        {viewModel.isLoading ? (
          <text className="text-sm text-[#666]">読み込み中...</text>
        ) : null}

        {viewModel.error && (
          <view className="mb-3 rounded bg-[#fef2f2] px-3 py-2">
            <text className="text-[13px] text-[#dc2626]">{viewModel.error}</text>
          </view>
        )}

        {!viewModel.isLoading && (
          <>
            {viewModel.agents.map((agent, index) => (
              <view
                key={index}
                className="mb-3 rounded-md border border-border p-3"
              >
                <view className="mb-2 flex flex-row items-center gap-2">
                  <button
                    onClick={() => setDefaultAgent(agent.name)}
                    className={`rounded border px-2.5 py-1 text-xs ${
                      agent.name === viewModel.defaultAgent
                        ? 'border-indigo-400 bg-[#dbeafe]'
                        : 'border-[#ccc] bg-surface'
                    }`}
                  >
                    {agent.name === viewModel.defaultAgent ? '\u25c9 デフォルト' : '\u25cb デフォルト'}
                  </button>
                  <view className="grow" />
                  <button
                    onClick={() => removeAgent(index)}
                    className="rounded border border-[#ccc] bg-surface px-2 py-0.5 text-xs text-[#dc2626]"
                  >
                    削除
                  </button>
                </view>
                <view className="flex flex-col gap-1.5">
                  <view className="flex flex-row items-center gap-2">
                    <text className="w-[60px] shrink-0 text-[13px] text-text-secondary">名前</text>
                    <input
                      value={agent.name}
                      onChange={(...a: unknown[]) => updateAgent(index, 'name', extractInputValue(a[0]))}
                      className="grow rounded border border-[#d1d5db] bg-surface px-2 py-1.5 text-[13px] text-[#111]"
                    />
                  </view>
                  <view className="flex flex-row items-center gap-2">
                    <text className="w-[60px] shrink-0 text-[13px] text-text-secondary">コマンド</text>
                    <input
                      value={agent.command}
                      onChange={(...a: unknown[]) => updateAgent(index, 'command', extractInputValue(a[0]))}
                      className="grow rounded border border-[#d1d5db] bg-surface px-2 py-1.5 text-[13px] text-[#111]"
                    />
                  </view>
                  <view className="flex flex-row items-center gap-2">
                    <text className="w-[60px] shrink-0 text-[13px] text-text-secondary">引数</text>
                    <input
                      value={agent.args}
                      onChange={(...a: unknown[]) => updateAgent(index, 'args', extractInputValue(a[0]))}
                      className="grow rounded border border-[#d1d5db] bg-surface px-2 py-1.5 text-[13px] text-[#111]"
                    />
                  </view>
                  <view className="flex flex-row items-center gap-2">
                    <text className="w-[60px] shrink-0 text-[13px] text-text-secondary">環境変数</text>
                    <input
                      value={agent.env}
                      onChange={(...a: unknown[]) => updateAgent(index, 'env', extractInputValue(a[0]))}
                      className="grow rounded border border-[#d1d5db] bg-surface px-2 py-1.5 font-mono text-[13px] text-[#111]"
                    />
                  </view>
                </view>
              </view>
            ))}

            <button
              onClick={addAgent}
              className="mb-4 w-full rounded-md border border-dashed border-[#ccc] bg-surface-subtle py-1.5 text-[13px]"
            >
              + エージェント追加
            </button>

            <view className="flex flex-row justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-[#ccc] bg-surface px-4 py-1.5 text-[13px]"
              >
                キャンセル
              </button>
              <button
                onClick={() => void save()}
                disabled={viewModel.isSaving}
                className={`rounded-md border-0 bg-indigo-400 px-4 py-1.5 text-[13px] text-white ${
                  viewModel.isSaving ? 'opacity-60' : ''
                }`}
              >
                {viewModel.isSaving ? '保存中...' : '保存'}
              </button>
            </view>
          </>
        )}
      </scroll>
    </view>
  );
}
