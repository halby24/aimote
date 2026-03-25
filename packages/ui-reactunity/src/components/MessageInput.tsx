import { useState, useCallback } from 'react';
import type { ChatInputViewModel } from '@acme/ui-common';

interface Props {
  input: ChatInputViewModel;
  onSend: (text: string) => Promise<void>;
}

export function MessageInput({ input, onSend }: Props): React.ReactElement {
  const [text, setText] = useState('');

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || input.isDisabled) return;
    setText('');
    await onSend(trimmed);
  }, [text, input.isDisabled, onSend]);

  const handleKeyDown = useCallback(
    (e: { key: string; shiftKey?: boolean; preventDefault: () => void }) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  return (
    <view
      style={{
        padding: 12,
        paddingLeft: 16,
        paddingRight: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      <input
        value={text}
        onValueChange={(val: string) => setText(val)}
        onKeyDown={handleKeyDown}
        disabled={input.isDisabled}
        placeholder="メッセージを入力... (Enter で送信)"
        style={{
          flexGrow: 1,
          padding: 8,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#ccc',
          fontSize: 14,
          backgroundColor: input.isDisabled ? '#f9f9f9' : '#fff',
        }}
      />
      <button
        onClick={() => void handleSend()}
        disabled={input.isDisabled || !text.trim()}
        style={{
          padding: 8,
          paddingLeft: 20,
          paddingRight: 20,
          borderRadius: 8,
          borderWidth: 0,
          backgroundColor: input.isDisabled || !text.trim() ? '#ccc' : '#0078d4',
          color: '#fff',
          fontSize: 14,
          height: 40,
        }}
      >
        送信
      </button>
    </view>
  );
}
