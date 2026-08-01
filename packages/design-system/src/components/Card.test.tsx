import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies elevation classes', () => {
    const { container } = render(<Card elevation={3}>High</Card>);
    expect(container.firstChild).toHaveClass('shadow-3');
  });

  it('applies default elevation 1', () => {
    const { container } = render(<Card>Default</Card>);
    expect(container.firstChild).toHaveClass('shadow-1');
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="custom-class">Custom</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
