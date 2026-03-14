export interface AppConfig {
  readonly theme: 'light' | 'dark' | 'system';
  readonly language: string;
}

export const defaultAppConfig: AppConfig = {
  theme: 'system',
  language: 'en',
};
