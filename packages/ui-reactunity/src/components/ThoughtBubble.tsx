import { useState } from 'react';

interface Props {
  thought: string;
}

export function ThoughtBubble({ thought }: Props): React.ReactElement | null {
  const [collapsed, setCollapsed] = useState(false);

  if (!thought) return null;

  return (
    <view
      style={{
        padding: 8,
        paddingLeft: 16,
        paddingRight: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#f0f4ff',
      }}
    >
      <view onClick={() => setCollapsed(!collapsed)}>
        <text style={{ color: '#6366f1', fontWeight: '600', fontSize: 13 }}>
          {collapsed ? '\u25b6 Thinking...' : '\u25bc Thinking...'}
        </text>
      </view>
      {!collapsed && (
        <scroll style={{ marginTop: 4, maxHeight: 120 }}>
          <text style={{ color: '#555', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {thought}
          </text>
        </scroll>
      )}
    </view>
  );
}
