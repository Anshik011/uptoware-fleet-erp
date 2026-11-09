import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon: Icon,
      iconPosition = 'left',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed select-none shadow-xs';

    const variants = {
      primary: 'bg-blue-900 hover:bg-blue-800 text-white focus:ring-blue-600',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400',
      outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-blue-600',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-300 shadow-none',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-xs sm:text-sm gap-2',
      lg: 'px-5 py-2.5 text-sm sm:text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {!isLoading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4 text-current" />}
        <span>{children}</span>
        {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4 text-current" />}
      </button>
    );
  }
);

Button.displayName = 'Button';

