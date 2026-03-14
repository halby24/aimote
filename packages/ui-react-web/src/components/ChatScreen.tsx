import React, { useEffect } from 'react';
import type { ChatController } from '@acme/app-core';
import { useChat } from '../hooks/useChat.js';
import { MessageList } from './MessageList.js';
import { MessageInput } from './MessageInput.js';

interface Props {
  controller: ChatController;
}

export function ChatScreen({ controller }: Props): React.ReactElement {
  const { viewModel, sendMessage, cancel } = useChat({ controller });

  useEffect(() => {
    void (async () => {
      await controller.connect();
      await controller.startSession();
    })();
    return () => {
      void controller.disconnect();
    };
  }, [controller]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>AI チャット</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={viewModel.connectionStatus} />
          {viewModel.messages.some((m) => m.isStreaming) && (
            <button
              onClick={() => void cancel()}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              キャンセル
            </button>
          )}
        </div>
      </header>
      <MessageList messages={viewModel.messages} />
      <MessageInput input={viewModel.input} onSend={sendMessage} />
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}): React.ReactElement {
  const color =
    status === 'ready'
      ? '#22c55e'
      : status === 'connecting'
        ? '#f59e0b'
        : status === 'error'
          ? '#ef4444'
          : '#94a3b8';
  const label =
    status === 'ready'
      ? '接続中'
      : status === 'connecting'
        ? '接続しています...'
        : status === 'error'
          ? 'エラー'
          : '未接続';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color }}>
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}
