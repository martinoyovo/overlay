import { app, screen, nativeImage, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import screenshot from 'screenshot-desktop';

export interface CaptureBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureOptions {
  format?: 'png' | 'jpg';
  quality?: number;
  saveToFile?: boolean;
}

export class ScreenCaptureService {
  private selectionWindow: BrowserWindow | null = null;
  private isCapturing = false;
  private tempDir: string;

  constructor() {
    this.tempDir = app.getPath('temp');
  }

  async initialize(): Promise<void> {
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async captureFullScreen(options: CaptureOptions = {}): Promise<string> {
    try {
      const imageBuffer = await screenshot();
      const image = nativeImage.createFromBuffer(imageBuffer);
      
      const timestamp = Date.now();
      const filename = `screenshot-${timestamp}.png`;
      const filePath = path.join(this.tempDir, filename);
      
      fs.writeFileSync(filePath, image.toPNG());
      
      console.log('Full screen captured:', filePath);
      return filePath;
    } catch (error) {
      console.error('Failed to capture full screen:', error);
      throw error;
    }
  }

  async captureRegion(bounds: CaptureBounds, options: CaptureOptions = {}): Promise<string> {
    try {
      // Capture full screen first
      const fullScreenPath = await this.captureFullScreen();
      const fullImage = nativeImage.createFromPath(fullScreenPath);
      
      // Crop to the specified region
      const croppedImage = fullImage.crop({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      });
      
      const timestamp = Date.now();
      const filename = `region-${timestamp}.png`;
      const filePath = path.join(this.tempDir, filename);
      
      fs.writeFileSync(filePath, croppedImage.toPNG());
      
      // Clean up full screen capture
      fs.unlinkSync(fullScreenPath);
      
      console.log('Region captured:', filePath);
      return filePath;
    } catch (error) {
      console.error('Failed to capture region:', error);
      throw error;
    }
  }

  async startRectangleSelection(): Promise<CaptureBounds | null> {
    if (this.isCapturing) {
      return null;
    }

    this.isCapturing = true;
    
    return new Promise((resolve) => {
      this.createSelectionWindow(resolve);
    });
  }

  private createSelectionWindow(resolve: (bounds: CaptureBounds | null) => void): void {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    
    // Create a transparent window that covers all displays
    this.selectionWindow = new BrowserWindow({
      width: primaryDisplay.size.width,
      height: primaryDisplay.size.height,
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      show: false
    });

    // Load the selection UI
    const selectionHTML = this.createSelectionHTML();
    this.selectionWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(selectionHTML)}`);

    this.selectionWindow.once('ready-to-show', () => {
      this.selectionWindow?.show();
    });

    // Handle selection completion
    this.selectionWindow.webContents.on('ipc-message', (event, channel, bounds) => {
      if (channel === 'selection-complete') {
        this.isCapturing = false;
        this.selectionWindow?.close();
        this.selectionWindow = null;
        resolve(bounds);
      } else if (channel === 'selection-cancelled') {
        this.isCapturing = false;
        this.selectionWindow?.close();
        this.selectionWindow = null;
        resolve(null);
      }
    });

    // Handle window close
    this.selectionWindow.on('closed', () => {
      this.isCapturing = false;
      this.selectionWindow = null;
      resolve(null);
    });
  }

  private createSelectionHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: rgba(0, 0, 0, 0.3);
              cursor: crosshair;
              user-select: none;
              overflow: hidden;
            }
            
            #selection-box {
              position: absolute;
              border: 2px solid #3B82F6;
              background: rgba(59, 130, 246, 0.1);
              display: none;
            }
            
            #instructions {
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              font-family: Arial, sans-serif;
              font-size: 14px;
              z-index: 1000;
            }
            
            #coordinates {
              position: fixed;
              bottom: 20px;
              right: 20px;
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 5px 10px;
              border-radius: 3px;
              font-family: monospace;
              font-size: 12px;
              z-index: 1000;
            }
          </style>
        </head>
        <body>
          <div id="instructions">
            Click and drag to select a region. Press ESC to cancel.
          </div>
          <div id="coordinates"></div>
          <div id="selection-box"></div>
          
          <script>
            const { ipcRenderer } = require('electron');
            
            let isSelecting = false;
            let startX = 0;
            let startY = 0;
            let selectionBox = document.getElementById('selection-box');
            let coordinates = document.getElementById('coordinates');
            
            document.addEventListener('mousedown', (e) => {
              isSelecting = true;
              startX = e.clientX;
              startY = e.clientY;
              selectionBox.style.display = 'block';
              selectionBox.style.left = startX + 'px';
              selectionBox.style.top = startY + 'px';
              selectionBox.style.width = '0px';
              selectionBox.style.height = '0px';
            });
            
            document.addEventListener('mousemove', (e) => {
              if (!isSelecting) return;
              
              const currentX = e.clientX;
              const currentY = e.clientY;
              
              const left = Math.min(startX, currentX);
              const top = Math.min(startY, currentY);
              const width = Math.abs(currentX - startX);
              const height = Math.abs(currentY - startY);
              
              selectionBox.style.left = left + 'px';
              selectionBox.style.top = top + 'px';
              selectionBox.style.width = width + 'px';
              selectionBox.style.height = height + 'px';
              
              coordinates.textContent = \`\${width} × \${height} (\${left}, \${top})\`;
            });
            
            document.addEventListener('mouseup', (e) => {
              if (!isSelecting) return;
              
              isSelecting = false;
              const currentX = e.clientX;
              const currentY = e.clientY;
              
              const bounds = {
                x: Math.min(startX, currentX),
                y: Math.min(startY, currentY),
                width: Math.abs(currentX - startX),
                height: Math.abs(currentY - startY)
              };
              
              // Only complete if selection is large enough
              if (bounds.width > 10 && bounds.height > 10) {
                ipcRenderer.send('selection-complete', bounds);
              } else {
                selectionBox.style.display = 'none';
                coordinates.textContent = '';
              }
            });
            
            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') {
                ipcRenderer.send('selection-cancelled');
              }
            });
            
            // Prevent context menu
            document.addEventListener('contextmenu', (e) => {
              e.preventDefault();
            });
          </script>
        </body>
      </html>
    `;
  }

  async captureActiveWindow(): Promise<string> {
    try {
      // This is a simplified version - in a real implementation,
      // you'd use platform-specific APIs to get the active window bounds
      const primaryDisplay = screen.getPrimaryDisplay();
      const bounds = primaryDisplay.bounds;
      
      return await this.captureRegion({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      });
    } catch (error) {
      console.error('Failed to capture active window:', error);
      throw error;
    }
  }

  async captureMultipleDisplays(): Promise<string[]> {
    try {
      const displays = screen.getAllDisplays();
      const captures: string[] = [];
      
      for (const display of displays) {
        const bounds = display.bounds;
        const capture = await this.captureRegion({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        });
        captures.push(capture);
      }
      
      return captures;
    } catch (error) {
      console.error('Failed to capture multiple displays:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.selectionWindow) {
      this.selectionWindow.close();
      this.selectionWindow = null;
    }
    
    // Clean up old screenshot files (older than 1 hour)
    try {
      const files = fs.readdirSync(this.tempDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const file of files) {
        if (file.startsWith('screenshot-') || file.startsWith('region-')) {
          const filePath = path.join(this.tempDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < oneHourAgo) {
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old screenshots:', error);
    }
  }

  getDisplays(): Electron.Display[] {
    return screen.getAllDisplays();
  }

  getPrimaryDisplay(): Electron.Display {
    return screen.getPrimaryDisplay();
  }
}
