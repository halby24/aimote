import React from 'react';
import type { MessageViewModel } from '@acme/ui-common';

interface Props {
  messages: readonly MessageViewModel[];
}

export function MessageList({ messages }: Props): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.length === 0 && (
        <p className="mt-10 text-center text-text-muted">
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-t-[18px] rounded-bl-[18px] rounded-br-[4px] bg-primary text-white'
            : 'rounded-t-[18px] rounded-br-[18px] rounded-bl-[4px] bg-surface-neutral text-text'
        }`}
      >
        {message.content}
        {message.isStreaming && (
          <span className="ml-0.5 inline-block h-3.5 w-2 animate-blink bg-current" />
        )}
        {message.isError && (
          <span className="ml-2 text-xs text-[#ff4444]">
            ⚠ エラー
          </span>
        )}
      </div>
    </div>
  );
}
