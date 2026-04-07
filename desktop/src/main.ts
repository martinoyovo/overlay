import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard, dialog, shell, systemPreferences, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { OCRService } from './services/OCRService';
import { ScreenCaptureService } from './services/ScreenCaptureService';
import { TextCaptureService } from './services/TextCaptureService';

class DesktopApp {
  private mainWindow: BrowserWindow | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private aiPopupWindows: BrowserWindow[] = [];
  private allowMultiplePopups: boolean = false; // NEW: Toggle for multi-window mode
  private ocrService: OCRService;
  private screenCaptureService: ScreenCaptureService;
  private textCaptureService: TextCaptureService;
  private isDev: boolean;
  private lastCapturedText: string = '';
  private hasAccessibilityPermissions: boolean = false;
  private isCreatingPopup: boolean = false;

  constructor() {
    // 🔥 FIXED: Proper development mode detection
    this.isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
    console.log('🔧 Running in mode:', this.isDev ? 'development' : 'production');
    this.ocrService = new OCRService();
    this.screenCaptureService = new ScreenCaptureService();
    this.textCaptureService = new TextCaptureService();
  }

  async initialize() {
    await app.whenReady();
    
    // Check for accessibility permissions on macOS
    if (process.platform === 'darwin') {
      console.log('🔍 Checking accessibility permissions...');
      this.hasAccessibilityPermissions = await this.checkAndRequestAccessibilityPermissions();
      console.log('🔍 Accessibility permissions result:', this.hasAccessibilityPermissions);
    }
    
    // Load settings and initialize multi-popup preference
    const settings = this.getSettings();
    this.allowMultiplePopups = settings.ui?.allowMultiplePopups ?? false;
    console.log('🔧 Multi-popup mode initialized:', this.allowMultiplePopups);
    
    // Initialize services
    await this.ocrService.initialize();
    await this.screenCaptureService.initialize();
    await this.textCaptureService.initialize();

    this.createMainWindow();
    this.setupGlobalShortcuts();
    this.setupIPCHandlers();
    this.setupAppEvents();
    this.setupClipboardMonitoring();
    
    // Start permission monitoring (optional)
    if (process.platform === 'darwin') {
      this.setupPermissionMonitoring();
    }
  }

  private async checkAndRequestAccessibilityPermissions(): Promise<boolean> {
    
    try {
      // Check current permission status
      const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
      
      if (isTrusted) {
        console.log('✅ Accessibility permissions already granted');
        this.hasAccessibilityPermissions = true;
        return true;
      }
      
      console.log('❌ Accessibility permissions not granted');
      this.hasAccessibilityPermissions = false;
      
      // Show explanation dialog
      const response = await dialog.showMessageBox({
        type: 'question',
        title: 'Accessibility Permissions Required',
        message: 'Enable text capture from any application',
        detail: 'This app needs accessibility permissions to:\n\n• Capture selected text from any application\n• Work with your global keyboard shortcuts\n• Provide seamless AI assistance\n\nWithout these permissions, the app will only work with copied text.',
        buttons: ['Open System Preferences', 'Continue Without', 'Learn More'],
        defaultId: 0,
        cancelId: 1
      });
      
      switch (response.response) {
        case 0: // Open System Preferences
          console.log('🔐 Opening System Preferences for accessibility permissions...');
          systemPreferences.isTrustedAccessibilityClient(true);
          
          // Show follow-up instructions
          setTimeout(async () => {
            await dialog.showMessageBox({
              type: 'info',
              title: 'Grant Accessibility Access',
              message: 'Follow these steps in System Preferences:',
              detail: '1. Find "Privacy & Security" in the sidebar\n2. Click "Accessibility"\n3. Find your app in the list\n4. Toggle the switch to enable it\n5. Restart the app to apply changes',
              buttons: ['Got it!']
            });
          }, 1000);
          
          return false;
          
        case 1: // Continue Without
          console.log('⚠️ User chose to continue without accessibility permissions');
          return false;
          
        case 2: // Learn More
          await shell.openExternal('https://support.apple.com/guide/mac-help/allow-accessibility-apps-to-access-your-mac-mh43185/mac');
          // Recursively call this function again
          return this.checkAndRequestAccessibilityPermissions();
          
        default:
          return false;
      }
      
    } catch (error) {
      console.error('❌ Error checking accessibility permissions:', error);
      return false;
    }
  }

