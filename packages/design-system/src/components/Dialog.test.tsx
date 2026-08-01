import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('renders when open', () => {
    render(
      <Dialog open onClose={jest.fn()} title="Test Dialog">
        <p>Dialog content</p>
      </Dialog>
    );
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Dialog open={false} onClose={jest.fn()} title="Test Dialog">
        <p>Dialog content</p>
      </Dialog>
    );
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument();
  });

  it('fires onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(
      <Dialog open onClose={onClose} title="Test Dialog">
        <p>Content</p>
      </Dialog>
    );
    const closeBtn = screen.getByLabelText('بستن');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
