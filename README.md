# ClipForge

A desktop video editor built with Tauri + React + TypeScript.

## Overview

ClipForge is a native desktop video editor that provides a streamlined workflow for recording, importing, editing, and exporting videos. Built with modern web technologies powered by Tauri for native performance.

## Features

### ✅ Core Features
- ✅ **Video Import:** Drag & drop support for MP4, MOV, AVI, WebM
- ✅ **Media Library:** Display imported clips with metadata and thumbnails
- ✅ **Timeline Editing:** Multi-track timeline with zoom controls
- ✅ **Video Preview:** Real-time preview player with play/pause controls
- ✅ **Export:** Export to MP4 using FFmpeg
- ✅ **Screen Recording:** Native screen capture via FFmpeg
- ✅ **Webcam Recording:** Camera recording with audio
- ✅ **Drag & Drop:** Intuitive clip management from library to timeline
- ✅ **Multiple Tracks:** Support for Track 1 and Track 2
- ✅ **Time Ruler:** Precise timeline navigation

### 🚧 Planned Features
- [ ] Split clips at playhead
- [ ] Advanced trimming with precise controls
- [ ] Keyboard shortcuts
- [ ] Transitions and effects

## Installation

### For End Users (macOS)

1. **Download the DMG installer:**
   - Get `clipforge_0.1.0_aarch64.dmg` from the [releases](../../releases)
   
2. **Install the app:**
   - Double-click the DMG file
   - Drag `clipforge.app` to your Applications folder
   - Launch ClipForge from Applications

### System Requirements
- **macOS** 11.0 or higher (Big Sur+)
- **FFmpeg** - Required for video processing
   - Install via Homebrew: `brew install ffmpeg`

### Install FFmpeg

**Using Homebrew (recommended):**
```bash
brew install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```

## Quick Start

### Your First Video Project

1. **Launch ClipForge** from your Applications folder
2. **Import or Record:**
   - Drag video files into the app, OR
   - Use the recording controls to capture screen/webcam
3. **Edit:** Arrange clips on the timeline, trim as needed
4. **Export:** Click Export and save your video

That's it! You've created your first video. 🎬

## How to Use

### Import Videos
1. Drag video files (MP4, MOV, AVI, WebM) into the **Media Library** (left sidebar)
2. Clips appear with their filename and duration
3. Alternatively, use the file picker to select videos

### Add Clips to Timeline
- **Drag & Drop:** Drag a clip from the Media Library onto **Track 1** or **Track 2**
- **Quick Add:** Click the **T1** or **T2** button next to a clip to add it to the respective track
- **Position:** Clips can be moved along the timeline by dragging

### Edit Timeline
- **Move playhead:** Click anywhere on the timeline or time ruler to jump to that position
- **Play/Pause:** Click the play button in the video preview
- **Stop:** Returns playhead to the beginning
- **Zoom:** Use the 🔍− and 🔍+ buttons to adjust timeline scale
- **Current time:** Displayed in bottom-right corner

### Screen Recording
1. Click the **Monitor** button in the Recording Controls panel
2. Grant screen recording permissions when prompted
3. Recording starts automatically and shows duration
4. Click **Stop** to end recording
5. The recording is automatically added to your timeline

### Webcam Recording
1. Click the **Camera** button in the Recording Controls panel
2. Grant camera and microphone permissions
3. Recording starts and shows duration
4. Click **Stop** to end and add to timeline

### Export Your Video
1. Arrange clips on the timeline
2. Click the **Export** button in the toolbar
3. Choose export settings (resolution, quality)
4. Select output location
5. Click **Export** to process
6. Progress is shown in the dialog

