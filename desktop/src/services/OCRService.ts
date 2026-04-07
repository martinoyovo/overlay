import * as path from 'path';
import * as fs from 'fs';
import { PythonShell } from 'python-shell';
import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  engine: string;
  processingTime: number;
  regions?: OCRRegion[];
  language: string;
}

export interface OCRRegion {
  text: string;
  confidence: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OCRSettings {
  engine: 'tesseract' | 'paddleocr';
  language: string;
  confidence: number;
  enableLayoutAnalysis: boolean;
}

export class OCRService {
  private settings: OCRSettings;
  private tesseractWorker: Tesseract.Worker | null = null;
  private paddleOCRPath: string | null = null;
  private isInitialized = false;

  constructor() {
    this.settings = {
      engine: 'tesseract',
      language: 'eng',
      confidence: 0.7,
      enableLayoutAnalysis: true
    };
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Tesseract
      await this.initializeTesseract();
      
      // Initialize PaddleOCR
      await this.initializePaddleOCR();
      
      this.isInitialized = true;
      console.log('OCR Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OCR Service:', error);
      throw error;
    }
  }

  private async initializeTesseract(): Promise<void> {
    try {
      this.tesseractWorker = await Tesseract.createWorker({
        logger: m => console.log('Tesseract:', m)
      });
      
      await this.tesseractWorker.loadLanguage(this.settings.language);
      await this.tesseractWorker.initialize(this.settings.language);
      
      // Set parameters for better accuracy
      await this.tesseractWorker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,!?;:()[]{}"\'-_/\\@#$%^&*+=<>|~`',
        preserve_interword_spaces: '1',
      });
      
      console.log('Tesseract initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tesseract:', error);
      throw error;
    }
  }

  private async initializePaddleOCR(): Promise<void> {
    try {
      // Check if PaddleOCR Python script exists
      const scriptPath = path.join(__dirname, '../scripts/paddleocr_wrapper.py');
      if (fs.existsSync(scriptPath)) {
        this.paddleOCRPath = scriptPath;
        console.log('PaddleOCR script found:', scriptPath);
      } else {
        console.warn('PaddleOCR script not found, PaddleOCR will be disabled');
      }
    } catch (error) {
      console.error('Failed to initialize PaddleOCR:', error);
    }
  }

  async processImage(imagePath: string, options?: Partial<OCRSettings>): Promise<OCRResult> {
    if (!this.isInitialized) {
      throw new Error('OCR Service not initialized');
    }

    const startTime = Date.now();
    const settings = { ...this.settings, ...options };
    
    try {
      let result: OCRResult;

      // Choose engine based on settings and image characteristics
      const engine = this.selectEngine(settings, imagePath);
      
      if (engine === 'tesseract') {
        result = await this.processWithTesseract(imagePath, settings);
      } else {
        result = await this.processWithPaddleOCR(imagePath, settings);
      }

      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      console.error('OCR processing failed:', error);
      
      // Fallback to Tesseract if PaddleOCR fails
      if (settings.engine === 'paddleocr') {
        console.log('Falling back to Tesseract...');
        return await this.processWithTesseract(imagePath, settings);
      }
      
      throw error;
    }
  }

  private selectEngine(settings: OCRSettings, imagePath: string): 'tesseract' | 'paddleocr' {
    // If user explicitly chose an engine, use it
    if (settings.engine === 'paddleocr' && this.paddleOCRPath) {
      return 'paddleocr';
    }
    
    // Default to Tesseract for reliability
    return 'tesseract';
  }

  private async processWithTesseract(imagePath: string, settings: OCRSettings): Promise<OCRResult> {
    if (!this.tesseractWorker) {
      throw new Error('Tesseract not initialized');
    }

    const result = await this.tesseractWorker.recognize(imagePath);
    
    return {
      text: result.data.text,
      confidence: result.data.confidence / 100, // Convert to 0-1 scale
      engine: 'tesseract',
      processingTime: 0, // Will be set by caller
      language: settings.language,
      regions: result.data.words?.map(word => ({
        text: word.text,
        confidence: word.confidence / 100,
        bounds: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0
        }
      }))
    };
  }

  private async processWithPaddleOCR(imagePath: string, settings: OCRSettings): Promise<OCRResult> {
    if (!this.paddleOCRPath) {
      throw new Error('PaddleOCR not available');
    }

    return new Promise((resolve, reject) => {
      const options = {
        mode: 'text' as const,
        pythonPath: 'python3',
        pythonOptions: ['-u'],
        scriptPath: path.dirname(this.paddleOCRPath!),
        args: [
          '--image', imagePath,
          '--language', settings.language,
          '--confidence', settings.confidence.toString(),
          '--layout', settings.enableLayoutAnalysis.toString()
        ]
      };

      PythonShell.run(path.basename(this.paddleOCRPath!), options).then((results) => {
        try {
          const result = JSON.parse(results[0]);
          resolve({
            text: result.text,
            confidence: result.confidence,
            engine: 'paddleocr',
            processingTime: 0, // Will be set by caller
            language: settings.language,
            regions: result.regions
          });
        } catch (parseError) {
          reject(new Error('Failed to parse PaddleOCR result'));
        }
      }).catch((err) => {
        reject(err);
      });
    });
  }

  async updateSettings(newSettings: Partial<OCRSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    // Reinitialize if language changed
    if (newSettings.language && this.tesseractWorker) {
      await this.tesseractWorker.loadLanguage(newSettings.language);
      await this.tesseractWorker.initialize(newSettings.language);
    }
  }

  async getSupportedLanguages(): Promise<string[]> {
    if (!this.tesseractWorker) {
      return ['eng'];
    }

    try {
      // Simplified - return common languages
      return ['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'jpn', 'kor', 'chi_sim'];
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      return ['eng'];
    }
  }

  async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }

  // Utility method for batch processing
  async processMultipleImages(imagePaths: string[], options?: Partial<OCRSettings>): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    
    for (const imagePath of imagePaths) {
      try {
        const result = await this.processImage(imagePath, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process ${imagePath}:`, error);
        results.push({
          text: '',
          confidence: 0,
          engine: 'unknown',
          processingTime: 0,
          language: options?.language || 'eng'
        });
      }
    }
    
    return results;
  }
}
