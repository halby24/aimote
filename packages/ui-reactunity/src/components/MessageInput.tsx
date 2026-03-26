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
  // Track whether the button should be enabled (re-render only for this)
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

  return (
    <view
      style={{
        padding: 12,
        paddingLeft: 16,
        paddingRight: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      <input
        onChange={handleChange}
        onReturn={() => void handleSend()}
        disabled={input.isDisabled}
        placeholder="メッセージを入力... (Enter で送信)"
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
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
        disabled={input.isDisabled || !hasText}
        style={{
          flexShrink: 0,
          padding: 8,
          paddingLeft: 20,
          paddingRight: 20,
          borderRadius: 8,
          borderWidth: 0,
          backgroundColor: input.isDisabled || !hasText ? '#ccc' : '#0078d4',
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
