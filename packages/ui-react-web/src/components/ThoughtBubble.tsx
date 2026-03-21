import React, { useState } from 'react';

interface Props {
  thought: string;
}

export function ThoughtBubble({ thought }: Props): React.ReactElement | null {
  const [collapsed, setCollapsed] = useState(false);

  if (!thought) return null;

  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f0f4ff',
        fontSize: '13px',
      }}
    >
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          cursor: 'pointer',
          color: '#6366f1',
          fontWeight: 600,
          userSelect: 'none',
        }}
      >
        {collapsed ? '\u25b6 Thinking...' : '\u25bc Thinking...'}
      </div>
      {!collapsed && (
        <div
          style={{
            marginTop: '4px',
            color: '#555',
            whiteSpace: 'pre-wrap',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
        >
          {thought}
        </div>
      )}
    </div>
  );
}
