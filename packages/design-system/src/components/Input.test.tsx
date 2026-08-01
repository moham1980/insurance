import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Username" placeholder="Enter name" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('renders placeholder', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('fires onChange', () => {
    const onChange = jest.fn();
    render(<Input placeholder="Test" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Test'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('shows error message', () => {
    render(<Input error="This field is required" placeholder="Test" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Input disabled placeholder="Test" />);
    expect(screen.getByPlaceholderText('Test')).toBeDisabled();
  });
});
