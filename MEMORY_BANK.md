# ClipForge Memory Bank

**Last Updated:** January 2025  
**Project:** ClipForge Desktop Video Editor  
**Status:** Phase 5 Complete - Master Track System Implemented - Timeline Zoom Improvements - Video Trimming Fixed

---

## Project Overview

ClipForge is a desktop video editor built with **Tauri (Rust + React)** that enables users to import, edit, and export videos. The MVP focuses on basic editing capabilities with trim functionality and MP4 export.

### Key Technologies
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend:** Tauri 2.0 + Rust
- **Video Processing:** FFmpeg (via system installation)
- **Platform:** macOS (primary), extensible to Windows/Linux

---

## Architecture & Key Decisions

### Why Tauri?
- **Native Performance:** Rust backend provides fast, memory-safe operations
- **Small Binary:** ~12MB compared to Electron's 100MB+
- **System Integration:** Direct access to file system, FFmpeg commands
- **Security:** Process isolation, capability-based security model

### State Management (Zustand)
- **Reason:** Simple, lightweight, no boilerplate
- **Structure:**
  - `timelineStore.ts` - Manages clips, playhead, zoom, playback state
  - Single store with clear action methods

### Timeline Architecture
- **Master Track (Track 0):** Green-themed output track - final continuous video with no gaps
- **Source Tracks (Track 1, 2):** Blue-themed staging tracks for arranging clips before adding to master
- **Clips:** Each clip has position, startTime, endTime, duration, path
- **Playhead:** Represents current time position in seconds, spans full timeline height
- **Zoom:** Dynamic timeline extension based on zoom level
  - At 0.2x: 30-minute timeline view
  - At 0.5x: 15-minute timeline view
  - At 1x: 10-minute timeline view
  - Adaptive marker intervals prevent clutter

### Media Handling
- **Import:** Drag & drop from Finder OR file picker button
- **Blob URL Issue:** Files imported via browser File API get blob URLs
- **Solution:** Use Tauri's `.path` property to get actual file paths
- **Duration Extraction:** Uses HTML5 video element metadata

### Timeline Scrolling
- **Issue:** Timeline needed better scrolling behavior for long videos
- **Solution:** Implemented single horizontal scrollbar for both ruler and tracks
- **Zoom Behavior:** Adaptive marker intervals based on zoom level to prevent overlapping labels
  - Zoom < 0.2x: markers every 5 minutes (300s)
  - Zoom < 0.5x: markers every 2 minutes (120s)
  - Zoom < 1x: markers every 1 minute (60s)
  - Zoom < 2x: markers every 30 seconds
  - Zoom < 5x: markers every 10 seconds
  - Zoom ≥ 5x: markers every 5 seconds
- **Timeline Extension:** Timeline extends based on zoom level for better overview
  - Very zoomed out (0.2x): Shows 30 minutes
  - Zoomed out (0.5x): Shows 15 minutes
  - Normal (1x): Shows 10 minutes
  - Zoomed in (2x+): Shows 3-5 minutes

---

## Current Implementation Status

### Phase 1: Foundation ✅ (Complete)
- ✅ Tauri + React project setup
- ✅ File drag & drop functionality
- ✅ Video preview player
- ✅ Basic timeline UI with time ruler
- ✅ Media library panel
- ✅ Multiple video import

### Phase 2: Timeline & Editing ✅ (Complete)
- ✅ Drag clips from library to timeline
- ✅ Playhead indicator and scrubbing
- ✅ Trim functionality (start/end points)
- ✅ Preview player synced to timeline
- ✅ Play/pause/stop controls
- ✅ Tested with multiple clips

### Phase 3: MVP Export ✅ (Complete)
- ✅ FFmpeg integration
- ✅ Single clip export to MP4
- ✅ Export progress indicator
- ✅ Export dialog UI
- ✅ Native .app binary built (12MB)
- ⚠️ **File Path Issue:** Fixed - now uses Tauri's file.path property

### Phase 4: Recording (Not Started)
- Screen recording API
- Webcam recording
- Picture-in-picture
- Recording controls

### Phase 5: Polish ✅ (Complete)
- ✅ Split clip functionality - Implemented
- ✅ Merge clip functionality - Implemented
- ✅ Delete clip functionality - Implemented
- ✅ Master track system - Green-themed output track with no gaps
- ✅ Source tracks - Blue-themed staging tracks (1, 2)
- ✅ Clip copying to master track - Original stays in source track
- ✅ Timeline zoom - Dynamic extension based on zoom level
- ✅ Video trimming - Fixed playback to respect trim points
- ✅ Playhead visualization - Full height line through all tracks
- ✅ Professional UI redesign - Complete
- ✅ Professional icons (Lucide React) - Complete
- ✅ Increased track height (100px per track)
- ⏳ Snap-to-grid - Not implemented
- ⏳ Keyboard shortcuts - Basic ones work

