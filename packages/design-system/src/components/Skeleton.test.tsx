import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders with default dimensions', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies width and height', () => {
    const { container } = render(<Skeleton width="200px" height="50px" />);
    expect(container.firstChild).toHaveStyle({ width: '200px', height: '50px' });
  });

  it('applies rounded class', () => {
    const { container } = render(<Skeleton rounded />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('merges className', () => {
    const { container } = render(<Skeleton className="custom-skeleton" />);
    expect(container.firstChild).toHaveClass('custom-skeleton');
  });
});
