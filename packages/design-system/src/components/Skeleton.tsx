import * as React from 'react';
import { cn } from '@insurance/ui-utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  circle?: boolean;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, circle, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'animate-shimmer bg-gradient-to-r from-bg-subtle via-surface-2 to-bg-subtle bg-[length:200%_100%]',
          circle ? 'rounded-full' : 'rounded-md',
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';