---

## Key Files & Their Purpose

### Core App Files
```
src/
├── App.tsx                 # Main layout, export button
├── store/
│   └── timelineStore.ts    # Zustand state management
├── components/
│   ├── MediaLibrary.tsx    # Media import and library (compact sidebar)
│   ├── VideoPreview.tsx   # Video player with play/pause controls
│   ├── Timeline.tsx        # Timeline tracks and clip arrangement
│   ├── TrimToolbar.tsx    # Editing tools (Split, Merge)
│   └── ExportDialog.tsx   # Export functionality UI
├── hooks/
│   └── useFileDrop.ts      # Drag & drop handler
└── tauri.d.ts             # Tauri type definitions

src-tauri/
├── src/
│   └── main.rs            # Rust backend, FFmpeg commands
├── capabilities/
│   └── default.json       # Tauri permissions
└── Cargo.toml             # Rust dependencies
```

### Important Tauri Commands (Rust)
```rust
// Available commands in src-tauri/src/main.rs:
export_video(params)       // Trim and export clip to MP4
process_file(params)      // Save blob data to temp file, return path
check_ffmpeg()            // Verify FFmpeg installation
get_documents_path()      // Get user Documents directory
```

### Store Actions (Zustand)
```typescript
// Available actions in src/store/timelineStore.ts:
addClip(clip)                 // Add clip to timeline (auto-positions at 0:00 for new clips)
removeClip(id)                 // Remove clip
updateClip(id, updates)       // Update clip properties
setCurrentTime(time)          // Set playhead position
setIsPlaying(bool)            // Set playback state
splitClip(clipId, time)       // Split clip at specified time
combineClips(id1, id2)        // Merge two adjacent clips
setSelectedClips(ids)         // Set selected clip IDs
moveClip(clipId, pos, track)  // Move/reposition clip on timeline
setDraggingClipId(id)         // Track currently dragging clip
getMasterTrackClips()         // Get all clips on master track (track 0)
ensureMasterTrackContinuity() // Reorder master track clips with no gaps
```

### Timeline Data Structure
```typescript
interface Clip {
  id: string;              // Unique identifier
  name: string;            // Display name
  path: string;            // Real file system path for export
  blobUrl?: string;        // Blob URL for video preview (optional)
  duration: number;        // Total duration in seconds
  startTime: number;       // Trim start (seconds)
  endTime: number;         // Trim end (seconds)
  track: number;           // Timeline track (1 or 2)
  position: number;         // Timeline position in seconds
  fileSize?: number;       // File size in bytes (for export estimation)
}
```

---

## Current Project Structure

```
clipforge/
├── .git/                    # Git repository
├── .gitignore              # Git ignore rules
├── dev.sh                   # Development script
├── MEMORY_BANK.md          # Project documentation
├── README.md               # Project readme
├── index.html              # Main HTML entry point
├── package.json            # Node.js dependencies
├── package-lock.json       # Locked dependencies
├── postcss.config.js       # PostCSS config
├── tailwind.config.js      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite bundler config
├── dist/                   # Build output (gitignored)
├── node_modules/           # Dependencies (gitignored)
├── src/                    # Frontend source code
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── store/             # State management (Zustand)
│   └── styles/            # CSS styles
└── src-tauri/              # Backend (Rust)
    ├── src/               # Rust source code
    ├── target/            # Build output (gitignored)
    ├── capabilities/      # Tauri permissions
    └── icons/             # App icons
```

## Known Issues & Solutions

### Issue 1: Blob URLs vs File Paths ✅ FIXED
- **Problem:** Browser File API creates blob URLs, not file paths
- **Solution:** Implemented dual-path system
  - `blobUrl`: For instant preview in browser
  - `path`: Empty initially, generated on-demand for export
- **Implementation:** `process_file` Tauri command converts blob data to temp files
- **Location:** `src/components/MediaLibrary.tsx`
- **Status:** ✅ Fixed - Lazy path generation for performance

### Issue 2: Timeline Zoom Label Overlap
- **Problem:** At high zoom levels, time markers overlap and become unreadable
- **Solution:** Implemented adaptive marker intervals based on zoom level
- **Location:** `src/components/Timeline.tsx` lines 89-100
- **Fix:** Dynamic intervals prevent too many markers from rendering
- **Status:** ✅ Fixed

