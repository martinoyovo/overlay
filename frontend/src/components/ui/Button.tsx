import React from 'react';
import { Theme } from '../../theme/theme';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'glass' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  theme: Theme;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'glass',
  size = 'md',
  className = '',
  style = {},
  title,
  theme,
}) => {
  const getButtonStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: theme.transitions.normal,
      border: 'none',
      outline: 'none',
      fontFamily: 'inherit',
      ...style,
    };

    // Size styles
    const sizeStyles = {
      sm: {
        width: '24px',
        height: '24px',
        fontSize: theme.typography.fontSizes.xs,
        borderRadius: theme.borderRadius.sm,
      },
      md: {
        width: '36px',
        height: '36px',
        fontSize: theme.typography.fontSizes.sm,
        borderRadius: theme.borderRadius.md,
      },
      lg: {
        width: '44px',
        height: '44px',
        fontSize: theme.typography.fontSizes.base,
        borderRadius: theme.borderRadius.lg,
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        background: disabled ? theme.colors.neutral[300] : theme.colors.primary[500],
        color: 'white',
        boxShadow: disabled ? 'none' : theme.shadows.md,
      },
      secondary: {
        background: theme.colors.glass.medium,
        backdropFilter: theme.backdropFilters.light,
        border: `1px solid ${theme.colors.glass.border}`,
        color: theme.isDark ? theme.colors.text.dark.primary : theme.colors.text.primary,
      },
      glass: {
        background: theme.colors.glass.light,
        backdropFilter: theme.backdropFilters.light,
        border: `1px solid ${theme.colors.glass.border}`,
        color: theme.isDark ? theme.colors.text.dark.primary : theme.colors.text.primary,
      },
      gradient: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
      },
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.5 : 1,
    };
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    const target = e.currentTarget;
    target.style.transform = 'translateY(-2px) scale(1.05)';
    
    if (variant === 'primary') {
      target.style.background = theme.colors.primary[600];
      target.style.boxShadow = theme.shadows.lg;
    } else if (variant === 'glass' || variant === 'secondary') {
      target.style.background = theme.colors.glass.medium;
      target.style.boxShadow = theme.shadows.md;
    } else if (variant === 'gradient') {
      target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    const target = e.currentTarget;
    target.style.transform = 'translateY(0) scale(1)';
    target.style.boxShadow = 'none';
    
    if (variant === 'primary') {
      target.style.background = theme.colors.primary[500];
    } else if (variant === 'glass' || variant === 'secondary') {
      target.style.background = theme.colors.glass.light;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={getButtonStyles()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={title}
    >
      {children}
    </button>
  );
};
