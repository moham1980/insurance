'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses = {
  primary: 'bg-brand-primary text-text-on-brand hover:opacity-90',
  secondary: 'bg-brand-secondary text-text-on-brand hover:opacity-90',
  ghost: 'bg-transparent text-text-primary hover:bg-bg-subtle',
  danger: 'bg-danger text-white hover:opacity-90',
  link: 'bg-transparent text-brand-primary underline-offset-4 hover:underline',
};

const sizeClasses = {
  sm: 'h-8 px-3 text-body-sm rounded-md',
  md: 'h-10 px-4 text-body rounded-md',
  lg: 'h-12 px-6 text-body rounded-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, fullWidth, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
