export interface AppConfig {
  readonly theme: 'light' | 'dark' | 'system';
  readonly language: string;
}

export const defaultAppConfig: AppConfig = {
  theme: 'system',
  language: 'en',
};

export interface AgentConfig {
  readonly name: string;
  readonly command: string;
  readonly args: string[];
  readonly env?: Record<string, string>;
}

export interface AgentsFile {
  readonly defaultAgent: string;
  readonly agents: AgentConfig[];
}
