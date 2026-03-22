import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PermissionDialog } from './PermissionDialog.js';
import { createPermissionViewModel } from '../__testing__/factories.js';

describe('PermissionDialog', () => {
  it('displays description', () => {
    render(
      <PermissionDialog
        permission={createPermissionViewModel({ description: 'Write to /tmp/file.txt' })}
        onApprove={vi.fn()}
      />,
    );
    expect(screen.getByText('Write to /tmp/file.txt')).toBeInTheDocument();
  });

  it('displays option buttons', () => {
    render(
      <PermissionDialog
        permission={createPermissionViewModel({
          options: [
            { optionId: 'allow', name: '許可', kind: 'allow_once' },
            { optionId: 'deny', name: '拒否', kind: 'reject_once' },
          ],
        })}
        onApprove={vi.fn()}
      />,
    );
    expect(screen.getByText('許可')).toBeInTheDocument();
    expect(screen.getByText('拒否')).toBeInTheDocument();
  });

  it('calls onApprove with requestId and optionId on click', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(
      <PermissionDialog
        permission={createPermissionViewModel({
          requestId: 'req-42',
          options: [{ optionId: 'allow', name: '許可', kind: 'allow_once' }],
        })}
        onApprove={onApprove}
      />,
    );

    await user.click(screen.getByText('許可'));
    expect(onApprove).toHaveBeenCalledWith('req-42', 'allow');
  });
});
