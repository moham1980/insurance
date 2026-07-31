import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubAgentTree } from './SubAgentTree';

describe('SubAgentTree', () => {
  const nodes = [
    {
      partyId: 'p1',
      name: 'کارگزار اصلی',
      role: 'broker' as const,
      children: [
        { partyId: 'p2', name: 'نماینده ۱', role: 'agent' as const },
      ],
    },
  ];

  it('renders root and child nodes', () => {
    render(<SubAgentTree nodes={nodes} />);
    expect(screen.getByText('کارگزار اصلی')).toBeInTheDocument();
    expect(screen.getByText('نماینده ۱')).toBeInTheDocument();
  });

  it('calls onSelect when a node is clicked', () => {
    const onSelect = jest.fn();
    render(<SubAgentTree nodes={nodes} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('کارگزار اصلی'));
    expect(onSelect).toHaveBeenCalled();
  });
});
