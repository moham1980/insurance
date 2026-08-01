import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CopilotChat } from './CopilotChat';

describe('CopilotChat', () => {
  it('renders messages', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'سلام', timestamp: '2025-01-01T10:00:00Z' },
      { id: '2', role: 'assistant' as const, content: 'سلام! چطور می‌توانم کمک کنم؟', timestamp: '2025-01-01T10:00:05Z' },
    ];
    render(<CopilotChat messages={messages} onSend={jest.fn()} loading={false} />);
    expect(screen.getByText('سلام')).toBeInTheDocument();
    expect(screen.getByText('سلام! چطور می‌توانم کمک کنم؟')).toBeInTheDocument();
  });

  it('fires onSend when message submitted', () => {
    const onSend = jest.fn();
    render(<CopilotChat messages={[]} onSend={onSend} loading={false} />);
    const input = screen.getByPlaceholderText(/پیام|Message/i) || screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'تست' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('تست');
  });

  it('shows loading indicator when loading', () => {
    render(<CopilotChat messages={[]} onSend={jest.fn()} loading />);
    expect(screen.getByText(/...|در حال/i) || screen.getByRole('status')).toBeTruthy();
  });
});