### Issue 3: Single Page Layout
- **Problem:** Page-level scrolling was disrupting the timeline experience
- **Solution:** Added `overflow-hidden` to containers, made timeline self-contained with horizontal scroll
- **Location:** `src/App.tsx`, `src/components/Timeline.tsx`
- **Fix:** 
  - App uses `h-screen w-screen overflow-hidden`
  - Timeline uses `overflow-x-auto` for horizontal scrolling only
  - Media library has internal `overflow-y-auto`
- **Status:** ✅ Fixed

### Issue 4: Tauri Permissions
- **Problem:** Invalid permission names in capabilities
- **Solution:** Use only core: permissions, remove fs: and dialog: permissions
- **Location:** `src-tauri/capabilities/default.json`

---

## Development Workflow

### Running in Development
```bash
source "$HOME/.cargo/env"
npm run tauri dev
# Or use the dev.sh script:
bash dev.sh
```

### Building for Production
```bash
source "$HOME/.cargo/env"
npm run build
npm run tauri build
```

### Output Location
- **Development binary:** `src-tauri/target/debug/clipforge`
- **Production .app:** `src-tauri/target/release/bundle/macos/clipforge.app`
- **App size:** ~12MB

### Hot Reload
- Vite HMR updates frontend code automatically
- Tauri recompiles Rust backend on changes
- Check terminal for compilation status
- Press Ctrl+C to stop dev server

---

## FFmpeg Usage

### Installation
```bash
brew install ffmpeg
```

### Export Command Generated
```bash
ffmpeg -i INPUT_PATH -ss START_TIME -t DURATION \
       -c:v libx264 -c:a aac -preset medium -y OUTPUT_PATH
```

### Progress Tracking
- Currently not implemented (FFmpeg stdout parsing)
- Future: Parse FFmpeg stderr for frame progress

---

## Testing Checklist

### MVP Testing (Required)
- [ ] App launches from packaged .app
- [ ] Import 3 video files via drag & drop
- [ ] Timeline displays imported clips
- [ ] Preview plays imported video
- [ ] Trim clip by adjusting start/end
- [ ] Export to MP4 successfully
- [ ] Exported video plays in external player

### Test Data
- Test videos in user's Desktop directory
- Known test file: "Screen Recording 2025-10-27 at 8.36.57 PM.mov" (442 seconds)

---

## Important Code Patterns

### Drag & Drop
- External drops (from Finder): Use `file.path` for real file paths
- Internal drags (within app): Use JSON data transfer
- Drop zones: Timeline has full-width drop zones per track

### Export Process
1. User clicks Export button
2. ExportDialog opens with clip info
3. User selects output location (uses Documents by default)
4. Frontend calls `export_video` Tauri command
5. Rust executes FFmpeg command
6. Progress shown, success/error displayed

### Timeline Interaction
- **Click:** Sets playhead position
- **Scrub:** Drag to move playhead
- **Trim:** Drag clip edges to adjust start/end (yellow handles)
- **Zoom:** Buttons adjust pixelsPerSecond (10 * zoomLevel)
- **Drag Clips:** Click and drag clips to reposition on timeline
- **Master Track Drop:** Creates a copy of clip on master track, original stays in source
- **Source Track Drop:** Moves clip to different source track position
- **Clip Selection:** Click to select, Ctrl/Cmd+Click to multi-select

---

## Recent Major Updates (January 2025)

### Master Track System & Video Trimming (Latest - January 2025)
- ✅ **Master Track System** - Green-themed output track (track 0) for final video
- ✅ **Source Tracks** - Blue-themed staging tracks (1, 2) for organizing clips
- ✅ **Clip Copy Behavior** - Dragging to master track creates a copy, original stays in source
- ✅ **New Clips Start at 0:00** - All new clips automatically positioned at beginning
- ✅ **Automatic Continuity** - Master track automatically prevents gaps between clips
- ✅ **Fixed Video Trimming** - Playback now correctly respects startTime and endTime trim points
- ✅ **Playhead Visualization** - Red line spans full timeline height through all tracks
- ✅ **Dynamic Zoom Timeline** - Timeline extends based on zoom level (30 min at 0.2x, etc.)
- ✅ **Increased Track Heights** - 100px per track for better clip manipulation
- ✅ **Improved Marker Intervals** - Adaptive spacing prevents clutter at all zoom levels

### UI Redesign & Professional Icon Pack
- ✅ **Complete UI redesign** - More professional, video editor-like interface
- ✅ **Lucide React icons** - Professional icon library installed and integrated
- ✅ **Larger preview area** - Black background like Premiere Pro/Final Cut
- ✅ **Narrower media library** (56px) - More space for timeline editing
- ✅ **Taller timeline** (288px) - Better clip manipulation with 80px tracks
- ✅ **Compact header** - "Cut • Merge • Export" tagline
- ✅ **Trim Toolbar** - Prominent editing tools with status indicators
- ✅ **Track labels** - Clear "Track 1"/"Track 2" labels on timeline
- ✅ **Enhanced clips** - Gradients, shadows, duration display, yellow trim handles

