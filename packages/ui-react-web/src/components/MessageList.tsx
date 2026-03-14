import React from 'react';
import type { MessageViewModel } from '@acme/ui-common';

interface Props {
  messages: readonly MessageViewModel[];
}

export function MessageList({ messages }: Props): React.ReactElement {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {messages.length === 0 && (
        <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
          メッセージを送信してください
        </p>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: MessageViewModel }): React.ReactElement {
  const isUser = message.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          backgroundColor: isUser ? '#0078d4' : '#f0f0f0',
          color: isUser ? '#fff' : '#333',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
        {message.isStreaming && (
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '14px',
              backgroundColor: 'currentColor',
              marginLeft: '2px',
              animation: 'blink 1s step-end infinite',
            }}
          />
        )}
        {message.isError && (
          <span style={{ color: '#ff4444', marginLeft: '8px', fontSize: '12px' }}>
            ⚠ エラー
          </span>
        )}
      </div>
    </div>
  );
}
