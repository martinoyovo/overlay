#include <napi.h>
#include <string>
#include <iostream>

#ifdef __APPLE__
#include <ApplicationServices/ApplicationServices.h>
#include <Carbon/Carbon.h>
#include <CoreFoundation/CoreFoundation.h>
#endif

namespace TextSelection {

#ifdef __APPLE__
static bool GetBooleanAttribute(AXUIElementRef element, CFStringRef attribute, bool& outValue) {
    CFTypeRef attrValue = nullptr;
    AXError err = AXUIElementCopyAttributeValue(element, attribute, &attrValue);
    if (err != kAXErrorSuccess || attrValue == nullptr) {
        return false;
    }
    Boolean b = false;
    if (CFGetTypeID(attrValue) == CFBooleanGetTypeID()) {
        b = CFBooleanGetValue((CFBooleanRef)attrValue);
    }
    CFRelease(attrValue);
    outValue = b;
    return true;
}

static bool GetStringAttribute(AXUIElementRef element, CFStringRef attribute, std::string& out) {
    CFStringRef cfStr = nullptr;
    AXError err = AXUIElementCopyAttributeValue(element, attribute, (CFTypeRef*)&cfStr);
    if (err != kAXErrorSuccess || cfStr == nullptr) return false;
    CFIndex length = CFStringGetLength(cfStr);
    if (length > 0) {
        CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
        char* buffer = new char[maxSize];
        if (CFStringGetCString(cfStr, buffer, maxSize, kCFStringEncodingUTF8)) {
            out.assign(buffer);
        }
        delete[] buffer;
    }
    CFRelease(cfStr);
    return !out.empty();
}

static AXUIElementRef GetParent(AXUIElementRef element) {
    CFTypeRef parent = nullptr;
    AXError err = AXUIElementCopyAttributeValue(element, kAXParentAttribute, &parent);
    if (err != kAXErrorSuccess || parent == nullptr) return nullptr;
    return (AXUIElementRef)parent; // caller must CFRelease
}

static bool RoleEquals(AXUIElementRef element, CFStringRef targetRole) {
    CFStringRef role = nullptr;
    AXError err = AXUIElementCopyAttributeValue(element, kAXRoleAttribute, (CFTypeRef*)&role);
    if (err != kAXErrorSuccess || role == nullptr) return false;
    bool equal = CFStringCompare(role, targetRole, 0) == kCFCompareEqualTo;
    CFRelease(role);
    return equal;
}

static bool ExtractSelectedTextFromRangeUsingParamAttr(AXUIElementRef element, std::string& out) {
    // Try to obtain selected range
    CFTypeRef rangeValueRef = nullptr;
    AXError err = AXUIElementCopyAttributeValue(element, kAXSelectedTextRangeAttribute, &rangeValueRef);
    if (err != kAXErrorSuccess || rangeValueRef == nullptr) return false;

    // Some SDKs use kAXValueTypeCFRange; create AXValue if needed
    CFRange range;
    bool rangeOk = AXValueGetValue((AXValueRef)rangeValueRef, (AXValueType)kAXValueCFRangeType, &range);
    if (!rangeOk) {
        CFRelease(rangeValueRef);
        return false;
    }

    // Use parameterized attribute to get attributed string for the range
    CFStringRef paramAttr = CFSTR("AXAttributedStringForRange");
    CFTypeRef attributedStrRef = nullptr;
    err = AXUIElementCopyParameterizedAttributeValue(element, paramAttr, (AXValueRef)rangeValueRef, &attributedStrRef);
    CFRelease(rangeValueRef);
    if (err != kAXErrorSuccess || attributedStrRef == nullptr) return false;

    // attributedStrRef is CFAttributedStringRef
    if (CFGetTypeID(attributedStrRef) == CFAttributedStringGetTypeID()) {
        CFStringRef cfStr = CFAttributedStringGetString((CFAttributedStringRef)attributedStrRef);
        if (cfStr) {
            CFIndex length = CFStringGetLength(cfStr);
            if (length > 0) {
                CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
                char* buffer = new char[maxSize];
                if (CFStringGetCString(cfStr, buffer, maxSize, kCFStringEncodingUTF8)) {
                    out.assign(buffer);
                }
                delete[] buffer;
            }
        }
    }
    CFRelease(attributedStrRef);
    return !out.empty();
}

static bool TryExtractFromElement(AXUIElementRef element, std::string& out) {

    // 1) Direct selected text
    if (GetStringAttribute(element, kAXSelectedTextAttribute, out)) {
        return true;
    }

    // 2) Parameterized attribute using selection range
    if (ExtractSelectedTextFromRangeUsingParamAttr(element, out)) {
        return true;
    }

    // 3) Fallback using value + selected range substring
    CFStringRef value = nullptr;
    AXError error = AXUIElementCopyAttributeValue(element, kAXValueAttribute, (CFTypeRef*)&value);
    if (error == kAXErrorSuccess && value) {
        CFTypeRef selectedTextRange = nullptr;
        error = AXUIElementCopyAttributeValue(element, kAXSelectedTextRangeAttribute, &selectedTextRange);
        if (error == kAXErrorSuccess && selectedTextRange) {
            CFRange range;
            if (AXValueGetValue((AXValueRef)selectedTextRange, (AXValueType)kAXValueCFRangeType, &range)) {
                if (range.length > 0) {
                    CFStringRef substring = CFStringCreateWithSubstring(kCFAllocatorDefault, value, range);
                    if (substring) {
                        CFIndex length = CFStringGetLength(substring);
                        if (length > 0) {
                            CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
                            char* buffer = new char[maxSize];
                            if (CFStringGetCString(substring, buffer, maxSize, kCFStringEncodingUTF8)) {
                                out.assign(buffer);
                            }
                            delete[] buffer;
                        }
                        CFRelease(substring);
                    }
                }
            }
            CFRelease(selectedTextRange);
        }
        CFRelease(value);
    }
    return !out.empty();
}

std::string GetSelectedTextMacOS() {
    try {
        // Create system-wide accessibility object
        AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
        if (!systemWideElement) {
            std::cerr << "Failed to create system-wide element" << std::endl;
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
            std::cerr << "Failed to get focused element: " << error << std::endl;
            return "";
        }
        
        std::string result = "";

        // Try focused element
        if (!TryExtractFromElement(focusedElement, result)) {
            // Walk up ancestors looking for web/text containers
            const CFStringRef targets[] = { CFSTR("AXWebArea"), CFSTR("AXTextArea"), CFSTR("AXTextField") };
            AXUIElementRef current = focusedElement;
            for (int depth = 0; depth < 10 && result.empty(); ++depth) {
                AXUIElementRef parent = GetParent(current);
                if (!parent) break;
                for (auto target : targets) {
                    if (RoleEquals(parent, target)) {
                        TryExtractFromElement(parent, result);
                        break;
                    }
                }
                if (current != focusedElement) CFRelease(current);
                current = parent;
            }
            if (current && current != focusedElement) CFRelease(current);
        }
        
        CFRelease(focusedElement);
        
        if (result.empty()) {
            std::cerr << "No selected text found" << std::endl;
        } else {
            std::cout << "Found selected text: " << result.substr(0, 50) << "..." << std::endl;
        }
        
        return result;
        
    } catch (const std::exception& e) {
        std::cerr << "Exception in GetSelectedTextMacOS: " << e.what() << std::endl;
        return "";
    } catch (...) {
        std::cerr << "Unknown exception in GetSelectedTextMacOS" << std::endl;
        return "";
    }
}

bool CheckAccessibilityPermissions() {
    try {
        // Check if we have accessibility permissions without prompting
        const void* keys[] = { kAXTrustedCheckOptionPrompt };
        const void* values[] = { kCFBooleanFalse };
        
        CFDictionaryRef options = CFDictionaryCreate(
            kCFAllocatorDefault,
            keys,
            values,
            1,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks
        );
        
        Boolean isTrusted = AXIsProcessTrustedWithOptions(options);
        CFRelease(options);
        
        return static_cast<bool>(isTrusted);
    } catch (...) {
        return false;
    }
}

bool SendCopyShortcutMac() {
    try {
        CGEventRef keyDown = CGEventCreateKeyboardEvent(NULL, (CGKeyCode)kVK_ANSI_C, true);
        CGEventRef keyUp = CGEventCreateKeyboardEvent(NULL, (CGKeyCode)kVK_ANSI_C, false);
        if (!keyDown || !keyUp) {
            if (keyDown) CFRelease(keyDown);
            if (keyUp) CFRelease(keyUp);
            return false;
        }
        CGEventSetFlags(keyDown, kCGEventFlagMaskCommand);
        CGEventSetFlags(keyUp, kCGEventFlagMaskCommand);
        CGEventPost(kCGHIDEventTap, keyDown);
        CGEventPost(kCGHIDEventTap, keyUp);
        CFRelease(keyDown);
        CFRelease(keyUp);
        return true;
    } catch (...) {
        return false;
    }
}
#endif

// NAPI wrapper function
Napi::String GetSelectedText(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    std::string selectedText = "";
    
    try {
#ifdef __APPLE__
        selectedText = GetSelectedTextMacOS();
#else
        // For non-macOS platforms, return a message
        selectedText = "";
#endif
    } catch (const std::exception& e) {
        // Log error but don't throw - return empty string instead
        std::cerr << "Error in GetSelectedText: " << e.what() << std::endl;
        selectedText = "";
    } catch (...) {
        std::cerr << "Unknown error in GetSelectedText" << std::endl;
        selectedText = "";
    }
    
    return Napi::String::New(env, selectedText);
}

// Check accessibility permissions
Napi::Boolean CheckPermissions(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    bool hasPermissions = false;
    
    try {
#ifdef __APPLE__
        hasPermissions = CheckAccessibilityPermissions();
#else
        hasPermissions = true; // Other platforms don't need special permissions
#endif
    } catch (...) {
        hasPermissions = false;
    }
    
    return Napi::Boolean::New(env, hasPermissions);
}

// Send Cmd+C on macOS (no-op on others)
Napi::Boolean SendCopyShortcut(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    bool ok = false;
    try {
#ifdef __APPLE__
        ok = SendCopyShortcutMac();
#else
        ok = false;
#endif
    } catch (...) {
        ok = false;
    }
    return Napi::Boolean::New(env, ok);
}



// NAPI module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    try {
        exports.Set(Napi::String::New(env, "getSelectedText"), Napi::Function::New(env, GetSelectedText));
        exports.Set(Napi::String::New(env, "checkPermissions"), Napi::Function::New(env, CheckPermissions));
        exports.Set(Napi::String::New(env, "sendCopyShortcut"), Napi::Function::New(env, SendCopyShortcut));
    } catch (const std::exception& e) {
        std::cerr << "Error in module initialization: " << e.what() << std::endl;
    }
    
    return exports;
}

NODE_API_MODULE(text_selection, Init)

} // namespace TextSelection