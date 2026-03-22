import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UsageBar } from './UsageBar.js';
import { createUsageViewModel } from '../__testing__/factories.js';

describe('UsageBar', () => {
  it('displays percentage', () => {
    render(<UsageBar usage={createUsageViewModel({ percentage: 42 })} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('displays cost when available', () => {
    render(
      <UsageBar usage={createUsageViewModel({ costDisplay: 'USD 1.50' })} />,
    );
    expect(screen.getByText('USD 1.50')).toBeInTheDocument();
  });

  it('does not display cost when null', () => {
    render(
      <UsageBar usage={createUsageViewModel({ costDisplay: null })} />,
    );
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument();
  });

  it('uses green color for low usage (<=50%)', () => {
    const { container } = render(
      <UsageBar usage={createUsageViewModel({ percentage: 30 })} />,
    );
    const fillBar = container.querySelector('div > div > div > div') as HTMLElement;
    expect(fillBar.style.backgroundColor).toBe('rgb(34, 197, 94)');
  });

  it('uses orange color for medium usage (51-80%)', () => {
    const { container } = render(
      <UsageBar usage={createUsageViewModel({ percentage: 65 })} />,
    );
    const fillBar = container.querySelector('div > div > div > div') as HTMLElement;
    expect(fillBar.style.backgroundColor).toBe('rgb(245, 158, 11)');
  });

  it('uses red color for high usage (>80%)', () => {
    const { container } = render(
      <UsageBar usage={createUsageViewModel({ percentage: 95 })} />,
    );
    const fillBar = container.querySelector('div > div > div > div') as HTMLElement;
    expect(fillBar.style.backgroundColor).toBe('rgb(239, 68, 68)');
  });

  it('clamps bar width to 100%', () => {
    const { container } = render(
      <UsageBar usage={createUsageViewModel({ percentage: 150 })} />,
    );
    const fillBar = container.querySelector('div > div > div > div') as HTMLElement;
    expect(fillBar.style.width).toBe('100%');
  });
});
