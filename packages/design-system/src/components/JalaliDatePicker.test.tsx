import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { JalaliDatePicker } from './JalaliDatePicker';

describe('JalaliDatePicker', () => {
  it('renders placeholder when no value', () => {
    render(<JalaliDatePicker placeholder="انتخاب تاریخ" />);
    expect(screen.getByText('انتخاب تاریخ')).toBeInTheDocument();
  });

  it('renders value when provided', () => {
    render(<JalaliDatePicker value="1403/05/15" />);
    expect(screen.getByText('1403/05/15')).toBeInTheDocument();
  });

  it('opens calendar on click', () => {
    render(<JalaliDatePicker placeholder="Test" />);
    fireEvent.click(screen.getByText('Test'));
    const months = screen.getAllByText(/فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند/);
    expect(months.length).toBeGreaterThan(0);
  });

  it('renders label when provided', () => {
    render(<JalaliDatePicker label="تاریخ تولد" placeholder="Test" />);
    expect(screen.getByText('تاریخ تولد')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is set', () => {
    render(<JalaliDatePicker disabled placeholder="Test" />);
    expect(screen.getByText('Test').closest('button')).toBeDisabled();
  });

  it('fires onChange when a day is selected', () => {
    const onChange = jest.fn();
    render(<JalaliDatePicker placeholder="Test" onChange={onChange} />);
    fireEvent.click(screen.getByText('Test'));
    const dayButton = screen.getByText('15');
    fireEvent.click(dayButton);
    expect(onChange).toHaveBeenCalled();
  });
});
