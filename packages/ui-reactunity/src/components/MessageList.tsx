import type { MessageViewModel } from '@acme/ui-common';

interface Props {
  messages: readonly MessageViewModel[];
}

export function MessageList({ messages }: Props): React.ReactElement {
  return (
    <scroll
      style={{
        flexGrow: 1,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {messages.length === 0 && (
        <text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
          メッセージを送信してください
        </text>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </scroll>
  );
}

function MessageBubble({ message }: { message: MessageViewModel }): React.ReactElement {
  const isUser = message.role === 'user';
  return (
    <view
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <view
        style={{
          maxWidth: '70%',
          padding: 10,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 18,
          backgroundColor: isUser ? '#0078d4' : '#f0f0f0',
          color: isUser ? '#fff' : '#333',
        }}
      >
        <text style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {message.content}
          {message.isStreaming && '\u258c'}
        </text>
        {message.isError && (
          <text style={{ color: '#ff4444', marginLeft: 8, fontSize: 12 }}>
            {'\u26a0'} エラー
          </text>
        )}
      </view>
    </view>
  );
}
