import type { MessageViewModel } from '@acme/ui-common';

interface Props {
  messages: readonly MessageViewModel[];
}

export function MessageList({ messages }: Props): React.ReactElement {
  return (
    <scroll className="flex grow flex-col gap-3 bg-surface-subtle p-4">
      {messages.length === 0 && (
        <text className="mt-10 text-center text-text-muted">
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
    <view className={`flex flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
      <view
        className={`max-w-[70%] rounded-[18px] px-3.5 py-2.5 ${
          isUser ? 'bg-primary text-white' : 'bg-surface-neutral text-text'
        }`}
      >
        <text className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
          {message.isStreaming ? '\u258c' : ''}
        </text>
        {message.isError ? (
          <text className="ml-2 text-xs text-error">
            {'\u26a0'} エラー
          </text>
        ) : null}
      </view>
    </view>
  );
}
