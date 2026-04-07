import { AIAdapter } from '../adapters/AIAdapter';
import { SessionManager } from './SessionManager';
import { ChatRequest, ChatResponse, ChatMessage, AIRequest } from '../shared-types';
import { v4 as uuidv4 } from 'uuid';

export class ChatService {
  private aiAdapter: AIAdapter;
  private sessionManager: SessionManager;

  constructor(aiAdapter: AIAdapter, sessionManager: SessionManager) {
    this.aiAdapter = aiAdapter;
    this.sessionManager = sessionManager;
  }

  async processChatRequest(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    // Get or create session
    let sessionId = request.sessionId;
    if (!sessionId) {
      const session = await this.sessionManager.createSession({
        selectedText: request.selectedText || undefined,
        url: request.url || undefined,
        title: request.title || undefined
      });
      sessionId = session.id;
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      text: request.prompt,
      role: 'user',
      timestamp: Date.now(),
      context: {
        selectedText: request.selectedText || undefined,
        url: request.url || undefined,
        title: request.title || undefined
      }
    };

    await this.sessionManager.addMessage(sessionId, userMessage);

    // Get conversation history for context
    const session = await this.sessionManager.getSession(sessionId);
    const conversationHistory = session?.messages || [];

    const aiRequest: AIRequest = {
      prompt: request.prompt,
      context: {
        selectedText: request.selectedText || undefined,
        url: request.url || undefined,
        title: request.title || undefined,
        conversationHistory
      },
      sessionId
    };

    const aiResponse = await this.aiAdapter.generate(request.prompt, aiRequest.context);

    const aiMessage: ChatMessage = {
      id: uuidv4(),
      text: aiResponse.text,
      role: 'ai',
      timestamp: aiResponse.timestamp,
      context: {
        selectedText: request.selectedText || undefined,
        url: request.url || undefined,
        title: request.title || undefined
      }
    };

    await this.sessionManager.addMessage(sessionId, aiMessage);

    return {
      message: aiMessage,
      sessionId,
      metadata: {
        model: this.aiAdapter.name,
        tokensUsed: aiResponse.metadata?.tokensUsed,
        responseTime: Date.now() - startTime
      }
    };
  }
}
