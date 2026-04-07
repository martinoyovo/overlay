import React from 'react';
import { Theme, spacing, borderRadius } from '../../theme/theme';

export interface ContainerProps {
  children: React.ReactNode;
  variant?: 'glass' | 'solid' | 'transparent';
  padding?: keyof typeof spacing;
  margin?: keyof typeof spacing;
  borderRadius?: keyof typeof borderRadius;
  className?: string;
  style?: React.CSSProperties;
  theme: Theme;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  variant = 'glass',
  padding = 'lg',
  margin,
  borderRadius = 'lg',
  className = '',
  style = {},
  theme,
}) => {
  const getContainerStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      padding: theme.spacing[padding],
      borderRadius: theme.borderRadius[borderRadius],
      transition: theme.transitions.normal,
      ...style,
    };

    if (margin) {
      baseStyles.margin = theme.spacing[margin];
    }

    const variantStyles = {
      glass: {
        background: theme.colors.glass.light,
        backdropFilter: theme.backdropFilters.light,
        border: `1px solid ${theme.colors.glass.border}`,
      },
      solid: {
        background: theme.isDark ? theme.colors.neutral[800] : theme.colors.neutral[50],
        border: `1px solid ${theme.isDark ? theme.colors.neutral[700] : theme.colors.neutral[200]}`,
      },
      transparent: {
        background: 'transparent',
        border: 'none',
      },
    };

    return {
      ...baseStyles,
      ...variantStyles[variant],
    };
  };

  return (
    <div className={className} style={getContainerStyles()}>
      {children}
    </div>
  );
};
