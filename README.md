# ClipForge

A desktop video editor built with Tauri + React + TypeScript.

## Features

### Phase 1 (Current)
- ✅ Drag & drop video file import
- ✅ Media library with video thumbnails and metadata
- ✅ Video preview player with play/pause controls
- ✅ Timeline interface with time ruler and playhead
- ✅ Drag clips from library to timeline
- ✅ Zoom in/out on timeline

### Phase 2 (Next)
- Trim functionality
- Export to MP4

### Phase 3 (Future)
- Screen recording
- Webcam recording
- Picture-in-picture
- Split clips
- Multiple tracks

## Development

### Prerequisites
- Node.js 18+
- Rust (latest stable)
- Tauri CLI: `npm install -g @tauri-apps/cli` (should auto-install with npm install)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
# Option 1: Use the helper script
./dev.sh

# Option 2: Manual (load Rust environment first)
source "$HOME/.cargo/env"
npm run tauri dev
```

3. Build for production:
```bash
source "$HOME/.cargo/env"
npm run tauri build
```

**Note:** First build may take 5-10 minutes as it compiles Rust dependencies. Subsequent builds will be faster.

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Zustand
- **Backend:** Tauri 2.0 (Rust)
- **Build Tool:** Vite

## Project Structure

```
clipforge/
├── src/                    # React frontend
│   ├── components/        # UI components
│   ├── store/             # Zustand state management
│   └── styles/            # CSS styles
├── src-tauri/             # Rust backend
│   └── src/               # Tauri commands and logic
└── dist/                  # Built frontend
```

## License

MIT

# clipforge
