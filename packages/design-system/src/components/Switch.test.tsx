import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders with correct aria-checked when checked', () => {
    render(<Switch checked onCheckedChange={jest.fn()} aria-label="Toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('renders with correct aria-checked when unchecked', () => {
    render(<Switch checked={false} onCheckedChange={jest.fn()} aria-label="Toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('fires onCheckedChange on click', () => {
    const onChange = jest.fn();
    render(<Switch checked={false} onCheckedChange={onChange} aria-label="Toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Switch checked onCheckedChange={jest.fn()} disabled aria-label="Toggle" />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
