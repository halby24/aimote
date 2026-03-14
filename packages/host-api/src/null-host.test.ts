import { describe, it, expect } from 'vitest';
import { NullHostApi } from './null-host.js';
import { defaultAppConfig } from '@acme/shared-types';

describe('NullHostApi', () => {
  it('openFileDialog returns null', async () => {
    const api = new NullHostApi();
    expect(await api.openFileDialog()).toBeNull();
  });

  it('openFileDialog returns null with filters', async () => {
    const api = new NullHostApi();
    expect(await api.openFileDialog([{ name: 'Text', extensions: ['txt'] }])).toBeNull();
  });

  it('readClipboard returns empty string', async () => {
    const api = new NullHostApi();
    expect(await api.readClipboard()).toBe('');
  });

  it('writeClipboard resolves without error', async () => {
    const api = new NullHostApi();
    await expect(api.writeClipboard('hello')).resolves.toBeUndefined();
  });

  it('sendNotification resolves without error', async () => {
    const api = new NullHostApi();
    await expect(api.sendNotification('Title', 'Body')).resolves.toBeUndefined();
  });

  it('loadConfig returns a copy of defaultAppConfig', async () => {
    const api = new NullHostApi();
    const config = await api.loadConfig();
    expect(config).toEqual(defaultAppConfig);
  });

  it('loadConfig returns a new object each call', async () => {
    const api = new NullHostApi();
    const c1 = await api.loadConfig();
    const c2 = await api.loadConfig();
    expect(c1).not.toBe(c2);
  });

  it('saveConfig resolves without error', async () => {
    const api = new NullHostApi();
    await expect(api.saveConfig({ theme: 'dark', language: 'ja' })).resolves.toBeUndefined();
  });
});
