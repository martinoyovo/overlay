export type QuickActionType = 'explain' | 'summarize' | 'translate' | 'improve';

interface QuickAction {
  id: QuickActionType;
  label: string;
  color: string;
  prompt: (text: string) => string;
}

export const QUICK_ACTION_CONFIG: Record<QuickActionType, QuickAction> = {
  explain: {
    id: 'explain',
    label: 'Explain',
    color: '#3B82F6',
    prompt: (text: string) => `Please explain this text in simple terms: "${text}"`,
  },
  summarize: {
    id: 'summarize',
    label: 'Summarize',
    color: '#10B981',
    prompt: (text: string) => `Please provide a concise summary of this text: "${text}"`,
  },
  translate: {
    id: 'translate',
    label: 'Translate',
    color: '#F59E0B',
    prompt: (text: string) => `Please translate this text to English: "${text}"`,
  },
  improve: {
    id: 'improve',
    label: 'Improve',
    color: '#8B5CF6',
    prompt: (text: string) => `Please improve and rewrite this text to make it more professional: "${text}"`,
  },
};

