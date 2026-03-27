import { useState, useCallback, useRef } from 'react';
import type { ChatInputViewModel } from '@acme/ui-common';

/** Extract string from ReactUnity's C# ChangeEvent<string> or plain string */
function extractValue(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'newValue' in raw)
    return String((raw as Record<string, unknown>).newValue);
  return '';
}

interface Props {
  input: ChatInputViewModel;
  onSend: (text: string) => Promise<void>;
}

export function MessageInput({ input, onSend }: Props): React.ReactElement {
  const [hasText, setHasText] = useState(false);
  const textRef = useRef('');

  const handleSend = useCallback(async () => {
    const trimmed = textRef.current.trim();
    if (!trimmed || input.isDisabled) return;
    textRef.current = '';
    setHasText(false);
    await onSend(trimmed);
  }, [input.isDisabled, onSend]);

  const handleChange = useCallback((...args: unknown[]) => {
    const val = extractValue(args[0]);
    textRef.current = val;
    setHasText(val.trim().length > 0);
  }, []);

  const isDisabledOrEmpty = input.isDisabled || !hasText;

  return (
    <view className="flex flex-row items-end gap-2 border-t border-border px-4 py-3">
      <input
        onChange={handleChange}
        onReturn={() => void handleSend()}
        disabled={input.isDisabled}
        placeholder="メッセージを入力... (Enter で送信)"
        className={`grow shrink basis-0 rounded-lg border border-[#ccc] px-3 py-2 text-sm text-[#111] ${
          input.isDisabled ? 'bg-[#f9f9f9]' : 'bg-surface'
        }`}
      />
      <button
        onClick={() => void handleSend()}
        disabled={isDisabledOrEmpty}
        className={`h-10 shrink-0 rounded-lg border-0 px-5 text-sm text-white ${
          isDisabledOrEmpty ? 'bg-[#ccc]' : 'bg-primary'
        }`}
      >
        送信
      </button>
    </view>
  );
}
