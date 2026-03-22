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

const statusColorMap: Record<string, string> = {
  ready: '#22c55e',
  connecting: '#f59e0b',
  error: '#ef4444',
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
  const color = statusColorMap[connectionStatus] ?? '#94a3b8';
  const label = connectionStatus === 'error' && configError
    ? configError
    : (statusLabelMap[connectionStatus] ?? '\u672a\u63a5\u7d9a');

  return (
    <header
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title ?? 'AI \u30c1\u30e3\u30c3\u30c8'}
        </h1>
        {currentMode && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#e0e7ff',
              color: '#4338ca',
            }}
          >
            {currentMode}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {usage && <UsageBar usage={usage} />}
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: color,
              display: 'inline-block',
            }}
          />
          {label}
        </span>
        <button
          onClick={onSettingsClick}
          aria-label="設定"
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
          }}
        >
          {'\u2699'}
        </button>
        {isTurnActive && (
          <button
            onClick={onCancel}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            \u30ad\u30e3\u30f3\u30bb\u30eb
          </button>
        )}
      </div>
    </header>
  );
}
