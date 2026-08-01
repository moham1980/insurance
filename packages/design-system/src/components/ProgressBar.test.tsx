import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with value', () => {
    render(<ProgressBar value={50} max={100} label="Progress" />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('renders without label', () => {
    const { container } = render(<ProgressBar value={30} max={100} />);
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('clamps value to max', () => {
    const { container } = render(<ProgressBar value={150} max={100} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps value to 0', () => {
    const { container } = render(<ProgressBar value={-10} max={100} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });
});
