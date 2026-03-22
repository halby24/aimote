import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlanPanel } from './PlanPanel.js';
import { createPlanViewModel } from '../__testing__/factories.js';

describe('PlanPanel', () => {
  it('returns null when hasEntries is false', () => {
    const { container } = render(
      <PlanPanel plan={createPlanViewModel({ hasEntries: false, entries: [] })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays plan entries', () => {
    render(
      <PlanPanel
        plan={createPlanViewModel({
          hasEntries: true,
          entries: [
            { content: 'Step 1: Read file', priority: 'high', status: 'completed' },
            { content: 'Step 2: Edit code', priority: 'medium', status: 'in_progress' },
            { content: 'Step 3: Run tests', priority: 'low', status: 'pending' },
          ],
        })}
      />,
    );
    expect(screen.getByText('Step 1: Read file')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Edit code')).toBeInTheDocument();
    expect(screen.getByText('Step 3: Run tests')).toBeInTheDocument();
  });

  it('displays "Plan" header', () => {
    render(
      <PlanPanel
        plan={createPlanViewModel({
          hasEntries: true,
          entries: [{ content: 'Task', priority: 'high', status: 'pending' }],
        })}
      />,
    );
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });
});
