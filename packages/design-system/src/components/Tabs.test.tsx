import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

describe('Tabs', () => {
  it('renders all tab labels', () => {
    render(
      <Tabs
        tabs={[
          { key: 'a', label: 'تب یک' },
          { key: 'b', label: 'تب دو' },
        ]}
        activeKey="a"
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('تب یک')).toBeInTheDocument();
    expect(screen.getByText('تب دو')).toBeInTheDocument();
  });

  it('fires onChange when tab clicked', () => {
    const onChange = jest.fn();
    render(
      <Tabs
        tabs={[
          { key: 'a', label: 'تب یک' },
          { key: 'b', label: 'تب دو' },
        ]}
        activeKey="a"
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('تب دو'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('marks active tab with aria-selected', () => {
    render(
      <Tabs
        tabs={[
          { key: 'a', label: 'تب یک' },
          { key: 'b', label: 'تب دو' },
        ]}
        activeKey="b"
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('تب دو').closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('تب یک').closest('[role="tab"]')).toHaveAttribute('aria-selected', 'false');
  });
});
