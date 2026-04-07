import React, { useState, useEffect } from 'react';
import { Popup } from './components/Popup';
import { AIPopup } from './components/AIPopup/AIPopup';
import SettingsComponent from './components/SettingsComponent/SettingsComponent';
import { useChat } from './hooks/useChat';
import './App.css';
import './components/AIPopup/AIPopup.styles.css';
import './shared-types';

function App() {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [capturedImage, setCapturedImage] = useState('');
  const [isPopupMode, setIsPopupMode] = useState<boolean>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPopupWindow = urlParams.get('mode') === 'popup';

    if (isPopupWindow) {
      localStorage.setItem('ai-popup-mode', 'true');
      return true;
    }

    const popupMode = localStorage.getItem('ai-popup-mode') === 'true';
    if (popupMode && !isPopupWindow) {
      localStorage.removeItem('ai-popup-mode');
      return false;
    }

    return popupMode;
  });

  useChat();

  useEffect(() => {
    if (isPopupMode) {
      localStorage.setItem('ai-popup-mode', 'true');
    } else {
      localStorage.removeItem('ai-popup-mode');
    }
  }, [isPopupMode]);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onTextCaptured((data: any) => {
      if (data.text) {
        setSelectedText(data.text);
        if (data.source === 'quick-ai-popup') {
          setIsPopupMode(true);
          localStorage.setItem('ai-popup-mode', 'true');
        } else {
          setShowPopup(true);
        }
        setTimeout(() => window.focus(), 100);
      }
    });

    window.electronAPI.onOCRCompleted((data: any) => {
      if (data.text) {
        setSelectedText(data.text);
        setShowPopup(true);
      }
    });

    const cleanupScreenshot = window.electronAPI.onScreenshotCaptured?.((data) => {
      if (data.imageDataUrl) {
        setCapturedImage(data.imageDataUrl);
      }
    });

    return () => {
      window.electronAPI?.removeAllListeners('text-captured');
      window.electronAPI?.removeAllListeners('ocr-completed');
      window.electronAPI?.removeAllListeners('screenshot-captured');
      cleanupScreenshot?.();
    };
  }, [isPopupMode]);

  const handleCloseAIPopup = () => {
    setIsPopupMode(false);
    setCapturedImage('');
    localStorage.removeItem('ai-popup-mode');
  };

  const shouldRenderPopup = isPopupMode;

  if (shouldRenderPopup) {
    return (
      <AIPopup
        selectedText={selectedText}
        capturedImage={capturedImage}
        onClose={handleCloseAIPopup}
      />
    );
  }

  return (
    <div className="App min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SettingsComponent />
      </div>

      {showPopup && (
        <Popup
          selectedText={selectedText}
          url={window.location.href}
          title={document.title}
          onClose={() => setShowPopup(false)}
          position={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
        />
      )}
    </div>
  );
}

export default App;
