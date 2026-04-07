# Overlay

A macOS desktop app that lets you select any text from any application and get AI assistance on it instantly: without switching windows, copy-pasting, or breaking your flow.

Hit **⌘⇧A**, and a floating AI panel appears with your selected text already loaded.

---

## What it does

- **Capture text from anywhere**: Chrome, Terminal, PDFs, Xcode, Slack, anything
- **Floating AI popup**: appears where you're working, doesn't take over your screen
- **Quick actions**: Explain, Summarize, Translate, Improve with one click
- **Screen region capture**: draw a rectangle to capture any part of your screen and ask the AI about it
- **OCR**: extract text from screenshots, images, or anything that can't be selected
- **Conversation context**: the AI remembers the thread within a session

---

## Requirements

- **macOS** (primary platform: text capture uses macOS Accessibility APIs)
- **Node.js** v18 or later
- **Python 3.8+** (for PaddleOCR; Tesseract works without it)
- **Xcode Command Line Tools** (to build the native text-selection module)

```bash
xcode-select --install
```

---

## Project structure

```
ai_browser_assistant/
├── backend/          # Express API server (port 3001)
├── desktop/          # Electron main process + services
│   ├── src/
│   │   ├── main.ts                        # App entry, shortcuts, IPC, window management
│   │   ├── preload.ts                     # Context bridge: exposes safe IPC to renderer
│   │   └── services/
│   │       ├── TextCaptureService.ts      # Adaptive multi-method text capture
│   │       ├── ScreenCaptureService.ts    # Screenshot + region capture
│   │       └── OCRService.ts              # Tesseract + PaddleOCR
│   └── native-modules/
│       └── text-selection/               # C++ Node.js addon (Accessibility API)
├── frontend/         # React UI (popup + settings)
   └── src/
       ├── components/
       │   ├── AIPopup/                  # Floating AI panel
       │   └── SettingsComponent/        # Settings page
       └── hooks/
           └── useChat.ts               # Backend communication
```

---

## Setup

### 1. Install dependencies

```bash
# Root
npm install

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Desktop
cd ../desktop && npm install
```

### 2. Build the native text-selection module

This compiles a C++ addon that talks directly to the macOS Accessibility API for the most reliable text capture.

```bash
cd desktop/native-modules/text-selection
npm install
npm run build   # runs node-gyp rebuild
```

### 3. Grant Accessibility permissions

The app will prompt you on first launch. To grant manually:

**System Settings → Privacy & Security → Accessibility** → add and enable the app.

Without this, text capture falls back to clipboard-based methods (still works, slightly slower).

---

## Running in development

You need two terminals: one for the backend, one for the desktop app.

**Terminal 1: Backend**
```bash
cd backend
npm run dev
# Starts Express on http://localhost:3001
```

**Terminal 2: Desktop**
```bash
cd desktop
npm run dev
# Starts React dev server on port 3005 + Electron
```

The Electron app will retry connecting to the React dev server automatically until it's ready.

---

## Running in production

```bash
# Build frontend
cd frontend && npm run build

# Build and launch desktop
cd ../desktop
npm run build
npm start
```

### Package as a distributable (.dmg)

```bash
cd desktop
npm run dist
# Output: desktop/dist-electron/
```

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘⇧A` | Capture selected text → AI popup |
| `⌘⇧R` | Draw screen region → screenshot → AI popup |
| `⌘⇧O` | Full screen OCR → main window |
| `⌘⇧T` | Capture selected text → main window |
| `⌘⇧M` | Show main window |
| `⌘\` | Toggle main window |

All shortcuts are listed in the app's Settings page.

---

## How text capture works

Capturing selected text from another app without the user doing anything is the core technical challenge. The app uses six methods tried in order, with an adaptive engine that learns which methods work best over time:

| Priority | Method | How |
|---|---|---|
| 1 | **Native module** | C++ addon via macOS `AXSelectedText` Accessibility API |
| 2 | **AppleScript focused** | `osascript` queries `AXSelectedText` of the frontmost UI element |
| 3 | **Standard clipboard** | Writes a sentinel, fires `⌘C`, polls clipboard for change |
| 4 | **AppleScript deep** | Walks the full UI tree of the frontmost app looking for selected text |
| 5 | **Enhanced clipboard** | Like standard but clears clipboard first and retries on failure |
| 6 | **Aggressive clipboard** | Restores app focus first, tries multiple copy key codes with retries |

The adaptive engine tracks success rate, average response time, and recent failure count per method. It re-orders them on every capture attempt: so the fastest method that works in your setup rises to the top automatically.

---

## How OCR works

**`⌘⇧O`**: captures the full screen and runs it through **Tesseract.js** (WebAssembly, no binary dependency).

**`⌘⇧R`**: lets you drag a rectangle on screen. That region is captured as a PNG and attached directly to the AI popup, so you can ask about an image, diagram, or code snippet that can't be selected as text.

For documents with complex layouts, **PaddleOCR** is also supported via a Python subprocess. Configure the engine in `backend/src/services/` settings.

---

## Swapping in a real AI

The backend uses an adapter pattern. Currently it runs `MockAIAdapter` which returns realistic-feeling placeholder responses with a 500–1500ms simulated delay.

To connect a real model, create a class in `backend/src/adapters/` that extends `BaseAIAdapter` and implements:

```typescript
async generate(prompt: string, context?: any): Promise<AIResponse>
```

Then swap it into `backend/src/server.ts`:

```typescript
const aiAdapter = new YourAdapter(); // replace MockAIAdapter
```

The `context` object passed to `generate` includes the selected text, page URL, page title, and full conversation history for the session.

---

## Settings

Open the main window (`⌘⇧M`) to access settings:

- **Allow Multiple AI Popups**: by default only one popup exists at a time; enable this to allow stacking
- **Keyboard Shortcuts**: reference list of all registered shortcuts

---

## Tech stack

| | |
|---|---|
| Desktop shell | Electron 28 |
| Frontend | React 18, TypeScript, Tailwind CSS |
| Icons | Phosphor Icons |
| Backend | Express 5, TypeScript, ts-node |
| Text capture | macOS Accessibility API (C++ via Node-API), AppleScript, Electron clipboard |
| Screen capture | `screenshot-desktop` |
| OCR | Tesseract.js (WASM), PaddleOCR (Python) |
| Native build | node-gyp, Xcode (ApplicationServices + Cocoa + Carbon frameworks) |
| Session state | In-memory Map, UUID-keyed |
| IPC | Electron `ipcMain` / `ipcRenderer` with `contextBridge` |
| Packaging | electron-builder |

---

## Troubleshooting

**Popup doesn't appear / text isn't captured**
Grant Accessibility permissions in System Settings → Privacy & Security → Accessibility.

**Native module fails to build**
Make sure Xcode Command Line Tools are installed: `xcode-select --install`. Then rebuild: `cd desktop/native-modules/text-selection && npm run build`.

**Backend not connecting**
Make sure the backend is running on port 3001 before launching the desktop app. The frontend calls `http://localhost:3001/chat`.

**App crashes on launch in dev**
The Electron process retries connecting to the React dev server on port 3005. Wait a few seconds for the React build to finish: Electron will load automatically once it's ready.
