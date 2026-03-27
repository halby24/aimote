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

  const isDisabledOrEmpty = input.isDisabled || !text.trim();

  return (
    <div className="flex items-end gap-2 border-t border-border px-4 py-3">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={input.isDisabled}
        placeholder="メッセージを入力... (Enter で送信)"
        rows={2}
        className={`flex-1 resize-none rounded-lg border border-[#ccc] px-3 py-2 font-[inherit] text-sm outline-none ${
          input.isDisabled ? 'bg-[#f9f9f9]' : 'bg-surface'
        }`}
      />
      <button
        onClick={() => void handleSend()}
        disabled={isDisabledOrEmpty}
        className={`h-10 whitespace-nowrap rounded-lg border-none px-5 text-sm text-white ${
          isDisabledOrEmpty
            ? 'cursor-not-allowed bg-[#ccc]'
            : 'cursor-pointer bg-primary'
        }`}
      >
        送信
      </button>
    </div>
  );
}
