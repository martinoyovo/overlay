#!/usr/bin/env python3
"""
PaddleOCR Python wrapper for Electron desktop app
This script provides OCR functionality using PaddleOCR
"""

import argparse
import json
import sys
import os
from typing import List, Dict, Any
import cv2
import numpy as np

try:
    from paddleocr import PaddleOCR
except ImportError:
    print("PaddleOCR not installed. Install with: pip install paddleocr")
    sys.exit(1)

class PaddleOCRWrapper:
    def __init__(self, language: str = 'en', use_angle_cls: bool = True, use_gpu: bool = False):
        """
        Initialize PaddleOCR wrapper
        
        Args:
            language: Language code ('en', 'ch', 'ja', 'ko', etc.)
            use_angle_cls: Whether to use angle classification
            use_gpu: Whether to use GPU acceleration
        """
        self.language = language
        self.ocr = PaddleOCR(
            use_angle_cls=use_angle_cls,
            lang=language,
            use_gpu=use_gpu,
            show_log=False
        )
    
    def process_image(self, image_path: str, confidence_threshold: float = 0.7) -> Dict[str, Any]:
        """
        Process image with PaddleOCR
        
        Args:
            image_path: Path to the image file
            confidence_threshold: Minimum confidence threshold
            
        Returns:
            Dictionary containing OCR results
        """
        try:
            # Read image
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            # Perform OCR
            result = self.ocr.ocr(image_path, cls=True)
            
            if not result or not result[0]:
                return {
                    "text": "",
                    "confidence": 0.0,
                    "regions": [],
                    "engine": "paddleocr",
                    "language": self.language
                }
            
            # Process results
            text_parts = []
            regions = []
            total_confidence = 0.0
            valid_results = 0
            
            for line in result[0]:
                if line is None:
                    continue
                    
                # PaddleOCR returns: [[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], (text, confidence)]
                bbox = line[0]  # Bounding box coordinates
                text_info = line[1]  # (text, confidence)
                
                if text_info is None or len(text_info) < 2:
                    continue
                    
                text, confidence = text_info
                
                if confidence >= confidence_threshold:
                    text_parts.append(text)
                    total_confidence += confidence
                    valid_results += 1
                    
                    # Calculate bounding box
                    x_coords = [point[0] for point in bbox]
                    y_coords = [point[1] for point in bbox]
                    
                    regions.append({
                        "text": text,
                        "confidence": float(confidence),
                        "bounds": {
                            "x": int(min(x_coords)),
                            "y": int(min(y_coords)),
                            "width": int(max(x_coords) - min(x_coords)),
                            "height": int(max(y_coords) - min(y_coords))
                        }
                    })
            
            # Calculate average confidence
            avg_confidence = total_confidence / valid_results if valid_results > 0 else 0.0
            
            # Join text parts
            full_text = " ".join(text_parts)
            
            return {
                "text": full_text,
                "confidence": float(avg_confidence),
                "regions": regions,
                "engine": "paddleocr",
                "language": self.language,
                "regions_count": len(regions)
            }
            
        except Exception as e:
            return {
                "text": "",
                "confidence": 0.0,
                "regions": [],
                "engine": "paddleocr",
                "language": self.language,
                "error": str(e)
            }
    
    def process_image_with_layout(self, image_path: str, confidence_threshold: float = 0.7) -> Dict[str, Any]:
        """
        Process image with layout analysis
        
        Args:
            image_path: Path to the image file
            confidence_threshold: Minimum confidence threshold
            
        Returns:
            Dictionary containing OCR results with layout information
        """
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not read image: {image_path}")
            
            # Get image dimensions
            height, width = image.shape[:2]
            
            # Perform OCR with layout analysis
            result = self.ocr.ocr(image_path, cls=True)
            
            if not result or not result[0]:
                return {
                    "text": "",
                    "confidence": 0.0,
                    "regions": [],
                    "layout": {},
                    "engine": "paddleocr",
                    "language": self.language
                }
            
            # Process results with layout analysis
            text_parts = []
            regions = []
            layout_regions = {
                "top": [],
                "middle": [],
                "bottom": []
            }
            
            total_confidence = 0.0
            valid_results = 0
            
            for line in result[0]:
                if line is None:
                    continue
                    
                bbox = line[0]
                text_info = line[1]
                
                if text_info is None or len(text_info) < 2:
                    continue
                    
                text, confidence = text_info
                
                if confidence >= confidence_threshold:
                    text_parts.append(text)
                    total_confidence += confidence
                    valid_results += 1
                    
                    # Calculate bounding box
                    x_coords = [point[0] for point in bbox]
                    y_coords = [point[1] for point in bbox]
                    
                    region = {
                        "text": text,
                        "confidence": float(confidence),
                        "bounds": {
                            "x": int(min(x_coords)),
                            "y": int(min(y_coords)),
                            "width": int(max(x_coords) - min(x_coords)),
                            "height": int(max(y_coords) - min(y_coords))
                        }
                    }
                    
                    regions.append(region)
                    
                    # Categorize by vertical position
                    center_y = (min(y_coords) + max(y_coords)) / 2
                    if center_y < height / 3:
                        layout_regions["top"].append(region)
                    elif center_y < 2 * height / 3:
                        layout_regions["middle"].append(region)
                    else:
                        layout_regions["bottom"].append(region)
            
            # Calculate average confidence
            avg_confidence = total_confidence / valid_results if valid_results > 0 else 0.0
            
            # Join text parts
            full_text = " ".join(text_parts)
            
            return {
                "text": full_text,
                "confidence": float(avg_confidence),
                "regions": regions,
                "layout": layout_regions,
                "engine": "paddleocr",
                "language": self.language,
                "regions_count": len(regions)
            }
            
        except Exception as e:
            return {
                "text": "",
                "confidence": 0.0,
                "regions": [],
                "layout": {},
                "engine": "paddleocr",
                "language": self.language,
                "error": str(e)
            }

def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(description='PaddleOCR wrapper for desktop app')
    parser.add_argument('--image', required=True, help='Path to image file')
    parser.add_argument('--language', default='en', help='Language code (default: en)')
    parser.add_argument('--confidence', type=float, default=0.7, help='Confidence threshold (default: 0.7)')
    parser.add_argument('--layout', action='store_true', help='Enable layout analysis')
    parser.add_argument('--use-gpu', action='store_true', help='Use GPU acceleration')
    
    args = parser.parse_args()
    
    try:
        # Initialize OCR
        ocr = PaddleOCRWrapper(
            language=args.language,
            use_gpu=args.use_gpu
        )
        
        # Process image
        if args.layout:
            result = ocr.process_image_with_layout(args.image, args.confidence)
        else:
            result = ocr.process_image(args.image, args.confidence)
        
        # Output JSON result
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        error_result = {
            "text": "",
            "confidence": 0.0,
            "regions": [],
            "engine": "paddleocr",
            "language": args.language,
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))

if __name__ == "__main__":
    main()
