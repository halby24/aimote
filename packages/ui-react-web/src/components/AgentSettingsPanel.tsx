import React from 'react';
import type { ChatController } from '@acme/app-core';
import { useAgentSettings } from '../hooks/useAgentSettings.js';

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
    <div
      data-testid="agent-settings-overlay"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-overlay"
    >
      <div className="w-[560px] max-h-[80vh] overflow-auto rounded-lg bg-surface p-6 shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
        <h2 className="m-0 mb-4 text-lg font-semibold">
          エージェント設定
        </h2>

        {viewModel.isLoading && <p>読み込み中...</p>}

        {viewModel.error && (
          <div className="mb-3 rounded bg-[#fef2f2] px-3 py-2 text-[13px] text-[#dc2626]">
            {viewModel.error}
          </div>
        )}

        {!viewModel.isLoading && (
          <>
            {viewModel.agents.map((agent, index) => (
              <div
                key={index}
                className="mb-3 rounded-md border border-border p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[13px]">
                    <input
                      type="radio"
                      name="defaultAgent"
                      checked={agent.name === viewModel.defaultAgent}
                      onChange={() => setDefaultAgent(agent.name)}
                    />
                    デフォルト
                  </label>
                  <div className="flex-1" />
                  <button
                    onClick={() => removeAgent(index)}
                    aria-label={`${agent.name || 'agent'} を削除`}
                    className="cursor-pointer rounded border border-[#ccc] bg-surface px-2 py-0.5 text-xs text-[#dc2626]"
                  >
                    削除
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <input
                    placeholder="名前"
                    value={agent.name}
                    onChange={(e) => updateAgent(index, 'name', e.target.value)}
                    className="w-full rounded border border-[#d1d5db] px-2 py-1.5 text-[13px]"
                  />
                  <input
                    placeholder="コマンド"
                    value={agent.command}
                    onChange={(e) => updateAgent(index, 'command', e.target.value)}
                    className="w-full rounded border border-[#d1d5db] px-2 py-1.5 text-[13px]"
                  />
                  <input
                    placeholder="引数 (カンマ区切り)"
                    value={agent.args}
                    onChange={(e) => updateAgent(index, 'args', e.target.value)}
                    className="w-full rounded border border-[#d1d5db] px-2 py-1.5 text-[13px]"
                  />
                  <textarea
                    placeholder="環境変数 (KEY=VALUE、1行ずつ)"
                    value={agent.env}
                    onChange={(e) => updateAgent(index, 'env', e.target.value)}
                    rows={2}
                    className="w-full resize-y rounded border border-[#d1d5db] px-2 py-1.5 font-mono text-[13px]"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addAgent}
              className="mb-4 w-full cursor-pointer rounded-md border border-dashed border-[#ccc] bg-surface-subtle py-1.5 text-[13px]"
            >
              + エージェント追加
            </button>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="cursor-pointer rounded-md border border-[#ccc] bg-surface px-4 py-1.5 text-[13px]"
              >
                キャンセル
              </button>
              <button
                onClick={() => void save()}
                disabled={viewModel.isSaving}
                className={`rounded-md border-none bg-indigo-400 px-4 py-1.5 text-[13px] text-white ${
                  viewModel.isSaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
              >
                {viewModel.isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
