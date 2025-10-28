# ClipForge

A desktop video editor built with Tauri + React + TypeScript.

## Overview

ClipForge is a desktop video editor that provides a streamlined workflow for importing, editing, and exporting videos. Built with modern web technologies powered by Tauri for native performance.

## Features

### ✅ Implemented (Phase 1 & 2)
- ✅ Drag & drop video file import (MP4, MOV, AVI, WebM)
- ✅ Media library displaying imported clips with metadata
- ✅ Video preview player with play/pause controls
- ✅ Timeline interface with time ruler and playhead
- ✅ Drag clips from library to timeline (Track 1 & Track 2)
- ✅ Zoom in/out on timeline (🔍− / 🔍+)
- ✅ Playback controls (Play, Pause, Stop, Rewind)
- ✅ Time display showing current position
- ✅ Multiple tracks support

### 🚧 In Progress (Phase 3)
- [ ] Trim functionality (adjust start/end points)
- [ ] Export to MP4 with FFmpeg
- [ ] Screen recording
- [ ] Webcam recording
- [ ] Picture-in-picture
- [ ] Split clips functionality

## Quick Start

### Prerequisites
- **Node.js** 18 or higher
- **Rust** (latest stable) - Install via [rustup](https://rustup.rs/)
- **Tauri CLI** (auto-installed with `npm install`)

### Development Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Run in development mode:**
```bash
# Option 1: Use the helper script
./dev.sh

# Option 2: Manual (load Rust environment first)
source "$HOME/.cargo/env"
npm run tauri dev
```

3. **Build for production:**
```bash
source "$HOME/.cargo/env"
npm run tauri build
```

**Note:** The first build takes 5-10 minutes as it compiles Rust dependencies. Subsequent builds are much faster.

## How to Use

### Import Videos
1. Drag video files (MP4, MOV, AVI, WebM) into the **Media Library** (left sidebar)
2. Clips appear with their filename and duration
3. Alternatively, click the **"+ Add Files"** button to browse for videos

### Add Clips to Timeline
- **Option 1:** Drag a clip from the Media Library onto **Track 1** or **Track 2**
- **Option 2:** Click the **T1** or **T2** button next to a clip to add it to the respective track

### Edit Timeline
- **Move playhead:** Click anywhere on the timeline or time ruler
- **Play/Pause:** Click the play button in the video preview
- **Zoom:** Use the 🔍− and 🔍+ buttons to adjust timeline scale
- **Current time:** Displayed in bottom-right corner of preview

### Preview
- The video preview shows the clip at the current playhead position
- Click **Play** to preview your timeline
- Use **Stop** to return to the beginning
- Click anywhere on the timeline to scrub to different positions

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Zustand
- **Backend:** Tauri 2.0 (Rust)
- **Build Tool:** Vite
- **State Management:** Zustand

## Project Structure

```
clipforge/
├── src/                      # React frontend
│   ├── components/          # UI components
│   │   ├── MediaLibrary.tsx
│   │   ├── VideoPreview.tsx
│   │   └── Timeline.tsx
│   ├── hooks/               # Custom hooks
│   │   └── useFileDrop.ts
│   ├── store/               # Zustand state management
│   │   └── timelineStore.ts
│   ├── styles/              # Global CSS
│   │   └── index.css
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── src-tauri/                # Rust backend
│   ├── src/
│   │   └── main.rs          # Tauri main
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # System architecture
│   ├── TASKS.md             # Development tasks
│   └── PRD.md               # Product requirements
├── dev.sh                    # Development helper script
├── package.json              # Node dependencies
├── tsconfig.json             # TypeScript config
└── vite.config.ts            # Vite configuration
```

## Documentation

- **[README.md](README.md)** - Quick start guide and overview (you are here)
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and design decisions
- **[docs/PRD.md](docs/PRD.md)** - Product requirements document
- **[docs/TASKS.md](docs/TASKS.md)** - Development task tracking and roadmap

## Troubleshooting

### Port Already in Use
If you see "Port 1420 is already in use":
```bash
lsof -ti:1420 | xargs kill -9
```

### Build Issues
If build fails:
```bash
# Clean and rebuild
cd src-tauri && cargo clean && cd ..
source "$HOME/.cargo/env"
npm run tauri dev
```

### Rust Not Found
If Rust isn't installed:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### Drag & Drop Not Working
1. Check browser console for error messages
2. Ensure files are valid video formats (MP4, MOV, AVI, WebM)
3. Try using the "+ Add Files" button instead

## Development

### Current Status
- **Phase 1:** ✅ Complete (Import, Preview, Timeline UI)
- **Phase 2:** ✅ Complete (Timeline interaction, playback)
- **Phase 3:** 🚧 In Progress (Trim, Export)

### Next Steps
1. Implement trim functionality (adjust clip start/end points)
2. Add FFmpeg integration for export to MP4
3. Implement screen/webcam recording capabilities

## License

MIT
