import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast, ToastViewport } from './Toast';

describe('Toast', () => {
  it('renders title', () => {
    render(<Toast title="Success!" />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<Toast title="Success!" description="Operation completed" />);
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('fires onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(<Toast title="Test" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes', () => {
    const { container } = render(<Toast title="Error" variant="error" />);
    expect(container.firstChild).toHaveClass('bg-red-50');
  });

  it('has role alert', () => {
    render(<Toast title="Warning" variant="warning" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('ToastViewport', () => {
  it('renders children', () => {
    render(
      <ToastViewport>
        <Toast title="Test" />
      </ToastViewport>
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('has rtl direction', () => {
    const { container } = render(<ToastViewport><div>test</div></ToastViewport>);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });
});