### Trim Clips
- Use the trim handles on clips to adjust start and end points
- The preview shows the trimmed section

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
│   │   ├── ExportDialog.tsx    # Export settings and progress
│   │   ├── MediaLibrary.tsx    # Video library panel
│   │   ├── RecordingControls.tsx # Screen/webcam recording
│   │   ├── Timeline.tsx         # Timeline editor
│   │   ├── TrimToolbar.tsx     # Trimming controls
│   │   └── VideoPreview.tsx    # Video preview player
│   ├── hooks/               # Custom hooks
│   │   ├── useFileDrop.ts      # Drag & drop functionality
│   │   └── useRecording.ts     # Recording state management
│   ├── store/               # Zustand state management
│   │   └── timelineStore.ts    # Timeline state store
│   ├── styles/              # Global CSS
│   │   └── index.css
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── src-tauri/                # Rust backend
│   ├── src/
│   │   └── main.rs          # Tauri commands and FFmpeg integration
│   ├── target/release/bundle/ # Build artifacts
│   │   ├── dmg/             # DMG installer
│   │   └── macos/           # macOS app bundle
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md      # System architecture
│   ├── TASKS.md             # Development tasks
│   └── PRD.md               # Product requirements
├── dev.sh                    # Development helper script
├── package.json             # Node dependencies
├── tsconfig.json             # TypeScript config
└── vite.config.ts            # Vite configuration
```

## Documentation

- **[README.md](README.md)** - Quick start guide and overview (you are here)
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and design decisions
- **[docs/PRD.md](docs/PRD.md)** - Product requirements document
- **[docs/TASKS.md](docs/TASKS.md)** - Development task tracking and roadmap

## Troubleshooting

### FFmpeg Not Found
**Problem:** App shows "FFmpeg not found" error

**Solution:**
```bash
# Install FFmpeg via Homebrew
brew install ffmpeg

# Verify installation
ffmpeg -version

# Restart ClipForge
```

### Screen Recording Not Working
**Problem:** Screen recording fails to start

**Solution:**
1. Grant screen recording permissions in **System Settings > Privacy & Security > Screen Recording**
2. Add ClipForge to the allowed apps list
3. Restart the app

### Export Fails
**Problem:** Export button doesn't work or shows errors

**Solutions:**
1. Verify FFmpeg is installed: `ffmpeg -version`
2. Check output path is writable
3. Ensure enough disk space
4. Check FFmpeg error messages in terminal

### Port Already in Use (Development)
If you see "Port 1420 is already in use":
```bash
lsof -ti:1420 | xargs kill -9
```

### Build Issues (Development)
If build fails:
```bash
# Clean and rebuild
cd src-tauri && cargo clean && cd ..
source "$HOME/.cargo/env"
npm run tauri dev
```

### Drag & Drop Not Working
1. Check that files are valid video formats (MP4, MOV, AVI, WebM)
2. Try using the file picker instead
3. Check disk permissions for the destination folder

## Development

### For Developers

**Prerequisites:**
- **Node.js** 18 or higher
- **Rust** (latest stable) - Install via [rustup](https://rustup.rs/)
- **FFmpeg** - Required for video processing

**Setup:**

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/clipforge.git
cd clipforge
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run in development mode:**
```bash
# Option 1: Use the helper script
./dev.sh

# Option 2: Manual (load Rust environment first)
source "$HOME/.cargo/env"
npm run tauri dev
```

4. **Build for production:**
```bash
source "$HOME/.cargo/env"
npm run tauri:build
```

**Note:** The first build takes 5-10 minutes as it compiles Rust dependencies. Subsequent builds are much faster.

### Current Status
- **Phase 1:** ✅ Complete (Import, Preview, Timeline UI)
- **Phase 2:** ✅ Complete (Timeline interaction, playback)
- **Phase 3:** ✅ Complete (Export, Recording)
- **Phase 4:** ✅ Complete (Native FFmpeg recording)

## Build Information

**Version:** 0.1.0  
**Platform:** macOS (aarch64)  
**Build Size:** ~12 MB  
**Installation Package:** DMG (~3.0 MB)

### Build Location
- **App Bundle:** `src-tauri/target/release/bundle/macos/clipforge.app`
- **DMG Installer:** `src-tauri/target/release/bundle/dmg/clipforge_0.1.0_aarch64.dmg`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
