import React from 'react';
import { Translate, Brain, Copy } from '@phosphor-icons/react';
import { useTheme } from '../../hooks/useTheme';
import { Button, Text } from '../ui';

interface SmartAssistantProps {
  onTranslate: () => void;
  onLiveThoughts: () => void;
  onCopy: () => void;
}

export const SmartAssistant: React.FC<SmartAssistantProps> = ({
  onTranslate,
  onLiveThoughts,
  onCopy
}) => {
  const theme = useTheme();
  return (
    <div 
      className="smart-assistant"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${theme.spacing.md} ${theme.spacing.lg}`
      }}>
      <Text variant="h3" theme={theme}>
        Smart Assistant
      </Text>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm
      }}>
        <Button
          onClick={onTranslate}
          variant="glass"
          size="md"
          theme={theme}
          title="Translate"
        >
          <Translate size={18} color="currentColor" />
        </Button>
        
        <Button
          onClick={onLiveThoughts}
          variant="gradient"
          size="md"
          theme={theme}
          title="Live Thoughts"
          style={{ animation: 'pulse 2s infinite' }}
        >
          <Brain size={18} color="currentColor" />
        </Button>
        
        <Button
          onClick={onCopy}
          variant="glass"
          size="md"
          theme={theme}
          title="Copy Text"
        >
          <Copy size={18} color="currentColor" />
        </Button>
      </div>
    </div>
  );
};
