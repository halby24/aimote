import React, { useState } from 'react';

interface Props {
  thought: string;
}

export function ThoughtBubble({ thought }: Props): React.ReactElement | null {
  const [collapsed, setCollapsed] = useState(false);

  if (!thought) return null;

  return (
    <div className="border-b border-border bg-surface-accent px-4 py-2 text-[13px]">
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="cursor-pointer font-semibold text-indigo-500 select-none"
      >
        {collapsed ? '\u25b6 Thinking...' : '\u25bc Thinking...'}
      </div>
      {!collapsed && (
        <div className="mt-1 max-h-[120px] overflow-y-auto whitespace-pre-wrap text-text-secondary">
          {thought}
        </div>
      )}
    </div>
  );
}
