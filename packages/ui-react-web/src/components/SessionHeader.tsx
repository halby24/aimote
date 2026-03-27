import React from 'react';
import type { UsageViewModel } from '@acme/ui-common';
import { UsageBar } from './UsageBar.js';

interface Props {
  title: string | null;
  currentMode: string | null;
  usage: UsageViewModel | null;
  connectionStatus: string;
  isTurnActive: boolean;
  onCancel: () => void;
  onSettingsClick: () => void;
  configError?: string | null;
}

const statusColorClass: Record<string, string> = {
  ready: 'text-success',
  connecting: 'text-warning',
  error: 'text-error',
};

const statusDotClass: Record<string, string> = {
  ready: 'bg-success',
  connecting: 'bg-warning',
  error: 'bg-error',
};

const statusLabelMap: Record<string, string> = {
  ready: '\u63a5\u7d9a\u4e2d',
  connecting: '\u63a5\u7d9a\u3057\u3066\u3044\u307e\u3059...',
  error: '\u30a8\u30e9\u30fc',
};

export function SessionHeader({
  title,
  currentMode,
  usage,
  connectionStatus,
  isTurnActive,
  onCancel,
  onSettingsClick,
  configError,
}: Props): React.ReactElement {
  const label = connectionStatus === 'error' && configError
    ? configError
    : (statusLabelMap[connectionStatus] ?? '\u672a\u63a5\u7d9a');

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="m-0 truncate text-lg font-semibold">
          {title ?? 'AI \u30c1\u30e3\u30c3\u30c8'}
        </h1>
        {currentMode && (
          <span className="rounded bg-[#e0e7ff] px-1.5 py-0.5 text-[11px] text-indigo-700">
            {currentMode}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {usage && <UsageBar usage={usage} />}
        <span
          className={`flex items-center gap-1 text-xs ${
            statusColorClass[connectionStatus] ?? 'text-[#94a3b8]'
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              statusDotClass[connectionStatus] ?? 'bg-[#94a3b8]'
            }`}
          />
          {label}
        </span>
        <button
          onClick={onSettingsClick}
          aria-label="設定"
          className="cursor-pointer rounded border border-[#ccc] bg-surface px-2 py-1 text-base leading-none"
        >
          {'\u2699'}
        </button>
        {isTurnActive && (
          <button
            onClick={onCancel}
            className="cursor-pointer rounded border border-[#ccc] bg-surface px-2.5 py-1 text-xs"
          >
            キャンセル
          </button>
        )}
      </div>
    </header>
  );
}
