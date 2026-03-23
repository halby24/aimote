import { useState, useEffect, useCallback } from 'react';
import type { ChatController } from '@acme/app-core';
import type { AgentConfigViewModel, AgentSettingsViewModel } from '@acme/ui-common';
import type { AgentsFile } from '@acme/shared-types';

export interface UseAgentSettingsOptions {
  controller: ChatController;
  isOpen: boolean;
  onClose: () => void;
}

export interface UseAgentSettingsResult {
  viewModel: AgentSettingsViewModel;
  updateAgent(index: number, field: string, value: string): void;
  addAgent(): void;
  removeAgent(index: number): void;
  setDefaultAgent(name: string): void;
  save(): Promise<void>;
}

function agentsFileToViewModels(file: AgentsFile): AgentConfigViewModel[] {
  return file.agents.map((a) => ({
    name: a.name,
    command: a.command,
    args: a.args.join(', '),
    env: a.env
      ? Object.entries(a.env)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n')
      : '',
    isDefault: a.name === file.defaultAgent,
  }));
}

function viewModelsToAgentsFile(
  agents: AgentConfigViewModel[],
  defaultAgent: string,
): AgentsFile {
  return {
    defaultAgent,
    agents: agents.map((a) => ({
      name: a.name,
      command: a.command,
      args: a.args
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      ...(a.env.trim()
        ? {
            env: Object.fromEntries(
              a.env
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.includes('='))
                .map((line) => {
                  const idx = line.indexOf('=');
                  return [line.slice(0, idx), line.slice(idx + 1)];
                }),
            ),
          }
        : {}),
    })),
  };
}

export function useAgentSettings({
  controller,
  isOpen,
  onClose,
}: UseAgentSettingsOptions): UseAgentSettingsResult {
  const [agents, setAgents] = useState<AgentConfigViewModel[]>([]);
  const [defaultAgent, setDefaultAgent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void controller.getAgentsConfig().then((config) => {
      if (cancelled) return;
      setIsLoading(false);
      if (config) {
        setAgents(agentsFileToViewModels(config));
        setDefaultAgent(config.defaultAgent);
      }
    }).catch((err: unknown) => {
      if (cancelled) return;
      setIsLoading(false);
      setError(err instanceof Error ? err.message : String(err));
    });
    return () => { cancelled = true; };
  }, [isOpen, controller]);

  const updateAgent = useCallback(
    (index: number, field: string, value: string) => {
      setAgents((prev) =>
        prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
      );
    },
    [],
  );

  const addAgent = useCallback(() => {
    setAgents((prev) => [
      ...prev,
      { name: '', command: '', args: '', env: '', isDefault: false },
    ]);
  }, []);

  const removeAgent = useCallback((index: number) => {
    setAgents((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setDefault = useCallback((name: string) => {
    setDefaultAgent(name);
    setAgents((prev) => prev.map((a) => ({ ...a, isDefault: a.name === name })));
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const config = viewModelsToAgentsFile(agents, defaultAgent);
      await controller.saveAgentsConfig(config);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setIsSaving(false);
      return;
    }
    setIsSaving(false);
    onClose();
    // Reconnect sequence (outside isSaving guard so panel is never stuck)
    try {
      await controller.disconnect();
      await controller.connect();
      if (controller.getConnectionStatus() !== 'error') {
        await controller.startSession();
      }
    } catch {
      // Reconnect errors are shown via connectionStatus, not the settings panel
    }
  }, [agents, defaultAgent, controller, onClose]);

  const viewModel: AgentSettingsViewModel = {
    isOpen,
    agents,
    defaultAgent,
    isLoading,
    isSaving,
    error,
  };

  return { viewModel, updateAgent, addAgent, removeAgent, setDefaultAgent: setDefault, save };
}
