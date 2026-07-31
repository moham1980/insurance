import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConsentPanel } from './ConsentPanel';

describe('ConsentPanel', () => {
  const consents = [
    { purpose: 'quote', title: 'استعلام و صدور', dataTypes: ['نام', 'کد ملی'], granted: true },
    { purpose: 'claim', title: 'رسیدگی به خسارت', dataTypes: ['شماره تماس'], granted: false },
  ];

  it('renders all consent purposes', () => {
    render(<ConsentPanel consents={consents} />);
    expect(screen.getByText('استعلام و صدور')).toBeInTheDocument();
    expect(screen.getByText('رسیدگی به خسارت')).toBeInTheDocument();
  });

  it('calls onChange when a consent switch is toggled', () => {
    const onChange = jest.fn();
    render(<ConsentPanel consents={consents} onChange={onChange} />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[1]);
    expect(onChange).toHaveBeenCalledWith('claim', true);
  });
});
