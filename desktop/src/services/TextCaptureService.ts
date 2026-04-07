// TextCaptureService.ts - Universal robust text capture for any application
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { clipboard } from 'electron';

const execAsync = promisify(exec);

interface CaptureMethod {
  name: string;
  priority: number;
  successRate: number;
  lastSuccess: number;
  failures: number;
  avgResponseTime: number;
}

interface CaptureAttempt {
  method: string;
  success: boolean;
  responseTime: number;
  error?: string;
  timestamp: number;
}

export class TextCaptureService {
  private nativeTextSelection: any = null;
  private isNativeAvailable: boolean = false;
  private isCapturing: boolean = false;
  
  // 🔥 NEW: Adaptive method tracking
  private methods: Map<string, CaptureMethod> = new Map();
  private captureHistory: CaptureAttempt[] = [];
  private lastCaptureTime: number = 0;
  private captureAttemptCount: number = 0;
  private debugMode: boolean = true;
  private lastSuccessfulMethodByApp: Map<string, string> = new Map();
  
  // 🔥 NEW: Performance-optimized adaptive settings
  private readonly MAX_HISTORY = 20; // Reduced from 50
  private readonly FAILURE_PENALTY = 0.15; // Faster learning
  private readonly SUCCESS_BOOST = 0.3; // Stronger boost for winners
  private readonly ADAPTIVE_TIMEOUT_BASE = 1200; // Increased for production stability
  private readonly METHOD_TIMEOUT_MULTIPLIER = 1.5; // More conservative for production
  private readonly MAX_METHODS_PER_ATTEMPT = 3; // Cap methods tried per attempt
  private readonly FAST_FAIL_THRESHOLD = 0.05; // More tolerant in production

  async initialize() {
    try {
      const nativeModulePath = path.join(__dirname, '../../native-modules/text-selection');
      this.log('🔍 Looking for native module at:', nativeModulePath);
      
      const TextSelectionNative = require(nativeModulePath);
      this.nativeTextSelection = new TextSelectionNative();
      this.isNativeAvailable = this.nativeTextSelection.isModuleAvailable();
      
      if (this.isNativeAvailable) {
        this.log('✅ Native text selection module loaded successfully');
        const hasPermissions = await this.nativeTextSelection.checkPermissions();
        this.log('🔐 Native module accessibility permissions:', hasPermissions);
      } else {
        this.log('❌ Native text selection module not available');
      }
    } catch (error) {
      console.error('Failed to load native text selection module:', error);
      this.isNativeAvailable = false;
    }
    
    // 🔥 Initialize capture methods with adaptive tracking
    this.initializeMethods();
    this.log('✅ TextCaptureService initialized with adaptive method selection');
  }

  // 🔥 NEW: Initialize methods with success rate tracking
  private initializeMethods() {
    this.methods.set('native', {
      name: 'Native Module',
      priority: 10, // Highest priority when available
      successRate: this.isNativeAvailable ? 0.8 : 0,
      lastSuccess: 0,
      failures: 0,
      avgResponseTime: 100
    });
    
    this.methods.set('applescript_focused', {
      name: 'AppleScript Focused Element',
      priority: 9, // Higher priority - usually fastest
      successRate: 0.8, // Higher initial confidence
      lastSuccess: 0,
      failures: 0,
      avgResponseTime: 150 // Optimistic estimate
    });
    
    this.methods.set('clipboard_standard', {
      name: 'Standard Clipboard Copy',
      priority: 7, // Bumped up - often reliable
      successRate: 0.7, // Higher confidence
      lastSuccess: 0,
      failures: 0,
      avgResponseTime: 250
    });
    
    this.methods.set('applescript_deep', {
      name: 'AppleScript Deep Search',
      priority: 4, // Lower priority due to slowness
      successRate: 0.5, // Conservative
      lastSuccess: 0,
      failures: 0,
      avgResponseTime: 600 // Known to be slow
    });
    
    this.methods.set('clipboard_enhanced', {
      name: 'Enhanced Clipboard Copy',
      priority: 3,
      successRate: 0.4,
      lastSuccess: 0,
      failures: 0,
      avgResponseTime: 500 // Reduced estimate
    });
    
    this.methods.set('clipboard_aggressive', {
      name: 'Aggressive Multi-Attempt Clipboard',
      priority: 1, // Lowest - only when desperate
      successRate: 0.2, // Low confidence
      lastSuccess: 0,
      failures: 0,
      avgResponseTime: 1200 // Still slow but capped
    });
  }

