import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatController } from '@acme/app-core';
import type { ChatScreenViewModel } from '@acme/ui-common';
import { buildChatScreenViewModel } from '@acme/ui-common';
import type { ConnectionStatus } from '@acme/shared-types';

export interface UseChatOptions {
  controller: ChatController;
}

export interface UseChatResult {
  viewModel: ChatScreenViewModel;
  sendMessage: (text: string) => Promise<void>;
  cancel: () => Promise<void>;
}

export function useChat({ controller }: UseChatOptions): UseChatResult {
  const [store, setStore] = useState(() => controller.storeManager.getStore());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    () => controller.getConnectionStatus(),
  );
  const [inputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  useEffect(() => {
    const unsub = controller.subscribe((s) => setStore(s));
    // Poll connection status
    const timer = setInterval(() => {
      setConnectionStatus(controllerRef.current.getConnectionStatus());
    }, 300);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [controller]);

  const viewModel = buildChatScreenViewModel({
    store,
    connectionStatus,
    inputValue,
    isSubmitting,
  });

  const sendMessage = useCallback(async (text: string) => {
    setIsSubmitting(true);
    try {
      await controllerRef.current.sendMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    await controllerRef.current.cancel();
  }, []);

  return { viewModel, sendMessage, cancel };
}
