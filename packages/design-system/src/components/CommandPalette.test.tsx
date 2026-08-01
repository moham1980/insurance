import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette, type CommandItem } from './CommandPalette';

const commands: CommandItem[] = [
  { id: 'dashboard', label: 'داشبورد', shortcut: 'd' },
  { id: 'policies', label: 'بیمه‌نامه‌ها', shortcut: 'p' },
  { id: 'claims', label: 'خسارت‌ها', shortcut: 'c' },
];

describe('CommandPalette', () => {
  it('does not render when closed', () => {
    render(<CommandPalette open={false} commands={commands} onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.queryByText('داشبورد')).not.toBeInTheDocument();
  });

  it('renders commands when open', () => {
    render(<CommandPalette open commands={commands} onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getByText('داشبورد')).toBeInTheDocument();
    expect(screen.getByText('بیمه‌نامه‌ها')).toBeInTheDocument();
    expect(screen.getByText('خسارت‌ها')).toBeInTheDocument();
  });

  it('fires onSelect when command clicked', () => {
    const onSelect = jest.fn();
    render(<CommandPalette open commands={commands} onClose={jest.fn()} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('داشبورد'));
    expect(onSelect).toHaveBeenCalledWith('dashboard');
  });

  it('filters commands by search', () => {
    render(<CommandPalette open commands={commands} onClose={jest.fn()} onSelect={jest.fn()} />);
    const input = screen.getByPlaceholderText(/جستجو|Search/i) || screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'خسارت' } });
    expect(screen.getByText('خسارت‌ها')).toBeInTheDocument();
    expect(screen.queryByText('داشبورد')).not.toBeInTheDocument();
  });
});
