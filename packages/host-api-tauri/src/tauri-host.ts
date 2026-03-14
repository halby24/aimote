import type { HostApi, FileFilter } from '@acme/host-api';
import type { AppConfig } from '@acme/shared-types';
import { defaultAppConfig } from '@acme/shared-types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModule = any;

/**
 * Tauri v2 向け HostApi 実装。
 * @tauri-apps/api が利用可能な環境でのみ動作します。
 *
 * Note: @tauri-apps/api は optional peer dependency なので、
 * 実際に使う場合は apps/desktop-tauri で依存を追加してください。
 */
export class TauriHostApi implements HostApi {
  async openFileDialog(_filters?: FileFilter[]): Promise<string[] | null> {
    try {
      const mod: AnyModule = await import('@tauri-apps/plugin-dialog' as string);
      const result: unknown = await (mod.open as (opts: unknown) => Promise<unknown>)({ multiple: true });
      if (result === null) return null;
      return Array.isArray(result) ? (result as string[]) : [result as string];
    } catch {
      console.warn('[host-api-tauri] @tauri-apps/plugin-dialog not available');
      return null;
    }
  }

  async writeClipboard(text: string): Promise<void> {
    try {
      const mod: AnyModule = await import('@tauri-apps/plugin-clipboard-manager' as string);
      await (mod.writeText as (t: string) => Promise<void>)(text);
    } catch {
      await navigator.clipboard.writeText(text);
    }
  }

  async readClipboard(): Promise<string> {
    try {
      const mod: AnyModule = await import('@tauri-apps/plugin-clipboard-manager' as string);
      const result: unknown = await (mod.readText as () => Promise<unknown>)();
      return typeof result === 'string' ? result : '';
    } catch {
      return navigator.clipboard.readText();
    }
  }

  async sendNotification(title: string, body: string): Promise<void> {
    try {
      const mod: AnyModule = await import('@tauri-apps/plugin-notification' as string);
      await (mod.sendNotification as (opts: unknown) => Promise<void>)({ title, body });
    } catch {
      console.info(`[Notification] ${title}: ${body}`);
    }
  }

  async loadConfig(): Promise<AppConfig> {
    try {
      const mod: AnyModule = await import('@tauri-apps/plugin-store' as string);
      const store: AnyModule = await (mod.load as (path: string, opts: unknown) => Promise<AnyModule>)(
        'config.json',
        { autoSave: false },
      );
      const theme = (await store.get('theme')) as AppConfig['theme'] | undefined;
      const language = (await store.get('language')) as string | undefined;
      return {
        theme: theme ?? defaultAppConfig.theme,
        language: language ?? defaultAppConfig.language,
      };
    } catch {
      return { ...defaultAppConfig };
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      const mod: AnyModule = await import('@tauri-apps/plugin-store' as string);
      const store: AnyModule = await (mod.load as (path: string, opts: unknown) => Promise<AnyModule>)(
        'config.json',
        { autoSave: false },
      );
      await store.set('theme', config.theme);
      await store.set('language', config.language);
      await store.save();
    } catch {
      console.warn('[host-api-tauri] Failed to save config');
    }
  }
}
