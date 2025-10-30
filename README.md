# ClipForge

A desktop video editor built with Tauri + React + TypeScript.

## Overview

ClipForge is a native desktop video editor that provides a streamlined workflow for recording, importing, editing, and exporting videos. Built with modern web technologies powered by Tauri for native performance.

## Features

### Core Features
- **Video Import:** Drag & drop support for MP4, MOV, AVI, WebM
- **Media Library:** Display imported clips with metadata (duration, file size, resolution)
- **Metadata Panel:** View detailed information about selected media files
- **Timeline Editing:** Multi-track timeline with zoom controls and master track
- **Video Preview:** Real-time preview player with play/pause controls and volume slider
- **Export:** Export to MP4 using FFmpeg with trim point support
- **Screen Recording:** Native screen capture via FFmpeg with device selection
- **Webcam Recording:** Camera recording with audio support
- **Picture-in-Picture (PiP):** Record screen + webcam simultaneously with overlay support
- **PiP Export:** Add webcam overlay to master track clips during export
- **Drag & Drop:** Intuitive clip management from library to timeline
- **Multiple Tracks:** Support for master track and multiple source tracks
- **Time Ruler:** Precise timeline navigation with dynamic markers
- **Clip Trimming:** Adjust clip start and end points directly on timeline
- **Clip Splitting:** Split clips at playhead position

### Planned Features
- [ ] Advanced trimming with precise controls
- [ ] Keyboard shortcuts
- [ ] Transitions and effects
- [ ] Audio mixing
- [ ] Project save/load

## Installation

### For End Users (macOS)

1. **Download the DMG installer:**
   - Get `clipforge_0.1.0_aarch64.dmg` from the releases page
   
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

That's it! You've created your first video.

## How to Use

### Import Videos
1. Drag video files (MP4, MOV, AVI, WebM) into the **Media Library** (left sidebar)
2. Clips appear with their filename and duration
3. Alternatively, use the file picker to select videos
4. Select a clip to view detailed metadata (duration, file size, resolution)

### Add Clips to Timeline
- **Drag & Drop:** Drag a clip from the Media Library onto the timeline (source tracks or master track)
- **Position:** Clips can be moved along the timeline by dragging
- **Master Track:** The green track is for final composition and export
- **Source Tracks:** Blue tracks are for source material (can be combined onto master track)

### Edit Timeline
- **Move playhead:** Click anywhere on the timeline or time ruler to jump to that position
- **Play/Pause:** Click the play button in the video preview
- **Stop:** Returns playhead to the beginning
- **Zoom:** Use the zoom buttons to adjust timeline scale
- **Current time:** Displayed in bottom-right corner
- **Volume Control:** Adjust volume with the slider in the video preview

### Screen Recording
1. Select your screen from the dropdown (if multiple screens available)
2. Click the **Screen** button in the Recording Controls panel
3. Grant screen recording permissions when prompted
4. Recording starts automatically and shows duration
5. Click **Stop** to end recording
6. The recording is automatically added to your timeline

### Webcam Recording
1. Select your webcam from the dropdown (if multiple cameras available)
2. Click the **Webcam** button in the Recording Controls panel
3. Grant camera and microphone permissions when prompted
4. Recording starts and shows duration
5. Click **Stop** to end and add to timeline

### Screen + Webcam (Picture-in-Picture)
1. Select screen and webcam from respective dropdowns
2. Select PiP position (top-left, top-right, bottom-left, bottom-right)
3. Click the **Screen + Webcam** button
4. Grant screen and camera permissions when prompted
5. Both streams are captured and composited in real-time
6. Click **Stop** to end recording
7. Recording is added to timeline with PiP overlay already applied

### Export Your Video
1. Arrange clips on the timeline (master track for final output)
2. Click the **Export** button in the toolbar
3. The export processes clips from the master track with trim points
4. If a clip has a PiP overlay configured, it will be composited during export
5. Progress is shown in the dialog
6. Export completes and shows the output file path

### Trim Clips
- Use the yellow trim handles on clip edges to adjust start and end points
- The preview shows the trimmed section in real-time
- Trimming applies to both playback and export

### Split Clips
- Position the playhead where you want to split
- Click the **Split** button in the tools toolbar
- The clip is split into two separate clips at the playhead position

### Picture-in-Picture Overlay (Export)
1. Add a webcam recording to your timeline
2. Add a screen recording or video clip to the master track
3. Select the master track clip
4. Click **Add PiP** in the tools toolbar
5. Select the webcam clip and position (top-left, top-right, bottom-left, bottom-right)
6. The PiP overlay preview appears in the video player
7. Export will composite the webcam overlay onto the main video

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Zustand
- **Backend:** Tauri 2.0 (Rust)
- **Build Tool:** Vite
- **State Management:** Zustand
- **Video Processing:** FFmpeg (via native commands)

## Project Structure

```
clipforge/
├── src/                      # React frontend
│   ├── components/          # UI components
│   │   ├── ExportDialog.tsx    # Export settings and progress
│   │   ├── MediaLibrary.tsx    # Video library panel
│   │   ├── MetadataPanel.tsx   # Media metadata display
│   │   ├── RecordingControls.tsx # Screen/webcam recording
│   │   ├── Timeline.tsx         # Timeline editor
│   │   ├── TrimToolbar.tsx     # Editing tools (split, PiP)
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
1. Check that files are valid video formats (MP4, MOV,回避, WebM)
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
