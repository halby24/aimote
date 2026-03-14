import type { HostApi, FileFilter } from './interface.js';
import type { AppConfig } from '@acme/shared-types';
import { defaultAppConfig } from '@acme/shared-types';

/** Null実装 - テストやStorybook用 */
export class NullHostApi implements HostApi {
  async openFileDialog(_filters?: FileFilter[]): Promise<string[] | null> {
    return null;
  }

  async writeClipboard(_text: string): Promise<void> {}

  async readClipboard(): Promise<string> {
    return '';
  }

  async sendNotification(_title: string, _body: string): Promise<void> {}

  async loadConfig(): Promise<AppConfig> {
    return { ...defaultAppConfig };
  }

  async saveConfig(_config: AppConfig): Promise<void> {}
}