### Split & Merge Functionality
- ✅ **Split clip feature** - Split clips at playhead position
- ✅ **Merge clips feature** - Combine adjacent clips into one
- ✅ **Clip selection** - Click to select, Ctrl/Cmd to multi-select
- ✅ **Visual feedback** - White ring on selected clips

### Export Improvements
- ✅ **Blob URL handling** - Converts blob URLs to temp files for export
- ✅ **Lazy path generation** - Fast import, convert only on export
- ✅ **Progress estimation** - Simulated progress based on video characteristics
- ✅ **Better error messages** - Clear, actionable error displays

### Architecture Improvements
- ✅ **Dual path system** - `blobUrl` for preview, `path` for export
- ✅ **File size tracking** - Optional `fileSize` property for export estimation
- ✅ **State management** - Added `selectedClips` and selection management

## Next Steps (Future Enhancements)

### Short Term
1. Add keyboard shortcuts (S for split, C for combine, etc.)
2. Improve trim handle visibility and responsiveness
3. Add snap-to-grid functionality
4. Implement clip dragging on timeline

### Long Term (Phase 4+)
1. Screen recording using `getDisplayMedia()`
2. Webcam recording using `getUserMedia()`
3. Picture-in-picture support
4. Audio waveform visualization
5. Multiple clip export (concatenate)

---

## Dependencies

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.7",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@tauri-apps/api": "^2.0.0",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6"
  }
}
```

## UI Components Overview

### App Layout (`src/App.tsx`)
- **Header**: Compact with app name, tagline, and Export button
- **Media Library**: 56px width sidebar for video files
- **Preview**: Large black background area (takes most space)
- **Trim Toolbar**: Above timeline with Split/Merge buttons
- **Timeline**: 288px height with 80px tall tracks

### TrimToolbar (`src/components/TrimToolbar.tsx`)
- **Split**: Split clip at playhead position (blue button)
- **Merge**: Combine selected clip with adjacent (purple button)
- **Status**: Shows current clip and selected count
- **Icons**: Lucide React (Scissors, Merge icons)

### Backend (Cargo.toml)
```toml
[dependencies]
tauri = { version = "2.0", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

---

## Performance Characteristics

- **App Size:** ~12MB
- **Launch Time:** Target <5 seconds
- **Timeline Performance:** Responsive with 10+ clips
- **Preview FPS:** 30fps target
- **Memory Usage:** <500MB baseline

---

## Git Configuration

### .gitignore Includes
- `node_modules/`
- `src-tauri/target/`
- `.DS_Store`
- `dist/`

### Repository Status
- Main branch: Up to date with origin
- TASKS.md: Tracking project progress
- No documentation in repository (docs/ folder present but minimal)

---

## Environment Setup

### Required Tools
- Node.js (v18+)
- Rust/Cargo (via `source "$HOME/.cargo/env"`)
- FFmpeg (via `brew install ffmpeg`)
- Tauri CLI (via `npm install -g @tauri-apps/cli`)

### Shell Scripts
- `dev.sh`: Development server launcher (sources cargo env)
- `package.json` has scripts for tauri:dev and tauri:build

---

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│          Frontend (React)               │
│  ┌──────────┐  ┌──────────────────┐   │
│  │  Media   │  │    Timeline      │   │
│  │  Library │  │   (Zustand)      │   │
│  └────┬─────┘  └────┬─────────────┘   │
│       │             │                   │
│  ┌────▼─────────────▼──────┐          │
│  │    Video Preview        │          │
│  └─────────────────────────┘          │
└─────────────────┬───────────────────────┘
                  │ IPC (Tauri)
┌─────────────────▼───────────────────────┐
│     Backend (Rust/Tauri)               │
│  ┌──────────────────────────────────┐ │
│  │   Tauri Commands:                │ │
│  │   - export_video()               │ │
│  │   - check_ffmpeg()              │ │
│  │   - get_documents_path()        │ │
│  └─────────────┬──────────────────┘ │
└────────────────┼──────────────────────┘
                 │ Process Execution
         ┌───────▼───────┐
         │    FFmpeg     │
         │   (System)    │
         └───────────────┘
```

---

## Contact & Resources

### Project Files
- PRD: `docs/PRD.md`
- Tasks: `TASKS.md`
- Architecture: `docs/ARCHITECTURE.md`

### External Resources
- Tauri Docs: https://tauri.app
- FFmpeg Docs: https://ffmpeg.org/documentation.html
- React Docs: https://react.dev

---

**Note:** This memory bank should be updated as the project evolves. Key changes should be documented here for reference and continuity.
