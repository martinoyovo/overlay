import React from 'react';
import { Theme, typography } from '../../theme/theme';

export interface TextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'muted';
  weight?: keyof typeof typography.fontWeights;
  className?: string;
  style?: React.CSSProperties;
  theme: Theme;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  color = 'primary',
  weight = 'normal',
  className = '',
  style = {},
  theme,
}) => {
  const getTextStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      fontFamily: 'inherit',
      fontWeight: theme.typography.fontWeights[weight],
      lineHeight: theme.typography.lineHeights.normal,
      margin: 0,
      ...style,
    };

    const variantStyles = {
      h1: {
        fontSize: theme.typography.fontSizes['2xl'],
        fontWeight: theme.typography.fontWeights.bold,
        lineHeight: theme.typography.lineHeights.tight,
      },
      h2: {
        fontSize: theme.typography.fontSizes.xl,
        fontWeight: theme.typography.fontWeights.semibold,
        lineHeight: theme.typography.lineHeights.tight,
      },
      h3: {
        fontSize: theme.typography.fontSizes.lg,
        fontWeight: theme.typography.fontWeights.semibold,
      },
      h4: {
        fontSize: theme.typography.fontSizes.base,
        fontWeight: theme.typography.fontWeights.medium,
      },
      body: {
        fontSize: theme.typography.fontSizes.base,
        fontWeight: theme.typography.fontWeights.normal,
      },
      caption: {
        fontSize: theme.typography.fontSizes.sm,
        fontWeight: theme.typography.fontWeights.normal,
      },
      label: {
        fontSize: theme.typography.fontSizes.sm,
        fontWeight: theme.typography.fontWeights.medium,
      },
    };

    const colorStyles = {
      primary: {
        color: theme.isDark ? theme.colors.text.dark.primary : theme.colors.text.primary,
      },
      secondary: {
        color: theme.isDark ? theme.colors.text.dark.secondary : theme.colors.text.secondary,
      },
      muted: {
        color: theme.isDark ? theme.colors.neutral[400] : theme.colors.neutral[500],
      },
    };

    return {
      ...baseStyles,
      ...variantStyles[variant],
      ...colorStyles[color],
    };
  };

  const Component = variant.startsWith('h') ? variant : 'span';

  return (
    <Component className={className} style={getTextStyles()}>
      {children}
    </Component>
  );
};
