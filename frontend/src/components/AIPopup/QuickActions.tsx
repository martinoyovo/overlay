import React from 'react';
import { Lightbulb, ArrowsInSimple, Translate, Sparkle } from '@phosphor-icons/react';
import { useTheme } from '../../hooks/useTheme';
import { QUICK_ACTION_CONFIG, QuickActionType } from '../../constants/actions';

interface QuickActionsProps {
  onAction: (action: QuickActionType) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const theme = useTheme();
  
  const actions = [
    { id: 'explain' as QuickActionType, icon: Lightbulb },
    { id: 'summarize' as QuickActionType, icon: ArrowsInSimple },
    { id: 'translate' as QuickActionType, icon: Translate },
    { id: 'improve' as QuickActionType, icon: Sparkle }
  ];

  return (
    <div 
      className="quick-actions"
      style={{
        padding: `0 ${theme.spacing.lg}`,
        marginBottom: theme.spacing.md,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme.spacing.sm
      }}>
      {actions.map((action) => {
        const config = QUICK_ACTION_CONFIG[action.id];
        const color = config.color;
        
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            style={{
              background: `rgba(${color === '#3B82F6' ? '59, 130, 246' : 
                                 color === '#10B981' ? '16, 185, 129' :
                                 color === '#F59E0B' ? '245, 158, 11' : '139, 92, 246'}, 0.1)`,
              border: `1px solid rgba(${color === '#3B82F6' ? '59, 130, 246' : 
                                      color === '#10B981' ? '16, 185, 129' :
                                      color === '#F59E0B' ? '245, 158, 11' : '139, 92, 246'}, 0.2)`,
              borderRadius: theme.borderRadius.full,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              display: 'flex',
              alignItems: 'center',
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              cursor: 'pointer',
              transition: theme.transitions.normal,
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `rgba(${color === '#3B82F6' ? '59, 130, 246' : 
                                                        color === '#10B981' ? '16, 185, 129' :
                                                        color === '#F59E0B' ? '245, 158, 11' : '139, 92, 246'}, 0.15)`;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = theme.shadows.md;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `rgba(${color === '#3B82F6' ? '59, 130, 246' : 
                                                        color === '#10B981' ? '16, 185, 129' :
                                                        color === '#F59E0B' ? '245, 158, 11' : '139, 92, 246'}, 0.1)`;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
};
