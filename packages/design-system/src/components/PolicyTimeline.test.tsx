import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { PolicyTimeline } from './PolicyTimeline';

describe('PolicyTimeline', () => {
  const events = [
    { id: '1', title: 'دریافت', status: 'completed' as const },
    { id: '2', title: 'بررسی', status: 'current' as const },
  ];

  it('renders events', () => {
    render(<PolicyTimeline events={events} />);
    expect(screen.getByText('دریافت')).toBeInTheDocument();
    expect(screen.getByText('بررسی')).toBeInTheDocument();
  });
});
