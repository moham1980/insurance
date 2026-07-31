import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubmissionWizard } from './SubmissionWizard';

describe('SubmissionWizard', () => {
  const steps = [
    { id: '1', title: 'اطلاعات پایه', content: <div>step1</div> },
    { id: '2', title: 'انتخاب پوشش', content: <div>step2</div>, isValid: () => true },
  ];

  it('renders first step', () => {
    render(<SubmissionWizard steps={steps} onComplete={jest.fn()} />);
    expect(screen.getByText('step1')).toBeInTheDocument();
  });

  it('navigates to next step', () => {
    render(<SubmissionWizard steps={steps} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByText('بعدی'));
    expect(screen.getByText('step2')).toBeInTheDocument();
  });
});
