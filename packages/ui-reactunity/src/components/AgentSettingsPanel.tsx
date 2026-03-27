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

const fieldRowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
} as const;

const labelStyle = {
  fontSize: 13,
  color: '#555',
  width: 60,
  flexShrink: 0,
} as const;

const inputStyle = {
  padding: 6,
  paddingLeft: 8,
  paddingRight: 8,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: '#d1d5db',
  fontSize: 13,
  flexGrow: 1,
  color: '#111',
  backgroundColor: '#fff',
} as const;

export function AgentSettingsPanel({ controller, isOpen, onClose }: Props): React.ReactElement | null {
  const { viewModel, updateAgent, addAgent, removeAgent, setDefaultAgent, save } =
    useAgentSettings({ controller, isOpen, onClose });

  if (!isOpen) return null;

  return (
    <view
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <scroll
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 24,
          width: 560,
          maxHeight: '80%',
        }}
      >
        <text style={{ marginBottom: 16, fontSize: 18, fontWeight: '600' }}>
          エージェント設定
        </text>

        {viewModel.isLoading ? (
          <text style={{ fontSize: 14, color: '#666' }}>読み込み中...</text>
        ) : null}

        {viewModel.error && (
          <view
            style={{
              padding: 8,
              paddingLeft: 12,
              paddingRight: 12,
              backgroundColor: '#fef2f2',
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            <text style={{ color: '#dc2626', fontSize: 13 }}>{viewModel.error}</text>
          </view>
        )}

        {!viewModel.isLoading && (
          <>
            {viewModel.agents.map((agent, index) => (
              <view
                key={index}
                style={{
                  borderWidth: 1,
                  borderColor: '#e0e0e0',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <view
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <button
                    onClick={() => setDefaultAgent(agent.name)}
                    style={{
                      padding: 4,
                      paddingLeft: 10,
                      paddingRight: 10,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: agent.name === viewModel.defaultAgent ? '#3b82f6' : '#ccc',
                      backgroundColor: agent.name === viewModel.defaultAgent ? '#dbeafe' : '#fff',
                      fontSize: 12,
                    }}
                  >
                    {agent.name === viewModel.defaultAgent ? '\u25c9 デフォルト' : '\u25cb デフォルト'}
                  </button>
                  <view style={{ flexGrow: 1 }} />
                  <button
                    onClick={() => removeAgent(index)}
                    style={{
                      padding: 2,
                      paddingLeft: 8,
                      paddingRight: 8,
                      borderWidth: 1,
                      borderColor: '#ccc',
                      borderRadius: 4,
                      backgroundColor: '#fff',
                      fontSize: 12,
                      color: '#dc2626',
                    }}
                  >
                    削除
                  </button>
                </view>
                <view style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <view style={fieldRowStyle}>
                    <text style={labelStyle}>名前</text>
                    <input
                      value={agent.name}
                      onChange={(...a: unknown[]) => updateAgent(index, 'name', extractInputValue(a[0]))}
                      style={inputStyle}
                    />
                  </view>
                  <view style={fieldRowStyle}>
                    <text style={labelStyle}>コマンド</text>
                    <input
                      value={agent.command}
                      onChange={(...a: unknown[]) => updateAgent(index, 'command', extractInputValue(a[0]))}
                      style={inputStyle}
                    />
                  </view>
                  <view style={fieldRowStyle}>
                    <text style={labelStyle}>引数</text>
                    <input
                      value={agent.args}
                      onChange={(...a: unknown[]) => updateAgent(index, 'args', extractInputValue(a[0]))}
                      style={inputStyle}
                    />
                  </view>
                  <view style={fieldRowStyle}>
                    <text style={labelStyle}>環境変数</text>
                    <input
                      value={agent.env}
                      onChange={(...a: unknown[]) => updateAgent(index, 'env', extractInputValue(a[0]))}
                      style={{ ...inputStyle, fontFamily: 'monospace' }}
                    />
                  </view>
                </view>
              </view>
            ))}

            <button
              onClick={addAgent}
              style={{
                padding: 6,
                paddingLeft: 14,
                paddingRight: 14,
                borderRadius: 6,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#ccc',
                backgroundColor: '#fafafa',
                fontSize: 13,
                width: '100%',
                marginBottom: 16,
              }}
            >
              + エージェント追加
            </button>

            <view style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  padding: 6,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#ccc',
                  backgroundColor: '#fff',
                  fontSize: 13,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => void save()}
                disabled={viewModel.isSaving}
                style={{
                  padding: 6,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderRadius: 6,
                  borderWidth: 0,
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontSize: 13,
                  opacity: viewModel.isSaving ? 0.6 : 1,
                }}
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
