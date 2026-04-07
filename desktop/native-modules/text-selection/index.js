const path = require('path');

let nativeModule;

try {
  // Try to load the compiled native module
  nativeModule = require('./build/Release/text_selection.node');
} catch (error) {
  console.error('Failed to load native module:', error.message);
  console.log('Make sure to run "npm run build" first');
  nativeModule = null;
}

class TextSelectionNative {
  constructor() {
    this.isAvailable = !!nativeModule;
  }

  /**
   * Get currently selected text from any application
   * @returns {Promise<string>} Selected text or empty string
   */
  async getSelectedText() {
    if (!this.isAvailable) {
      throw new Error('Native module not available. Run "npm run build" to compile.');
    }

    try {
      const result = nativeModule.getSelectedText();
      return result || '';
    } catch (error) {
      console.error('Error getting selected text:', error);
      return '';
    }
  }

  /**
   * Check if the native module is available
   * @returns {boolean} True if native module is loaded
   */
  isModuleAvailable() {
    return this.isAvailable;
  }

  /**
   * Check accessibility permissions (macOS only)
   * @returns {Promise<boolean>} True if permissions are granted
   */
  async checkPermissions() {
    if (!this.isAvailable) {
      return false;
    }

    try {
      return nativeModule.checkPermissions();
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Send native copy shortcut (Cmd+C on macOS). Returns true if posted.
   */
  async sendCopyShortcut() {
    if (!this.isAvailable) return false;
    try {
      return nativeModule.sendCopyShortcut();
    } catch (e) {
      return false;
    }
  }

  /**
   * Get platform-specific information
   * @returns {object} Platform and availability info
   */
  getInfo() {
    return {
      platform: process.platform,
      available: this.isAvailable,
      supportedPlatforms: ['darwin', 'win32', 'linux']
    };
  }
}

module.exports = TextSelectionNative;