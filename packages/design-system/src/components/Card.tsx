import * as React from 'react';
import { cn } from '@insurance/ui-utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 1 | 2 | 3;
}

const elevationClasses = {
  1: 'shadow-1',
  2: 'shadow-2',
  3: 'shadow-3',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation = 1, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg bg-bg-raised text-text-primary',
          elevationClasses[elevation],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
