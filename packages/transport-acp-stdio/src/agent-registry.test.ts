import { describe, it, expect } from 'vitest';
import { createAgentRegistry, type AgentConfig } from './agent-registry.js';

describe('AgentRegistry', () => {
  it('returns undefined for unregistered name', () => {
    const registry = createAgentRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('registers and retrieves an agent config', () => {
    const registry = createAgentRegistry();
    const config: AgentConfig = {
      name: 'claude',
      command: 'claude',
      args: ['--acp-stdio'],
    };
    registry.register(config);
    expect(registry.get('claude')).toEqual(config);
  });

  it('lists all registered configs', () => {
    const registry = createAgentRegistry();
    registry.register({ name: 'a', command: 'a', args: [] });
    registry.register({ name: 'b', command: 'b', args: ['--flag'] });
    expect(registry.list()).toHaveLength(2);
  });

  it('overwrites on duplicate name', () => {
    const registry = createAgentRegistry();
    registry.register({ name: 'agent', command: 'old', args: [] });
    registry.register({ name: 'agent', command: 'new', args: ['--x'] });
    expect(registry.get('agent')?.command).toBe('new');
  });

  it('initializes with defaults', () => {
    const defaults: AgentConfig[] = [
      { name: 'claude', command: 'claude', args: ['--acp-stdio'] },
      { name: 'codex', command: 'codex', args: ['--acp'] },
    ];
    const registry = createAgentRegistry(defaults);
    expect(registry.list()).toHaveLength(2);
    expect(registry.get('claude')?.command).toBe('claude');
  });

  it('list returns empty array when no agents registered', () => {
    const registry = createAgentRegistry();
    expect(registry.list()).toEqual([]);
  });
});
