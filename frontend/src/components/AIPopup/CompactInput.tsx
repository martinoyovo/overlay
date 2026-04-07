import React, { useRef, useEffect } from 'react';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { useTheme } from '../../hooks/useTheme';

interface CompactInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  loading?: boolean;
  attachedImage?: string;
  onRemoveImage?: () => void;
}

export const CompactInput: React.FC<CompactInputProps> = ({
  value,
  onChange,
  onSubmit,
  loading = false,
  attachedImage = '',
  onRemoveImage
}) => {
  const theme = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled = (!value.trim() && !attachedImage) || loading;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
    onChange(target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) {
        onSubmit(value);
      }
    }
  };

  // Auto-resize on value change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  return (
    <div
      style={{
        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
        borderTop: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
      }}
    >
      {/* Image thumbnail row */}
      {attachedImage && (
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: theme.spacing.sm }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={attachedImage}
              alt="Captured region"
              style={{
                height: '56px',
                width: 'auto',
                maxWidth: '120px',
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.glass.border}`,
                objectFit: 'cover',
                display: 'block'
              }}
            />
            <button
              onClick={onRemoveImage}
              title="Remove image"
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: theme.isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)',
                color: theme.isDark ? '#000' : '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                lineHeight: 1,
                padding: 0
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Wrapper is position:relative so the button is contained inside */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your question or prompt..."
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            minHeight: '40px',
            maxHeight: '120px',
            background: theme.colors.glass.light,
            backdropFilter: theme.backdropFilters.light,
            border: `1px solid ${theme.colors.glass.border}`,
            borderRadius: theme.borderRadius.lg,
            /* right padding leaves room for the send button */
            padding: `${theme.spacing.sm} 44px ${theme.spacing.sm} ${theme.spacing.md}`,
            fontSize: theme.typography.fontSizes.base,
            lineHeight: theme.typography.lineHeights.normal,
            color: theme.isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            transition: theme.transitions.normal
          }}
          onFocus={(e) => {
            e.target.style.border = `1px solid ${theme.colors.glass.borderHover}`;
            e.target.style.boxShadow = `0 0 0 3px ${theme.colors.glass.light}`;
          }}
          onBlur={(e) => {
            e.target.style.border = `1px solid ${theme.colors.glass.border}`;
            e.target.style.boxShadow = 'none';
          }}
        />

        {/* Send button pinned inside the input, right edge, vertically centered */}
        <button
          onClick={() => !isDisabled && onSubmit(value)}
          disabled={isDisabled}
          title={loading ? 'Processing…' : 'Send message'}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDisabled
              ? 'transparent'
              : theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.35 : 1,
            transition: theme.transitions.normal,
            color: theme.isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)'
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.background = theme.isDark
                ? 'rgba(255,255,255,0.25)'
                : 'rgba(0,0,0,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.background = theme.isDark
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(0,0,0,0.08)';
            }
          }}
        >
          {loading ? (
            <div style={{
              width: '14px',
              height: '14px',
              border: `2px solid ${theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
              borderTop: `2px solid ${theme.isDark ? 'white' : 'black'}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          ) : (
            <PaperPlaneRight size={14} color="currentColor" />
          )}
        </button>
      </div>
    </div>
  );
};
