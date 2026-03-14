import type { AppConfig } from '@acme/shared-types';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface HostApi {
  /** ファイル選択ダイアログを開く */
  openFileDialog(filters?: FileFilter[]): Promise<string[] | null>;

  /** クリップボードにテキストを書き込む */
  writeClipboard(text: string): Promise<void>;

  /** クリップボードからテキストを読み込む */
  readClipboard(): Promise<string>;

  /** 通知を送る */
  sendNotification(title: string, body: string): Promise<void>;

  /** 設定を読み込む */
  loadConfig(): Promise<AppConfig>;

  /** 設定を保存する */
  saveConfig(config: AppConfig): Promise<void>;
}
