import { useState, useCallback, useRef } from 'react';
import { ChatMessage, ChatRequest, ChatResponse } from '../shared-types';

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  sendMessage: (text: string, selectedText?: string, imageDataUrl?: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string, selectedText?: string, imageDataUrl?: string) => {
    if (!text.trim()) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      role: 'user',
      timestamp: Date.now(),
      context: selectedText ? { selectedText } : undefined
    };

    setMessages(prev => [...prev, userMessage]);

    // Mock response when an image is attached
    if (imageDataUrl) {
      setTimeout(() => {
        const mockResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: "I can see the captured region. How can I help you with this?",
          role: 'ai',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, mockResponse]);
        setLoading(false);
        abortControllerRef.current = null;
      }, 800);
      return;
    }

    try {
      const request: ChatRequest = {
        prompt: text,
        selectedText: selectedText || undefined,
        url: window.location.href,
        title: document.title
      };

      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const chatResponse: ChatResponse = await response.json();

      // Add the AI response to messages
      setMessages((prev: ChatMessage[]) => [...prev, chatResponse.message]);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't show error
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setSessionId(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sessionId,
    sendMessage,
    clearMessages,
  };
};
