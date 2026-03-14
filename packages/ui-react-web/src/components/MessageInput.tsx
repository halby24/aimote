import React, { useState, useCallback, useRef } from 'react';
import type { ChatInputViewModel } from '@acme/ui-common';

interface Props {
  input: ChatInputViewModel;
  onSend: (text: string) => Promise<void>;
}

export function MessageInput({ input, onSend }: Props): React.ReactElement {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || input.isDisabled) return;
    setText('');
    await onSend(trimmed);
    textareaRef.current?.focus();
  }, [text, input.isDisabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={input.isDisabled}
        placeholder={input.isDisabled ? '接続中...' : 'メッセージを入力... (Enter で送信)'}
        rows={2}
        style={{
          flex: 1,
          resize: 'none',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #ccc',
          fontSize: '14px',
          fontFamily: 'inherit',
          outline: 'none',
          backgroundColor: input.isDisabled ? '#f9f9f9' : '#fff',
        }}
      />
      <button
        onClick={() => void handleSend()}
        disabled={input.isDisabled || !text.trim()}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: input.isDisabled || !text.trim() ? '#ccc' : '#0078d4',
          color: '#fff',
          fontSize: '14px',
          cursor: input.isDisabled || !text.trim() ? 'not-allowed' : 'pointer',
          height: '40px',
          whiteSpace: 'nowrap',
        }}
      >
        送信
      </button>
    </div>
  );
}
