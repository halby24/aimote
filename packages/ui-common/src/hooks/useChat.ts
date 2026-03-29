import { useState, useEffect, useCallback, useRef } from 'react';
import type { Observable } from 'rxjs';
import type { ChatController } from '@acme/app-core';
import type { ChatScreenViewModel } from '../view-models.js';
import { buildChatScreenViewModel } from '../presenter.js';
import type { ConnectionStatus, ConfigValidationResult } from '@acme/shared-types';

export interface UseChatOptions {
  controller: ChatController;
}

export interface UseChatResult {
  viewModel: ChatScreenViewModel;
  sendMessage: (text: string) => Promise<void>;
  cancel: () => Promise<void>;
  approve: (requestId: string, optionId: string) => Promise<void>;
}

function useObservableState<T>(observable$: Observable<T>, initial: T): T {
  const [state, setState] = useState(initial);
  useEffect(() => {
    const sub = observable$.subscribe(setState);
    return () => sub.unsubscribe();
  }, [observable$]);
  return state;
}

export function useChat({ controller }: UseChatOptions): UseChatResult {
  const store = useObservableState(
    controller.storeManager.state$,
    controller.storeManager.getStore(),
  );
  const connectionStatus = useObservableState<ConnectionStatus>(
    controller.connectionStatus$,
    controller.getConnectionStatus(),
  );
  const configValidation = useObservableState<ConfigValidationResult | null>(
    controller.configValidation$,
    controller.getConfigValidation(),
  );
  const connectError = useObservableState<string | null>(
    controller.connectError$,
    controller.getConnectError(),
  );
  const [inputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  const viewModel = buildChatScreenViewModel({
    store,
    connectionStatus,
    inputValue,
    isSubmitting,
    configValidation,
    connectError,
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

  const approve = useCallback(async (requestId: string, optionId: string) => {
    await controllerRef.current.approve(requestId, optionId);
  }, []);

  return { viewModel, sendMessage, cancel, approve };
}
