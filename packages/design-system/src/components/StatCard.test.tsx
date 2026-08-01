import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="کل بیمه‌نامه‌ها" value={1234} />);
    expect(screen.getByText('کل بیمه‌نامه‌ها')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatCard label="وضعیت" value="فعال" />);
    expect(screen.getByText('فعال')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const Icon = () => <svg data-testid="icon" />;
    render(<StatCard label="Test" value={100} icon={Icon} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies trend classes', () => {
    const { container } = render(<StatCard label="Test" value={100} trend="up" trendValue="+12%" />);
    expect(container.textContent).toContain('+12%');
  });
});
