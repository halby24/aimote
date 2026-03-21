export interface AgentConfig {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
}

export interface AgentRegistry {
  get(name: string): AgentConfig | undefined;
  list(): AgentConfig[];
  register(config: AgentConfig): void;
}

export function createAgentRegistry(defaults?: AgentConfig[]): AgentRegistry {
  const agents = new Map<string, AgentConfig>();

  if (defaults) {
    for (const config of defaults) {
      agents.set(config.name, config);
    }
  }

  return {
    get(name: string): AgentConfig | undefined {
      return agents.get(name);
    },

    list(): AgentConfig[] {
      return [...agents.values()];
    },

    register(config: AgentConfig): void {
      agents.set(config.name, config);
    },
  };
}
