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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '560px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>
          エージェント設定
        </h2>

        {viewModel.isLoading && <p>読み込み中...</p>}

        {viewModel.error && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '4px',
              fontSize: '13px',
              marginBottom: '12px',
            }}
          >
            {viewModel.error}
          </div>
        )}

        {!viewModel.isLoading && (
          <>
            {viewModel.agents.map((agent, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="defaultAgent"
                      checked={agent.name === viewModel.defaultAgent}
                      onChange={() => setDefaultAgent(agent.name)}
                    />
                    デフォルト
                  </label>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => removeAgent(index)}
                    aria-label={`${agent.name || 'agent'} を削除`}
                    style={{
                      padding: '2px 8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#dc2626',
                    }}
                  >
                    削除
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    placeholder="名前"
                    value={agent.name}
                    onChange={(e) => updateAgent(index, 'name', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    placeholder="コマンド"
                    value={agent.command}
                    onChange={(e) => updateAgent(index, 'command', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    placeholder="引数 (カンマ区切り)"
                    value={agent.args}
                    onChange={(e) => updateAgent(index, 'args', e.target.value)}
                    style={inputStyle}
                  />
                  <textarea
                    placeholder="環境変数 (KEY=VALUE、1行ずつ)"
                    value={agent.env}
                    onChange={(e) => updateAgent(index, 'env', e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addAgent}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px dashed #ccc',
                backgroundColor: '#fafafa',
                cursor: 'pointer',
                fontSize: '13px',
                width: '100%',
                marginBottom: '16px',
              }}
            >
              + エージェント追加
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => void save()}
                disabled={viewModel.isSaving}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  cursor: viewModel.isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: viewModel.isSaving ? 0.6 : 1,
                }}
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

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: '4px',
  border: '1px solid #d1d5db',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
};
