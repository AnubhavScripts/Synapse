import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  /** Pass extra className(s) like "w-full" */
  className?: string;
}

/**
 * A CRM-grade button with:
 *  - Inline spinner that matches the button's color context
 *  - Subtle opacity/scale feedback while loading
 *  - Prevents double-submit via `disabled` when loading
 *  - Works with any existing `.btn` variant classes via className prop
 */
export function LoadingButton({
  loading = false,
  loadingText,
  icon,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  style,
  ...rest
}: LoadingButtonProps) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = variant === 'secondary' ? 'btn-secondary'
    : variant === 'ghost' ? 'btn-ghost'
    : variant === 'danger' ? 'btn-danger'
    : 'btn-primary';

  const isDisabled = disabled || loading;

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={isDisabled}
      style={{
        opacity: loading ? 0.82 : 1,
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <span
          className="loading-spinner"
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: size === 'lg' ? 18 : 14,
            height: size === 'lg' ? 18 : 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.65s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : icon ? (
        icon
      ) : null}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}
