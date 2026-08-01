import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('renders with default text', () => {
    render(<SkipLink href="#main" />);
    expect(screen.getByText(/پرش|Skip/i)).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<SkipLink href="#main">Skip to content</SkipLink>);
    expect(screen.getByText('Skip to content')).toBeInTheDocument();
  });

  it('has correct href', () => {
    render(<SkipLink href="#main-content" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '#main-content');
  });
});
