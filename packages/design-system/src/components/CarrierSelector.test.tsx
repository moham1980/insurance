import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CarrierSelector } from './CarrierSelector';

describe('CarrierSelector', () => {
  const carriers = [
    { carrierOrganizationId: 'c1', carrierName: 'بیمه ایران', enabled: true, inAgreement: true, bindingAuthority: true },
    { carrierOrganizationId: 'c2', carrierName: 'بیمه آسیا', enabled: true, inAgreement: false, bindingAuthority: false },
  ];

  it('renders carrier options', () => {
    render(<CarrierSelector carriers={carriers} selected={[]} onChange={jest.fn()} />);
    expect(screen.getByText('بیمه ایران')).toBeInTheDocument();
    expect(screen.getByText('بیمه آسیا')).toBeInTheDocument();
  });

  it('toggles selection', () => {
    const onChange = jest.fn();
    render(<CarrierSelector carriers={carriers} selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('بیمه ایران'));
    expect(onChange).toHaveBeenCalledWith(['c1']);
  });
});
