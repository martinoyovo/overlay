import { contextBridge, ipcRenderer } from 'electron';

// Helper function for safe IPC calls with error handling
const safeInvoke = async (channel: string, ...args: any[]): Promise<any> => {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.error(`IPC invoke failed for channel ${channel}:`, error);
    throw error;
  }
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window management
  resizeWindow: (height: number) => safeInvoke('resize-window', height),
  closeWindow: () => safeInvoke('close-window'),
  popupReady: () => safeInvoke('popup-ready'),

  // Multiple popup mode
  toggleMultiPopupMode: (enabled: boolean) => ipcRenderer.invoke('toggle-multi-popup-mode', enabled),
  getMultiPopupMode: () => ipcRenderer.invoke('get-multi-popup-mode'),

  // Keyboard shortcuts
  getShortcuts: () => safeInvoke('get-shortcuts'),

  // Utility properties
  platform: process.platform,
  isProduction: process.env.NODE_ENV === 'production',

  // Events with automatic cleanup
  onTextCaptured: (callback: (data: any) => void) => {
    const wrappedCallback = (event: any, data: any) => callback(data);
    ipcRenderer.on('text-captured', wrappedCallback);
    return () => ipcRenderer.removeListener('text-captured', wrappedCallback);
  },

  onOCRCompleted: (callback: (data: any) => void) => {
    const wrappedCallback = (event: any, data: any) => callback(data);
    ipcRenderer.on('ocr-completed', wrappedCallback);
    return () => ipcRenderer.removeListener('ocr-completed', wrappedCallback);
  },

  onScreenshotCaptured: (callback: (data: { imageDataUrl: string }) => void) => {
    const wrappedCallback = (event: any, data: any) => callback(data);
    ipcRenderer.on('screenshot-captured', wrappedCallback);
    return () => ipcRenderer.removeListener('screenshot-captured', wrappedCallback);
  },

  // Remove all listeners for a channel
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Log functions that work in both dev and production
  log: {
    info: (...args: any[]) => console.log('[Renderer]', ...args),
    warn: (...args: any[]) => console.warn('[Renderer]', ...args),
    error: (...args: any[]) => console.error('[Renderer]', ...args),
  }
});

export {};
