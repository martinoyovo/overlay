// text_selection_mac.mm - macOS-specific implementation
#ifdef __APPLE__

#include "text_selection_mac.h"
#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>

std::string GetSelectedTextMacOS() {
    @autoreleasepool {
        try {
            // Create system-wide accessibility object
            AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
            if (!systemWideElement) {
                NSLog(@"Failed to create system-wide element");
                return "";
            }
            
            // Get the focused element
            AXUIElementRef focusedElement = nullptr;
            AXError error = AXUIElementCopyAttributeValue(
                systemWideElement,
                kAXFocusedUIElementAttribute,
                (CFTypeRef*)&focusedElement
            );
            
            CFRelease(systemWideElement);
            
            if (error != kAXErrorSuccess || !focusedElement) {
                NSLog(@"Failed to get focused element: %d", error);
                return "";
            }
            
            std::string result = "";
            
            // Try to get selected text attribute
            CFStringRef selectedText = nullptr;
            error = AXUIElementCopyAttributeValue(
                focusedElement,
                kAXSelectedTextAttribute,
                (CFTypeRef*)&selectedText
            );
            
            if (error == kAXErrorSuccess && selectedText) {
                // Convert CFString to std::string
                CFIndex length = CFStringGetLength(selectedText);
                if (length > 0) {
                    CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
                    char* buffer = new char[maxSize];
                    
                    if (CFStringGetCString(selectedText, buffer, maxSize, kCFStringEncodingUTF8)) {
                        result = std::string(buffer);
                    }
                    
                    delete[] buffer;
                }
                CFRelease(selectedText);
            } else {
                // Fallback: try to get value attribute and selection range
                CFStringRef value = nullptr;
                error = AXUIElementCopyAttributeValue(
                    focusedElement,
                    kAXValueAttribute,
                    (CFTypeRef*)&value
                );
                
                if (error == kAXErrorSuccess && value) {
                    // Get selection range
                    CFTypeRef selectedTextRange = nullptr;
                    error = AXUIElementCopyAttributeValue(
                        focusedElement,
                        kAXSelectedTextRangeAttribute,
                        &selectedTextRange
                    );
                    
                    if (error == kAXErrorSuccess && selectedTextRange) {
                        CFRange range;
                        if (AXValueGetValue((AXValueRef)selectedTextRange, kAXValueTypeCFRange, &range)) {
                            if (range.length > 0) {
                                CFStringRef substring = CFStringCreateWithSubstring(
                                    kCFAllocatorDefault, value, range
                                );
                                
                                if (substring) {
                                    CFIndex length = CFStringGetLength(substring);
                                    CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
                                    char* buffer = new char[maxSize];
                                    
                                    if (CFStringGetCString(substring, buffer, maxSize, kCFStringEncodingUTF8)) {
                                        result = std::string(buffer);
                                    }
                                    
                                    delete[] buffer;
                                    CFRelease(substring);
                                }
                            }
                        }
                        CFRelease(selectedTextRange);
                    }
                    CFRelease(value);
                }
            }
            
            CFRelease(focusedElement);
            return result;
            
        } catch (const std::exception& e) {
            NSLog(@"Exception in GetSelectedTextMacOS: %s", e.what());
            return "";
        } catch (...) {
            NSLog(@"Unknown exception in GetSelectedTextMacOS");
            return "";
        }
    }
}

bool CheckAccessibilityPermissions() {
    @autoreleasepool {
        // Check if we have accessibility permissions
        NSDictionary* options = @{(__bridge id)kAXTrustedCheckOptionPrompt: @YES};
        Boolean isTrusted = AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);
        return (bool)isTrusted;
    }
}

#endif // __APPLE__