  private setupPermissionMonitoring() {
    if (process.platform !== 'darwin') return;
    
    // Check permissions every 30 seconds
    setInterval(() => {
      const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
      
      if (isTrusted && !this.hasAccessibilityPermissions) {
        console.log('✅ Accessibility permissions granted!');
        this.hasAccessibilityPermissions = true;
        this.showPermissionGrantedNotification();
      } else if (!isTrusted && this.hasAccessibilityPermissions) {
        console.log('❌ Accessibility permissions revoked');
        this.hasAccessibilityPermissions = false;
      }
    }, 30000);
  }

  private showPermissionGrantedNotification() {
    const notification = new BrowserWindow({
      width: 350,
      height: 120,
      x: screen.getPrimaryDisplay().workAreaSize.width - 370,
      y: 20,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      show: false,
      backgroundColor: '#00000000'
    });
    
    notification.loadURL(`data:text/html,
      <html>
        <body style="margin: 0; padding: 12px; background: transparent;">
          <div style="background: #10B981; color: white; font-family: Arial, sans-serif; border-radius: 8px; padding: 12px;">
          <div style="font-size: 13px; margin-bottom: 5px; font-weight: bold;">✅ Permissions Granted!</div>
          <div style="font-size: 11px; opacity: 0.9;">Text capture from any app is now enabled</div>
          </div>
        </body>
      </html>
    `);

    notification.once('ready-to-show', () => notification.show());

    setTimeout(() => {
      notification.close();
    }, 4000);
  }

