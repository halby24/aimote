import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToolCallList } from './ToolCallList.js';
import { createToolCallViewModel } from '../__testing__/factories.js';

describe('ToolCallList', () => {
  it('returns null when no active tool calls', () => {
    const { container } = render(<ToolCallList toolCalls={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when all tool calls are inactive', () => {
    const { container } = render(
      <ToolCallList
        toolCalls={[
          createToolCallViewModel({ isActive: false, status: 'completed' }),
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays active tool calls', () => {
    render(
      <ToolCallList
        toolCalls={[
          createToolCallViewModel({ title: 'Read file', isActive: true }),
          createToolCallViewModel({
            toolCallId: 'tc-2',
            title: 'Edit code',
            isActive: true,
          }),
        ]}
      />,
    );
    expect(screen.getByText('Read file')).toBeInTheDocument();
    expect(screen.getByText('Edit code')).toBeInTheDocument();
  });

  it('only displays active tool calls, not completed ones', () => {
    render(
      <ToolCallList
        toolCalls={[
          createToolCallViewModel({ title: 'Active call', isActive: true }),
          createToolCallViewModel({
            toolCallId: 'tc-2',
            title: 'Done call',
            isActive: false,
          }),
        ]}
      />,
    );
    expect(screen.getByText('Active call')).toBeInTheDocument();
    expect(screen.queryByText('Done call')).not.toBeInTheDocument();
  });
});
