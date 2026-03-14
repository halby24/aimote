import type { MessageViewModel, ChatScreenViewModel } from '@acme/ui-common';

/**
 * ReactUnity 向け ChatScreen コンポーネントの Props 定義。
 * ReactUnity 環境では React DOM の代わりに ReactUnity のホストを使うため、
 * JSX は避けて props 型定義だけ置く。
 */
export interface ChatScreenProps {
  viewModel: ChatScreenViewModel;
  onSend: (text: string) => Promise<void>;
  onCancel: () => Promise<void>;
}

export interface MessageItemProps {
  message: MessageViewModel;
}

export interface MessageInputProps {
  value: string;
  isDisabled: boolean;
  onSend: (text: string) => Promise<void>;
}
