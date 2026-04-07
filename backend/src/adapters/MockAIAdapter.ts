import { BaseAIAdapter } from './AIAdapter';
import { AIResponse } from '../shared-types';

export class MockAIAdapter extends BaseAIAdapter {
  name = 'Mock AI';
  description = 'Mock AI adapter for development and testing';

  private mockResponses = [
    "I understand you're asking about the selected text. Based on what I can see, this appears to be discussing a technical concept. Let me break this down for you...",
    "That's an interesting question about the highlighted content. From my analysis, I can see several key points that might be relevant to your inquiry...",
    "Looking at the text you've selected, I can provide some insights. This seems to be related to a broader topic that has several important aspects...",
    "Great question! The selected text touches on some important concepts. Here's what I think might be most relevant to your query...",
    "I can help you understand this better. The text you've highlighted contains several key elements that are worth exploring further...",
    "Based on the context you've provided, I can offer some analysis. This appears to be part of a larger discussion about...",
    "That's a thoughtful question about this content. Let me provide some context and analysis that might help clarify things...",
    "I see what you're asking about. The selected text seems to be addressing a specific topic that has multiple dimensions...",
    "Interesting selection! This text appears to be discussing concepts that are relevant to several areas. Here's my take on it...",
    "I can provide some insights on this. The highlighted content seems to be part of a broader narrative or explanation..."
  ];

  async generate(prompt: string, context?: any): Promise<AIResponse> {
    // Simulate network delay
    const delay = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Select a random response
    const responseText = this.mockResponses[Math.floor(Math.random() * this.mockResponses.length)];
    
    // Add some context-aware modifications
    let finalResponse = responseText;
    if (context?.selectedText) {
      finalResponse += `\n\nThe text you selected: "${context.selectedText.substring(0, 100)}${context.selectedText.length > 100 ? '...' : ''}"`;
    }
    
    if (context?.url) {
      finalResponse += `\n\nThis analysis is based on content from: ${context.url}`;
    }

    return this.createResponse(finalResponse || 'No response generated');
  }
}
