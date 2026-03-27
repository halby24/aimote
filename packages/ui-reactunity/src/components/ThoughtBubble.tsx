import { useState } from 'react';

interface Props {
  thought: string;
}

export function ThoughtBubble({ thought }: Props): React.ReactElement | null {
  const [collapsed, setCollapsed] = useState(false);

  if (!thought) return null;

  return (
    <view className="border-b border-border bg-surface-accent px-4 py-2">
      <view onClick={() => setCollapsed(!collapsed)}>
        <text className="text-[13px] font-semibold text-indigo-500">
          {collapsed ? '\u25b6 Thinking...' : '\u25bc Thinking...'}
        </text>
      </view>
      {!collapsed && (
        <scroll className="mt-1 max-h-[120px]">
          <text className="whitespace-pre-wrap text-[13px] text-text-secondary">
            {thought}
          </text>
        </scroll>
      )}
    </view>
  );
}
