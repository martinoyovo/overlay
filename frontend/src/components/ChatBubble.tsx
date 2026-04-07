import React from 'react';
import { ChatMessage } from '../shared-types';

interface ChatBubbleProps {
  message: ChatMessage;
  isLast?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isLast = false }) => {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${isLast ? 'mb-6' : ''}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-blue-500 text-white rounded-br-md' 
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.text}
          </div>
        </div>
        
        {/* Context info for AI messages */}
        {!isUser && message.context && (
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            {message.context.selectedText && (
              <div className="bg-gray-50 rounded-lg p-2 border">
                <span className="font-medium">Selected text:</span> 
                <span className="ml-1 text-gray-600">
                  {message.context.selectedText.length > 100 
                    ? `${message.context.selectedText.substring(0, 100)}...` 
                    : message.context.selectedText
                  }
                </span>
              </div>
            )}
            {message.context.url && (
              <div>
                <span className="font-medium">Source:</span> 
                <span className="ml-1 text-blue-600 hover:underline cursor-pointer">
                  {new URL(message.context.url).hostname}
                </span>
              </div>
            )}
          </div>
        )}
        
        <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {timestamp}
        </div>
      </div>
      
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        isUser 
          ? 'bg-blue-500 text-white order-1 ml-2' 
          : 'bg-gray-200 text-gray-600 order-2 mr-2'
      }`}>
        {isUser ? 'U' : 'AI'}
      </div>
    </div>
  );
};
