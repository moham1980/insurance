import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextBestAction, type NBACardProps } from './NextBestAction';

const action = {
  id: '1',
  title: 'تماس با مشتری',
  description: 'برای تمدید بیمه‌نامه تماس بگیرید',
  priority: 'high' as const,
  actionLabel: 'اجرا',
  optOutLabel: 'رد کردن',
};

describe('NextBestAction', () => {
  it('renders title and description', () => {
    render(<NextBestAction action={action} onExecute={jest.fn()} onOptOut={jest.fn()} />);
    expect(screen.getByText('تماس با مشتری')).toBeInTheDocument();
    expect(screen.getByText('برای تمدید بیمه‌نامه تماس بگیرید')).toBeInTheDocument();
  });

  it('fires onExecute when action button clicked', () => {
    const onExecute = jest.fn();
    render(<NextBestAction action={action} onExecute={onExecute} onOptOut={jest.fn()} />);
    fireEvent.click(screen.getByText('اجرا'));
    expect(onExecute).toHaveBeenCalledWith('1');
  });

  it('fires onOptOut when opt-out button clicked', () => {
    const onOptOut = jest.fn();
    render(<NextBestAction action={action} onExecute={jest.fn()} onOptOut={onOptOut} />);
    fireEvent.click(screen.getByText('رد کردن'));
    expect(onOptOut).toHaveBeenCalledWith('1');
  });
});