  /**
   * Universal adaptive text capture that learns from success/failure patterns
   */
  async getSelectedText(): Promise<string> {
    if (this.isCapturing) {
      this.log('Already capturing, skipping...');
      return '';
    }

    this.isCapturing = true;
    this.captureAttemptCount++;
    const startTime = Date.now();
    const timeSinceLastCapture = startTime - this.lastCaptureTime;
    
    this.log(`🔍 Adaptive capture attempt #${this.captureAttemptCount}, ${timeSinceLastCapture}ms since last capture`);
    
    // 🔥 DEBUG: Check which app is frontmost
    try {
      const activeWindow = await this.getActiveWindowInfo();
      this.log(`🎯 Active app: ${activeWindow?.app || 'unknown'}, window: ${activeWindow?.title || 'unknown'}`);
    } catch (error) {
      this.log('❌ Could not get active window info');
    }
    
    // 🔥 Adaptive timeout based on recent performance
    const adaptiveTimeout = this.calculateAdaptiveTimeout();
    const captureTimeout = setTimeout(() => {
      this.isCapturing = false;
      this.log('Capture timeout, resetting state');
    }, adaptiveTimeout);
    
    try {
      // 🔥 Get top methods only (performance optimization)
      let orderedMethods = this.getOrderedMethods(timeSinceLastCapture)
        .filter(m => m.score >= this.FAST_FAIL_THRESHOLD) // Skip very low scoring methods
        .slice(0, this.MAX_METHODS_PER_ATTEMPT); // Limit methods per attempt

      // Per-app preference: if we have a known best method, try it first
      try {
        const activeWindow = await this.getActiveWindowInfo();
        const app = activeWindow?.app || '';
        const preferred = app ? this.lastSuccessfulMethodByApp.get(app) : undefined;
        if (preferred) {
          const idx = orderedMethods.findIndex(m => m.method === preferred);
          if (idx > 0) {
            const [m] = orderedMethods.splice(idx, 1);
            orderedMethods.unshift(m);
            this.log(`🚀 Preferring ${m.name} for app ${app}`);
          }
        }
      } catch {}
      
      if (orderedMethods.length === 0) {
        this.log('⚠️ No viable methods found, using fallback order');
        // Emergency fallback to prevent complete failure
        const fallbackMethods = ['applescript_focused', 'clipboard_standard'].map(method => ({
          method,
          name: this.methods.get(method)?.name || method,
          score: 0.1
        }));
        orderedMethods.push(...fallbackMethods);
      }
      
      this.log('📊 Top methods:', orderedMethods.map(m => `${m.name}(${m.score.toFixed(2)})`).join(', '));
      
      // 🔥 Try methods with performance monitoring
      for (const methodInfo of orderedMethods) {
        const methodStart = Date.now();
        let result = '';
        let error: string | undefined;
        
        try {
          this.log(`🎯 Trying ${methodInfo.name}...`);
          
          // 🔥 Performance optimization: Skip delay for high-confidence methods
          const adaptiveDelay = methodInfo.score > 0.8 ? 0 : this.calculateMethodDelay(methodInfo.method, timeSinceLastCapture);
          if (adaptiveDelay > 0) {
            this.log(`⏱️ Applying adaptive delay: ${adaptiveDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
          }
          
          // 🔥 Performance optimization: Method-specific timeout
          const methodTimeout = this.calculateMethodTimeout(methodInfo.method);
          result = await Promise.race([
            this.executeMethod(methodInfo.method),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('Method timeout')), methodTimeout)
            )
          ]);
          
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
          this.log(`❌ ${methodInfo.name} failed:`, error);
        }
        
        const responseTime = Date.now() - methodStart;
        const success = !!(result && result.trim());
        
        // 🔥 Performance optimization: Early success return
        if (success) {
          this.log(`✅ ${methodInfo.name} succeeded (${responseTime}ms):`, result.substring(0, 50) + '...');
          this.lastCaptureTime = Date.now();
          
          // Record success and immediately return
          this.recordAttempt({
            method: methodInfo.method,
            success: true,
            responseTime,
            timestamp: Date.now()
          });
          // Remember best method per front app
          try {
            const activeWindow = await this.getActiveWindowInfo();
            const app = activeWindow?.app || '';
            if (app) this.lastSuccessfulMethodByApp.set(app, methodInfo.method);
          } catch {}
          
          return result.trim();
        } else {
          // Record failure but continue to next method
          this.recordAttempt({
            method: methodInfo.method,
            success: false,
            responseTime,
            error,
            timestamp: Date.now()
          });
        }
      }
      
      this.log('❌ All adaptive methods failed');
      return '';
      
    } finally {
      clearTimeout(captureTimeout);
      this.isCapturing = false;
    }
  }

  // 🔥 NEW: Calculate method-specific timeout for performance
  private calculateMethodTimeout(method: string): number {
    const methodInfo = this.methods.get(method);
    if (!methodInfo) return 2000;
    
    // Base timeout on historical performance
    let timeout = Math.max(500, methodInfo.avgResponseTime * 2);
    
    // Cap expensive methods
    if (method === 'applescript_deep') timeout = Math.min(timeout, 1000);
    if (method === 'clipboard_aggressive') timeout = Math.min(timeout, 2000);
    
    return timeout;
  }

  // 🔥 PERFORMANCE-OPTIMIZED: Calculate adaptive method ordering
  private getOrderedMethods(timeSinceLastCapture: number): Array<{method: string, name: string, score: number}> {
    const methods = Array.from(this.methods.entries()).map(([key, method]) => {
      // 🔥 Performance optimization: Simpler scoring calculation
      let score = method.successRate * method.priority;
      
      // 🔥 Strong boost for recent successes (last 5 seconds)
      const timeSinceSuccess = Date.now() - method.lastSuccess;
      if (timeSinceSuccess < 5000) {
        score *= 2.5; // Strong boost for very recent success
      } else if (timeSinceSuccess < 30000) {
        score *= 1.3; // Moderate boost for recent success
      }
      
      // 🔥 Harsh penalty for recent failures
      if (method.failures > 1) {
        score *= Math.max(0.05, 1 - (method.failures * 0.25)); // Harsher penalty
      }
      
      // 🔥 Performance factor (heavily favor fast methods)
      const speedBonus = Math.max(0.1, 1 - (method.avgResponseTime / 1000));
      score *= speedBonus;
      
      // 🔥 Context-specific optimizations
      if (key === 'native') {
        if (this.captureAttemptCount === 1) {
          score *= 1.8; // Moderate boost for first attempt
        } else if (timeSinceLastCapture < 1500) {
          score *= 0.1; // Severe penalty for rapid re-attempts
        }
      }
      
      // 🔥 Emergency boost for clipboard when others fail
      if (key === 'clipboard_standard' && this.getRecentFailureRate() > 0.8) {
        score *= 3;
      }
      
      return {
        method: key,
        name: method.name,
        score: Math.max(0, score)
      };
    });
    
    return methods
      .filter(m => m.score >= this.FAST_FAIL_THRESHOLD) // Skip very low performers
      .sort((a, b) => b.score - a.score)
      .slice(0, 4); // Cap at 4 methods max for performance
  }

  // 🔥 NEW: Execute specific capture method
  private async executeMethod(method: string): Promise<string> {
    switch (method) {
      case 'native':
        return this.tryNativeMethod();
      case 'applescript_focused':
        return this.tryAppleScriptFocused();
      case 'applescript_deep':
        return this.tryAppleScriptDeep();
      case 'clipboard_standard':
        return this.tryClipboardStandard();
      case 'clipboard_enhanced':
        return this.tryClipboardEnhanced();
      case 'clipboard_aggressive':
        return this.tryClipboardAggressive();
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // 🔥 NATIVE METHOD
  private async tryNativeMethod(): Promise<string> {
    if (!this.isNativeAvailable || !this.nativeTextSelection) {
      throw new Error('Native module not available');
    }
    
    // Fresh permission check for each attempt
    const hasPermissions = await this.nativeTextSelection.checkPermissions();
    if (!hasPermissions) {
      throw new Error('Native module permissions denied');
    }
    
    const selectedText = await this.nativeTextSelection.getSelectedText();
    if (!selectedText || !selectedText.trim()) {
      throw new Error('Native module returned empty text');
    }
    
    return selectedText.trim();
  }

  // 🔥 APPLESCRIPT FOCUSED
  private async tryAppleScriptFocused(): Promise<string> {
    if (process.platform !== 'darwin') {
      throw new Error('AppleScript only available on macOS');
    }

    // Use a file-based script to avoid -e argument parsing issues
    const script = `
tell application "System Events"
  set frontProc to first application process whose frontmost is true
  tell frontProc
    try
      set sel to value of attribute "AXSelectedText" of (first UI element of entire contents whose value of attribute "AXSelectedText" is not missing value and value of attribute "AXSelectedText" is not "")
      if sel is not missing value and sel is not "" then return sel as string
    end try
  end tell
end tell
return ""`;

    const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
      execFile('osascript', ['-e', script], (err, stdout) => {
        if (err) reject(err); else resolve({ stdout });
      });
    });
    const result = stdout.trim();

    if (!result) {
      throw new Error('AppleScript focused method returned empty');
    }

    return result;
  }

  // 🔥 PERFORMANCE-OPTIMIZED APPLESCRIPT DEEP SEARCH
  private async tryAppleScriptDeep(): Promise<string> {
    if (process.platform !== 'darwin') {
      throw new Error('AppleScript only available on macOS');
    }

    // Write to a temp .scpt file to avoid all -e flag escaping/parsing issues.
    // Also avoids the "focused UI element" class-name parse error by searching
    // entire contents for elements whose AXSelectedText is non-empty instead.
    const script = `tell application "System Events"
  try
    set frontProcess to first application process whose frontmost is true
    tell frontProcess
      try
        set allElems to entire contents
        repeat with elem in allElems
          try
            set tv to value of attribute "AXSelectedText" of elem
            if tv is not missing value and tv is not "" then
              return (tv as string)
            end if
          end try
        end repeat
      end try
    end tell
  end try
  return ""
end tell`;

    const tmpFile = path.join(os.tmpdir(), `as_deep_${Date.now()}.scpt`);
    try {
      fs.writeFileSync(tmpFile, script, 'utf8');
      const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
        execFile('osascript', [tmpFile], (err, stdout) => {
          if (err) reject(err); else resolve({ stdout });
        });
      });
      const result = stdout.trim();
      if (!result) {
        throw new Error('AppleScript deep search returned empty');
      }
      return result;
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }

  // 🔥 STANDARD CLIPBOARD
  private async tryClipboardStandard(): Promise<string> {
    const originalClipboard = clipboard.readText();
    const marker = `__STANDARD_${Date.now()}__`;

    clipboard.writeText(marker);
    await new Promise(resolve => setTimeout(resolve, 50));

    const copyResult = await this.performCopy();
    if (!copyResult.success) {
      throw new Error(`Copy failed: ${copyResult.error}`);
    }

    // 600ms is enough for a real Cmd+C to land; if nothing changes by then
    // the target app has no selection and we should fail fast rather than block.
    const newText = await this.waitForClipboardChange(marker, 600);

    // Restore clipboard regardless of outcome
    setTimeout(() => {
      if (originalClipboard) clipboard.writeText(originalClipboard);
    }, 100);

    if (!newText || newText === marker) {
      throw new Error('Standard clipboard method got no new text');
    }

    return newText;
  }

  // 🔥 PERFORMANCE-OPTIMIZED ENHANCED CLIPBOARD
  private async tryClipboardEnhanced(): Promise<string> {
    const originalClipboard = clipboard.readText();
    const marker = `__ENHANCED_${Date.now()}__`;
    
    // 🔥 Performance optimization: Reduced delays
    clipboard.clear();
    await new Promise(resolve => setTimeout(resolve, 75)); // Reduced from 100ms
    
    clipboard.writeText(marker);
    await new Promise(resolve => setTimeout(resolve, 75)); // Reduced from 100ms
    
    // 🔥 Performance optimization: Only 1 retry instead of 2
    const copyResult = await this.performCopy();
    if (!copyResult.success) {
      // One retry only
      await new Promise(resolve => setTimeout(resolve, 150));
      const retryResult = await this.performCopy();
      if (!retryResult.success) {
        throw new Error('Enhanced clipboard copy failed after retry');
      }
    }
    
    const newText = await this.waitForClipboardChange(marker, 2000); // Reduced timeout
    
    // Restore clipboard
    setTimeout(() => {
      if (originalClipboard) {
        clipboard.writeText(originalClipboard);
      }
    }, 50); // Faster restore
    
    if (!newText || newText === marker) {
      throw new Error('Enhanced clipboard method got no new text');
    }
    
    return newText;
  }

  // 🔥 AGGRESSIVE CLIPBOARD
  private async tryClipboardAggressive(): Promise<string> {
    const originalClipboard = clipboard.readText();
    const marker = `__AGGRESSIVE_${Date.now()}__`;
    
    // Focus recovery attempt
    if (process.platform === 'darwin') {
      try {
        await execAsync(`osascript -e 'tell application "System Events" to set frontmost of first application process whose frontmost is true to true'`);
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        // Continue anyway
      }
    }
    
    clipboard.clear();
    await new Promise(resolve => setTimeout(resolve, 150));
    
    clipboard.writeText(marker);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Multiple copy attempts with different methods
    const copyMethods = [
      () => this.performCopy(),
      () => this.performCopyAlternative(),
    ];
    
    let copySuccess = false;
    for (const copyMethod of copyMethods) {
      for (let i = 0; i < 2; i++) {
        try {
          const result = await copyMethod();
          if (result.success) {
            copySuccess = true;
            break;
          }
        } catch (error) {
          // Try next method
        }
        if (i < 1) await new Promise(resolve => setTimeout(resolve, 300));
      }
      if (copySuccess) break;
    }
    
    if (!copySuccess) {
      throw new Error('Aggressive clipboard copy failed all methods');
    }
    
    const newText = await this.waitForClipboardChange(marker, 4000);
    
    // Restore clipboard
    setTimeout(() => {
      if (originalClipboard) {
        clipboard.writeText(originalClipboard);
      }
    }, 100);
    
    if (!newText || newText === marker) {
      throw new Error('Aggressive clipboard method got no new text');
    }
    
    return newText;
  }

  // 🔥 ADAPTIVE UTILITIES
  private async performCopy(): Promise<{ success: boolean; error?: string }> {
    try {
      let copyCommand = '';
      
      if (process.platform === 'darwin') {
        // Prefer native helper if available
        if (this.nativeTextSelection && this.nativeTextSelection.sendCopyShortcut) {
          const ok = await this.nativeTextSelection.sendCopyShortcut();
          if (ok) return { success: true };
        }
        copyCommand = `osascript -e 'tell application "System Events" to keystroke "c" using command down'`;
      } else if (process.platform === 'win32') {
        copyCommand = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"`;
      } else {
        copyCommand = 'xdotool key ctrl+c';
      }
      
      await execAsync(copyCommand);
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async performCopyAlternative(): Promise<{ success: boolean; error?: string }> {
    try {
      if (process.platform === 'darwin') {
        // Alternative key code approach
        await execAsync(`osascript -e 'tell application "System Events" to key code 8 using command down'`);
        return { success: true };
      }
      
      return { success: false, error: 'Alternative copy not available on this platform' };
      
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async waitForClipboardChange(expectedMarker: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = 50;

      const checkClipboard = () => {
        const currentText = clipboard.readText();

        // Only accept text that:
        // 1. Is different from our sentinel marker
        // 2. Does not contain another sentinel (clipboard monitor racing us)
        // 3. Is not empty
        const isOurChange =
          currentText &&
          currentText !== expectedMarker &&
          !currentText.includes('__STANDARD_') &&
          !currentText.includes('__ENHANCED_') &&
          !currentText.includes('__AGGRESSIVE_') &&
          currentText.trim().length > 0;

        if (isOurChange) {
          resolve(currentText);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          resolve('');
          return;
        }

        setTimeout(checkClipboard, checkInterval);
      };

      setTimeout(checkClipboard, 100);
    });
  }

  // 🔥 ADAPTIVE LEARNING
  private recordAttempt(attempt: CaptureAttempt) {
    this.captureHistory.push(attempt);
    
    // Keep history limited
    if (this.captureHistory.length > this.MAX_HISTORY) {
      this.captureHistory.shift();
    }
    
    // Update method statistics
    const method = this.methods.get(attempt.method);
    if (method) {
      if (attempt.success) {
        method.successRate = Math.min(1, method.successRate + this.SUCCESS_BOOST);
        method.lastSuccess = attempt.timestamp;
        method.failures = Math.max(0, method.failures - 1);
      } else {
        method.successRate = Math.max(0, method.successRate - this.FAILURE_PENALTY);
        method.failures++;
      }
      
      // Update average response time
      method.avgResponseTime = (method.avgResponseTime + attempt.responseTime) / 2;
    }
  }

  private calculateAdaptiveTimeout(): number {
    const recentFailures = this.getRecentFailureRate();
    const timeoutMultiplier = 1 + (recentFailures * 2); // More failures = longer timeout
    return Math.min(10000, this.ADAPTIVE_TIMEOUT_BASE * timeoutMultiplier);
  }

  private calculateMethodDelay(method: string, timeSinceLastCapture: number): number {
    const methodInfo = this.methods.get(method);
    if (!methodInfo) return 0;
    
    // 🔥 Performance optimization: Reduced delays
    let delay = methodInfo.failures * 50; // Reduced from 100ms
    
    // Rapid re-attempts get minimal delay
    if (timeSinceLastCapture < 1000) {
      delay += 100; // Reduced from 200ms
    }
    
    // Native module gets delay for rapid re-attempts
    if (method === 'native' && this.captureAttemptCount > 1 && timeSinceLastCapture < 2000) {
      delay += 200; // Reduced from 500ms
    }
    
    return Math.min(500, delay); // Reduced max from 1000ms
  }

  private getRecentFailureRate(): number {
    const recentAttempts = this.captureHistory.slice(-10);
    if (recentAttempts.length === 0) return 0;
    
    const failures = recentAttempts.filter(a => !a.success).length;
    return failures / recentAttempts.length;
  }

  // 🔥 EXISTING METHODS
  async getActiveWindowInfo(): Promise<any> {
    try {
      if (process.platform === 'darwin') {
        const script = `
          tell application "System Events"
            set frontApp to name of first application process whose frontmost is true
            set frontWindow to ""
            try
              set frontWindow to name of front window of first application process whose frontmost is true
            end try
            return frontApp & "|" & frontWindow
          end tell
        `;
        
        const { stdout } = await execAsync(`osascript -e '${script}'`);
        const [app, title] = stdout.trim().split('|');
        return { app: app || '', title: title || '' };
        
      } else if (process.platform === 'win32') {
        return null;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting active window info:', error);
      return null;
    }
  }

  async monitorClipboard(): Promise<void> {
    this.log('Clipboard monitoring started');
  }

  async cleanup() {
    this.log('TextCaptureService cleanup');
  }

  private log(...args: any[]) {
    if (this.debugMode) {
      console.log('[TextCapture]', ...args);
    }
  }

  // 🔥 Get performance statistics
  getPerformanceStats() {
    const stats = Array.from(this.methods.entries()).map(([key, method]) => ({
      method: key,
      name: method.name,
      successRate: method.successRate,
      avgResponseTime: method.avgResponseTime,
      failures: method.failures,
      timeSinceLastSuccess: Date.now() - method.lastSuccess
    }));
    
    return {
      methods: stats,
      totalAttempts: this.captureAttemptCount,
      recentFailureRate: this.getRecentFailureRate(),
      captureHistory: this.captureHistory.slice(-10)
    };
  }

  // 🔥 Reset learning (useful for testing)
  resetLearning() {
    this.initializeMethods();
    this.captureHistory = [];
    this.captureAttemptCount = 0;
    this.log('🔄 Learning data reset');
  }
}