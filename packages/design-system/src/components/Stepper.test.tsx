import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Stepper, type StepperStep } from './Stepper';

const steps: StepperStep[] = [
  { id: '1', label: 'اطلاعات پایه' },
  { id: '2', label: 'انتخاب پوشش' },
  { id: '3', label: 'تایید نهایی' },
];

describe('Stepper', () => {
  it('renders all step labels', () => {
    render(<Stepper steps={steps} currentStep={0} />);
    expect(screen.getByText('اطلاعات پایه')).toBeInTheDocument();
    expect(screen.getByText('انتخاب پوشش')).toBeInTheDocument();
    expect(screen.getByText('تایید نهایی')).toBeInTheDocument();
  });

  it('shows step numbers', () => {
    render(<Stepper steps={steps} currentStep={0} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('marks current step with aria-current', () => {
    render(<Stepper steps={steps} currentStep={1} />);
    const currentButton = screen.getByText('انتخاب پوشش').closest('button');
    expect(currentButton).toHaveAttribute('aria-current', 'step');
  });

  it('fires onStepClick for completed steps', () => {
    const onStepClick = jest.fn();
    render(<Stepper steps={steps} currentStep={2} onStepClick={onStepClick} />);
    fireEvent.click(screen.getByText('اطلاعات پایه'));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it('does not fire onStepClick for future steps', () => {
    const onStepClick = jest.fn();
    render(<Stepper steps={steps} currentStep={0} onStepClick={onStepClick} />);
    const futureButton = screen.getByText('تایید نهایی').closest('button');
    expect(futureButton).toBeDisabled();
  });
});
