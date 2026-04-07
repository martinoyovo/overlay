export interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'ai';
  timestamp: number;
  context?: {
    selectedText?: string;
    url?: string;
    title?: string;
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  context?: {
    selectedText?: string;
    url?: string;
    title?: string;
  };
}

export interface AIRequest {
  prompt: string;
  context?: {
    selectedText?: string;
    url?: string;
    title?: string;
    conversationHistory?: ChatMessage[];
  };
  sessionId?: string;
}

export interface AIResponse {
  text: string;
  sessionId?: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
  };
}

export interface AIAdapter {
  generate(prompt: string, context?: any): Promise<AIResponse>;
  name: string;
  description: string;
}

export interface ChatRequest {
  prompt: string;
  selectedText?: string;
  url?: string;
  title?: string;
  sessionId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
  };
}
