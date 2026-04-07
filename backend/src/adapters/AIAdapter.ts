import { AIResponse } from '../shared-types';

export interface AIAdapter {
  generate(prompt: string, context?: any): Promise<AIResponse>;
  name: string;
  description: string;
}

export abstract class BaseAIAdapter implements AIAdapter {
  abstract name: string;
  abstract description: string;
  
  abstract generate(prompt: string, context?: any): Promise<AIResponse>;
  
  protected createResponse(text: string, context?: any): AIResponse {
    return {
      text,
      timestamp: Date.now(),
      metadata: {
        model: this.name,
        responseTime: 0,
      }
    };
  }
}
