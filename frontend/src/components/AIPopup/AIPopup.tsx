import React, { useState, useRef, useEffect } from 'react';
import { CustomHeader } from './CustomHeader';
import { SmartAssistant } from './SmartAssistant';
import { TextDisplay } from './TextDisplay';
import { QuickActions } from './QuickActions';
import { CompactInput } from './CompactInput';
import { useChat } from '../../hooks/useChat';
import { useTheme } from '../../hooks/useTheme';
import { QUICK_ACTION_CONFIG, QuickActionType } from '../../constants/actions';

interface AIPopupProps {
  selectedText?: string;
  capturedImage?: string;
  onClose: () => void;
  onSubmit?: (prompt: string) => void;
  onTranslate?: () => void;
  onCopy?: () => void;
  onLiveThoughts?: () => void;
}

export const AIPopup: React.FC<AIPopupProps> = ({
  selectedText = '',
  capturedImage = '',
  onClose,
  onSubmit,
  onTranslate,
  onCopy,
  onLiveThoughts
}) => {
  console.log('AIPopup component loaded successfully');

  const [inputValue, setInputValue] = useState('');
  const [attachedImage, setAttachedImage] = useState(capturedImage);
  const [isLoaded, setIsLoaded] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // When the parent delivers the screenshot (arrives after mount via IPC)
  useEffect(() => {
    if (capturedImage) setAttachedImage(capturedImage);
  }, [capturedImage]);

  const {
    loading,
    sendMessage
  } = useChat();

  // Signal ready to Electron on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
      window.electronAPI?.popupReady();
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Resize the Electron window whenever the container changes height (text, collapse, messages, etc.)
  useEffect(() => {
    if (!popupRef.current || !window.electronAPI?.resizeWindow) return;

    const observer = new ResizeObserver(() => {
      if (popupRef.current) {
        window.electronAPI!.resizeWindow(popupRef.current.scrollHeight + 2);
      }
    });

    observer.observe(popupRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = async (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        try {
          // Close the Electron window directly
          if (window.electronAPI?.closeWindow) {
            await window.electronAPI.closeWindow();
          } else {
            // Fallback to the onClose callback
            onClose();
          }
        } catch (error) {
          console.error('Failed to close window:', error);
          // Fallback to the onClose callback
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async (prompt: string) => {
    const imageToSend = attachedImage;
    setAttachedImage('');
    if (onSubmit) {
      onSubmit(prompt);
    } else {
      await sendMessage(prompt, selectedText, imageToSend || undefined);
    }
    setInputValue('');
  };

  const handleQuickAction = async (action: QuickActionType) => {
    const config = QUICK_ACTION_CONFIG[action];
    if (config) {
      await handleSubmit(config.prompt(selectedText));
    }
  };

  const handleTranslate = () => {
    if (onTranslate) {
      onTranslate();
    } else {
      handleQuickAction('translate');
    }
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    } else {
      navigator.clipboard.writeText(selectedText);
    }
  };

  const handleLiveThoughts = () => {
    if (onLiveThoughts) {
      onLiveThoughts();
    } else {
      handleSubmit(`Please provide your thoughts and analysis on this text: "${selectedText}"`);
    }
  };

  return (
    <div
      ref={popupRef}
      className={`popup-container ${theme.isDark ? 'theme-dark' : 'theme-light'} ${isLoaded ? 'loaded' : ''}`}
      style={{
        width: '100%',
        background: 'transparent',
        backdropFilter: theme.backdropFilters.heavy,
        WebkitBackdropFilter: theme.backdropFilters.heavy,
        borderRadius: theme.borderRadius.xl,
        border: 'none',
        boxShadow: `${theme.shadows.glassLarge}, ${theme.shadows.glass}`,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 10000,
        pointerEvents: 'auto'
      }}
    >
      <CustomHeader onClose={onClose} />

      <div className="popup-content">
        <SmartAssistant
          onTranslate={handleTranslate}
          onLiveThoughts={handleLiveThoughts}
          onCopy={handleCopy}
        />

        {selectedText && <TextDisplay text={selectedText} />}

        <QuickActions onAction={handleQuickAction} />

        <CompactInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          loading={loading}
          attachedImage={attachedImage}
          onRemoveImage={() => setAttachedImage('')}
        />
      </div>
    </div>
  );
};
