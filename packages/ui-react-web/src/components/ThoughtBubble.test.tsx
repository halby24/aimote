import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ThoughtBubble } from './ThoughtBubble.js';

describe('ThoughtBubble', () => {
  it('returns null when thought is empty', () => {
    const { container } = render(<ThoughtBubble thought="" />);
    expect(container.firstChild).toBeNull();
  });

  it('displays thought content', () => {
    render(<ThoughtBubble thought="I need to analyze this" />);
    expect(screen.getByText('I need to analyze this')).toBeInTheDocument();
  });

  it('shows "Thinking..." header', () => {
    render(<ThoughtBubble thought="Some thought" />);
    expect(screen.getByText(/Thinking\.\.\./)).toBeInTheDocument();
  });

  it('collapses content on toggle click', async () => {
    const user = userEvent.setup();
    render(<ThoughtBubble thought="Hidden thought" />);

    expect(screen.getByText('Hidden thought')).toBeInTheDocument();

    await user.click(screen.getByText(/Thinking\.\.\./));
    expect(screen.queryByText('Hidden thought')).not.toBeInTheDocument();
  });

  it('expands content on second toggle click', async () => {
    const user = userEvent.setup();
    render(<ThoughtBubble thought="Toggle thought" />);

    await user.click(screen.getByText(/Thinking\.\.\./));
    expect(screen.queryByText('Toggle thought')).not.toBeInTheDocument();

    await user.click(screen.getByText(/Thinking\.\.\./));
    expect(screen.getByText('Toggle thought')).toBeInTheDocument();
  });
});