  private createMainWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    this.mainWindow = new BrowserWindow({
      width: Math.min(1200, width * 0.8),
      height: Math.min(800, height * 0.8),
      x: (width - 1200) / 2,
      y: (height - 800) / 2,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      },
      show: false,
      backgroundColor: '#ffffff',
      icon: path.join(__dirname, '../assets/icon.png'),
      resizable: true,
      minimizable: true,
      maximizable: true
    });

    // Load the React app
    if (this.isDev) {
      this.mainWindow.loadURL('http://localhost:3005');
    } else {
      const frontendPath = app.isPackaged
        ? path.join(process.resourcesPath, 'frontend/build/index.html')
        : path.join(__dirname, '../../frontend/build/index.html');
      console.log('📁 Loading frontend from:', frontendPath);
      this.mainWindow.loadFile(frontendPath);
    }

    // In dev mode, retry loading until the React dev server is ready
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode) => {
      if (this.isDev) {
        console.log(`⏳ Dev server not ready (${errorCode}), retrying in 1s…`);
        setTimeout(() => {
          this.mainWindow?.loadURL('http://localhost:3005');
        }, 1000);
      } else {
        console.error('❌ Main window failed to load:', errorCode);
      }
    });

    this.mainWindow.once('ready-to-show', () => {
      console.log('✅ Main window ready to show');
      // Only show main window if we're not creating a popup
      if (!this.isCreatingPopup) {
        this.mainWindow?.show();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupGlobalShortcuts() {
    // FIXED: Only register CommandOrControl+Shift+A for Quick AI popup
    globalShortcut.register('CommandOrControl+Shift+A', () => {
      console.log('Quick AI shortcut triggered!');
      this.activateQuickAI();
    });

    // Use different shortcuts for other functions
    globalShortcut.register('CommandOrControl+Shift+T', () => {
      this.activateTextCapture(); // This shows main window
    });

    globalShortcut.register('CommandOrControl+Shift+O', () => {
      this.activateOCR();
    });

    globalShortcut.register('CommandOrControl+Shift+R', () => {
      this.activateRectangleSelection();
    });

    // Show/hide main window
    globalShortcut.register('CommandOrControl+Shift+Q', () => {
      if (this.mainWindow?.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow?.show();
      }
    });

    // Show/hide toggle (Cmd+\)
    globalShortcut.register('CommandOrControl+\\', () => {
      if (this.mainWindow?.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow?.show();
      }
    });
    
    // Force show main window (Cmd+Shift+M)
    globalShortcut.register('CommandOrControl+Shift+M', () => {
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });
  }

  private setupIPCHandlers() {
    // Window management
    ipcMain.handle('resize-window', async (event, height: number) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        const [currentWidth] = window.getSize();
        window.setSize(currentWidth, Math.ceil(height));
      }
    });

    ipcMain.handle('close-window', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        console.log('Closing window:', window.getTitle());
        window.close();
      }
      return true;
    });

    // Popup ready signal
    ipcMain.handle('popup-ready', async (event) => {
      console.log('🚀 Popup ready signal received');
      return true;
    });

    // Toggle multi-popup mode
    ipcMain.handle('toggle-multi-popup-mode', async (event, enabled: boolean) => {
      console.log('🔄 Toggling multi-popup mode:', enabled);
      this.allowMultiplePopups = enabled;
      
      // If disabling multi-popup mode and we have multiple popups, close all but the most recent
      if (!enabled && this.aiPopupWindows.length > 1) {
        console.log('🗑️ Disabling multi-popup mode, closing extra popups');
        const popupsToClose = this.aiPopupWindows.slice(0, -1); // All except the last one
        
        popupsToClose.forEach((window, index) => {
          if (!window.isDestroyed()) {
            console.log(`🔒 Closing extra AI popup window ${index}`);
            window.close();
          }
        });
        
        // Keep only the last popup
        this.aiPopupWindows = this.aiPopupWindows.slice(-1);
        console.log('📝 Kept only the most recent popup. Total count:', this.aiPopupWindows.length);
      }
      
      // Save setting to preferences
      const settings = this.getSettings();
      settings.ui.allowMultiplePopups = enabled;
      this.saveSettings(settings);
      
      return true;
    });

    // Get multi-popup mode status
    ipcMain.handle('get-multi-popup-mode', async () => {
      return this.allowMultiplePopups;
    });

    // Get registered keyboard shortcuts
    ipcMain.handle('get-shortcuts', async () => {
      return [
        { accelerator: 'CommandOrControl+Shift+A', description: 'Open AI Assistant popup with selected text' },
        { accelerator: 'CommandOrControl+Shift+R', description: 'Capture screen region → open AI popup with screenshot' },
        { accelerator: 'CommandOrControl+Shift+T', description: 'Capture selected text → show in main window' },
        { accelerator: 'CommandOrControl+Shift+O', description: 'Run OCR on full screen → show in main window' },
        { accelerator: 'CommandOrControl+Shift+M', description: 'Show main window' },
        { accelerator: 'CommandOrControl+Shift+Q', description: 'Toggle main window visibility' },
        { accelerator: 'CommandOrControl+\\',      description: 'Toggle main window visibility (alternative)' },
      ];
    });

  }

  private setupAppEvents() {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('before-quit', async () => {
      // Close AI popups if open
      if (this.aiPopupWindows.length > 0) {
        console.log('🗑️ Closing AI popups on app quit');
        this.aiPopupWindows.forEach(window => {
          if (!window.isDestroyed()) {
            window.close();
          }
        });
        this.aiPopupWindows = [];
      }
      
      // Cleanup services
      await this.ocrService.cleanup();
      await this.screenCaptureService.cleanup();
      await this.textCaptureService.cleanup();
    });
  }

  private async activateTextCapture() {
    try {
      const text = await this.textCaptureService.getSelectedText();
      if (text) {
        this.mainWindow?.webContents.send('text-captured', { text, source: 'selection' });
        // 🔥 ONLY show main window for regular text capture (Cmd+Shift+T)
        this.mainWindow?.show();
      }
    } catch (error) {
      console.error('Text capture failed:', error);
    }
  }

  private async activateQuickAI() {
    // Prevent concurrent invocations (key repeat, rapid shortcut, IPC race)
    if (this.isCreatingPopup) {
      console.log('⏸️ Already creating popup, ignoring duplicate shortcut');
      return;
    }

    // If a popup is already open, focus it instead of spawning another
    const existingPopup = this.aiPopupWindows.find(w => !w.isDestroyed());
    if (existingPopup) {
      console.log('🔁 Popup already open, focusing existing window');
      existingPopup.show();
      existingPopup.focus();
      return;
    }

    try {
      console.log('Activating Quick AI...');
      
      // 🔥 CAPTURE TEXT FIRST (before closing any windows to preserve selection)
      console.log('Attempting to capture selected text...');
      let selectedText = '';
      
      try {
        selectedText = await this.textCaptureService.getSelectedText();
      } catch (error) {
        console.log('Text capture service failed, trying fallback...');
      }
      
      console.log('captureSelectedText result:', selectedText ? selectedText.substring(0, 50) + '...' : 'empty');
      
      const cleanText = (selectedText && !selectedText.includes('__STANDARD_') && !selectedText.includes('__ENHANCED_') && !selectedText.includes('__AGGRESSIVE_') && !selectedText.includes('__TEMP_MARKER_'))
        ? selectedText.trim()
        : '';

      console.log(cleanText ? `✅ Captured text: ${cleanText.substring(0, 50)}...` : '⚠️ No selected text, opening popup anyway');
      this.createAIPopup(cleanText);
      
    } catch (error) {
      console.error('Quick AI activation failed:', error);
      this.showNativeNotification('Quick AI Error', 'Failed to activate Quick AI. Please try again.');
    }
  }

  private createAIPopup(selectedText: string, imageDataUrl?: string) {
    console.log('🪟 createAIPopup called with text:', selectedText ? selectedText.substring(0, 30) + '...' : '(empty)');
    
    this.isCreatingPopup = true;
    
    // Close existing popups if in single popup mode
    if (!this.allowMultiplePopups && this.aiPopupWindows.length > 0) {
      console.log('🗑️ Single popup mode: Closing existing AI popups');
      this.aiPopupWindows.forEach((window, index) => {
        if (!window.isDestroyed()) {
          console.log(`🔒 Closing AI popup window ${index}`);
          window.close();
        }
      });
      this.aiPopupWindows = [];
    }
    
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    // Smart positioning for multiple popups
    let xPosition = width - 420;
    let yPosition = 20;
    
    if (this.allowMultiplePopups && this.aiPopupWindows.length > 0) {
      const offset = this.aiPopupWindows.length * 30;
      xPosition = Math.max(width - 420 - offset, 50);
      yPosition = 20 + offset;
    }
    
    const popupWindow = new BrowserWindow({
        width: 400,
        height: 100,
        x: xPosition,
        y: yPosition,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        skipTaskbar: true,
        focusable: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
          webSecurity: true,
          backgroundThrottling: false
        },
        titleBarStyle: 'hidden',
        vibrancy: 'under-window',
        backgroundMaterial: 'acrylic',
        hasShadow: false,
        backgroundColor: '#00000000',
        ...(process.platform === 'darwin' && {
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: -1000, y: -1000 }
        }),
        show: false
    });

    // Load the React app with popup mode parameter
    if (this.isDev) {
        popupWindow.loadURL('http://localhost:3005?mode=popup');
    } else {
        const htmlPath = app.isPackaged
          ? path.join(process.resourcesPath, 'frontend/build/index.html')
          : path.join(__dirname, '../../frontend/build/index.html');
        popupWindow.loadFile(htmlPath, { query: { mode: 'popup' } });
    }

    popupWindow.once('ready-to-show', () => {
        console.log('🎉 Window ready to show');
        popupWindow.setMenuBarVisibility(false);
        popupWindow.setAutoHideMenuBar(true);

        // Send the captured text and show the window
        popupWindow.webContents.send('text-captured', { text: selectedText, source: 'quick-ai-popup' });
        if (imageDataUrl) {
          popupWindow.webContents.send('screenshot-captured', { imageDataUrl });
        }
        popupWindow.show();
        popupWindow.focus();
    });

    // Track this AI popup window
    this.aiPopupWindows.push(popupWindow);
    console.log('📝 Added AI popup window to tracking. Total count:', this.aiPopupWindows.length);
    
    popupWindow.on('closed', () => {
        console.log('🗑️ Popup window closed');
        const index = this.aiPopupWindows.indexOf(popupWindow);
        if (index > -1) {
            this.aiPopupWindows.splice(index, 1);
            console.log('📝 Removed AI popup window from tracking. Total count:', this.aiPopupWindows.length);
        }
        // Clear the popup-mode flag so the main window never accidentally
        // renders AIPopup instead of the settings page.
        this.mainWindow?.webContents.executeJavaScript(
          'localStorage.removeItem("ai-popup-mode")'
        ).catch(() => {});
    });
    
    // Reset popup creation flag after a short delay
    setTimeout(() => {
      this.isCreatingPopup = false;
    }, 1000);
  }

  private async activateOCR() {
    try {
      const imagePath = await this.screenCaptureService.captureFullScreen();
      const ocrResult = await this.ocrService.processImage(imagePath);
      this.mainWindow?.webContents.send('ocr-completed', ocrResult);
      this.mainWindow?.show();
    } catch (error) {
      console.error('OCR failed:', error);
    }
  }

  private async activateRectangleSelection() {
    try {
      const bounds = await this.screenCaptureService.startRectangleSelection();
      if (bounds) {
        const imagePath = await this.screenCaptureService.captureRegion(bounds);
        const imageBuffer = fs.readFileSync(imagePath);
        const imageDataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        fs.unlinkSync(imagePath);
        this.createAIPopup('', imageDataUrl);
      }
    } catch (error) {
      console.error('Rectangle selection failed:', error);
    }
  }

  private setupClipboardMonitoring() {
    let lastClipboardText = '';
    
    // Monitor clipboard changes every 200ms for faster response
    setInterval(() => {
      const currentText = clipboard.readText();
      
      // If clipboard has new text and it's different from last time
      if (currentText && currentText !== lastClipboardText && currentText.trim()) {
        lastClipboardText = currentText;
        
        // Store the text for manual activation
        this.lastCapturedText = currentText.trim();
        console.log('📋 Clipboard monitoring updated:', this.lastCapturedText.substring(0, 50) + '...');
      }
    }, 200);
  }

  private showErrorNotification() {
    const notification = new BrowserWindow({
      width: 300,
      height: 100,
      x: screen.getPrimaryDisplay().workAreaSize.width - 320,
      y: 20,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      show: false,
      backgroundColor: '#00000000'
    });
    
    notification.loadURL(`data:text/html,
      <html>
        <body style="margin: 0; padding: 10px; background: transparent;">
          <div style="background: #EF4444; color: white; font-family: Arial, sans-serif; border-radius: 8px; padding: 10px;">
            <div style="font-size: 12px; margin-bottom: 5px;">Error</div>
            <div style="font-size: 10px; opacity: 0.9;">Failed to capture text. Please try again.</div>
          </div>
        </body>
      </html>
    `);

    notification.once('ready-to-show', () => notification.show());

    setTimeout(() => {
      notification.close();
    }, 3000);
  }

  private showNativeNotification(title: string, body: string) {
    console.log('📢 Showing native notification:', title, body);
    
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: title,
        body: body,
        icon: path.join(__dirname, '../assets/icon.png'), // Optional icon
        silent: true, // Disable sound
        urgency: 'normal'
      });

      notification.on('click', () => {
        console.log('Notification clicked');
      });

      notification.show();
    } else {
      console.log('Native notifications not supported, falling back to browser window');
      this.showErrorNotification();
    }
  }

  private getSettings() {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    return this.getDefaultSettings();
  }

  private saveSettings(settings: any) {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  }

  private getDefaultSettings() {
    return {
      ocr: {
        engine: 'tesseract', // 'tesseract' or 'paddleocr'
        language: 'eng',
        confidence: 0.7
      },
      shortcuts: {
        quickAI: 'CommandOrControl+Shift+A',
        textCapture: 'CommandOrControl+Shift+T',
        ocr: 'CommandOrControl+Shift+O',
        rectangleSelection: 'CommandOrControl+Shift+R',
        toggleWindow: 'CommandOrControl+Shift+Q'
      },
      capture: {
        autoHighlight: true,
        showPreview: true,
        saveHistory: true
      },
      ui: {
        theme: 'light',
        overlayOpacity: 0.8,
        highlightColor: '#3B82F6',
        allowMultiplePopups: false // NEW: Default to single popup mode
      }
    };
  }
}

// Initialize the app
const desktopApp = new DesktopApp();
desktopApp.initialize().catch(console.error);