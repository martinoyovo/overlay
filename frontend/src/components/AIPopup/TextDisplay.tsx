import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Text, Container } from '../ui';
import { getWordCount, getCharacterCount } from '../../utils/helpers';
import { CaretDown } from '@phosphor-icons/react';

interface TextDisplayProps {
  text: string;
}

export const TextDisplay: React.FC<TextDisplayProps> = ({ text }) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(true); // 🔥 START EXPANDED by default
  const characterCount = getCharacterCount(text);
  const wordCount = getWordCount(text);
  
  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        padding: `0 ${theme.spacing.lg}`
      }}>
        {/* Left side: Selected Text + Chevron */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm
        }}>
          <Text variant="label" theme={theme}>
            Selected Text
          </Text>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: ' 4px 2px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              color: theme.colors.neutral[600]
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
            title={isExpanded ? 'Hide text' : 'Show text'}
          >
            <CaretDown
              size={14}
              weight="regular"
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>
        </div>

        {/* Right side: Word and Character Count */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.md,
          alignItems: 'center'
        }}>
          <Text variant="caption" color="secondary" theme={theme}>
            {wordCount} words
          </Text>
          <Text variant="caption" color="secondary" theme={theme}>
            {characterCount} chars
          </Text>
        </div>
      </div>
      
      <div
        style={{
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease',
          maxHeight: isExpanded ? '300px' : '0px', // 🔥 MUCH LARGER: 300px for the container
          opacity: isExpanded ? 1 : 0,
          margin: isExpanded ? `0 ${theme.spacing.lg} ${theme.spacing.md} ${theme.spacing.lg}` : '0',
        }}
      >
        <Container
          className="text-display"
          theme={theme}
          variant="solid"
          padding="md"
          style={{
            flex: 1,
            overflow: 'auto',
            maxHeight: '280px',
            position: 'relative',
            border: `1px solid ${theme.colors.primary[300]}`,
            fontSize: theme.typography.fontSizes.base,
            lineHeight: theme.typography.lineHeights.relaxed,
          }}>
          {text ? (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {text}
            </div>
          ) : (
            <div style={{
              fontStyle: 'italic',
              textAlign: 'center',
              padding: theme.spacing.xl
            }}>
              No text selected. Select some text and press ⌘⇧A to get started.
            </div>
          )}
          
          {/* Subtle scrollbar styling */}
          <style>
            {`
              .text-display::-webkit-scrollbar {
                width: 6px;
              }
              .text-display::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.05);
                border-radius: 3px;
              }
              .text-display::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
              }
              .text-display::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 0, 0, 0.3);
              }
            `}
          </style>
        </Container>
      </div>
    </>
  );
};