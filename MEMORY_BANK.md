# ClipForge Memory Bank

**Last Updated:** January 2025  
**Project:** ClipForge Desktop Video Editor  
**Status:** Phase 5+ Complete - Playback Continuity - Track Selection - UI Refinements

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
- **Source Tracks (Dynamic):** Blue-themed staging tracks that scale infinitely
  - Start with 2 tracks by default
  - New tracks created automatically when dragging videos below existing tracks
  - Each track has smart labels: "Source Track N", "Screen Recording N", or "Camera Recording N"
- **Clips:** Each clip has position, startTime, endTime, duration, path, recordingType (optional)
- **Playhead:** Represents current time position in seconds, spans full timeline height
- **Zoom:** Dynamic timeline extension based on zoom level
  - At 0.2x: 30-minute timeline view
  - At 0.5x: 15-minute timeline view
  - At 1x: 10-minute timeline view
  - Adaptive marker intervals prevent clutter
- **Vertical Scrolling:** Timeline scrolls vertically as tracks are added, with new track drop zone visible

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

### Phase 4: Recording ✅ (Complete - Native Implementation)
- ✅ Recording UI with Screen/Webcam/PiP buttons
- ✅ RecordingControls component with duration timer
- ✅ useRecording hook with native Tauri commands
- ✅ Rust backend using FFmpeg for screen/webcam capture
- ✅ Recording saved to /tmp and added to timeline automatically
- ✅ Graceful error handling
- ✅ Native macOS recording using avfoundation
- ✅ Correct device mapping (device 4 for screen, device 0 for webcam)
- ✅ File reading via read_file_bytes for blob URL creation

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
- ✅ Optimized track height (65px per track, reduced for compact timeline)
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
process_file(params)       // Save blob data to temp file, return path
check_ffmpeg()             // Verify FFmpeg installation
get_documents_path()       // Get user Documents directory
start_recording(params)    // Start screen/webcam recording with FFmpeg
stop_recording()           // Stop current recording and save file
is_recording()             // Check if recording is currently active
read_file_bytes(path)      // Read file content as bytes for blob creation
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
getNextAvailableTrack()       // Find next available empty track or create new one
ensureTrackExists(num)        // Ensure track exists by expanding if needed
getTrackLabel(num)             // Get smart track label based on clip types (Screen/Camera Recording)
setPreferredTrack(track)      // Set preferred track for preview and split operations (null for auto)
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
  track: number;           // Timeline track (0 = master, 1+ = source tracks)
  position: number;         // Timeline position in seconds
  fileSize?: number;       // File size in bytes (for export estimation)
  recordingType?: 'screen' | 'webcam'; // Type of recording if it's a recording
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
- **Status:** ✅ Fixed

### Issue 5: Media Recording APIs ✅ FIXED
- **Problem:** `navigator.mediaDevices` is undefined in Tauri's webview environment
- **Error:** `TypeError: undefined is not an object (evaluating 'navigator.mediaDevices.getDisplayMedia')`
- **Root Cause:** Tauri's webview (wry) doesn't expose browser media APIs by default
- **Solution:** Implemented native Rust-based recording using FFmpeg
  - Added `start_recording`, `stop_recording`, `is_recording`, `read_file_bytes` Tauri commands
  - Uses FFmpeg with avfoundation for macOS screen/webcam capture
  - Recordings saved to `/tmp` directory with timestamp filenames
  - Device mapping: [0] MacBook Camera (webcam), [4] Capture screen 0 (screen recording)
  - Screen recording uses device 4, webcam uses device 0
  - Recorded files read via `read_file_bytes` and converted to blob URLs for timeline
- **Location:** 
  - `src-tauri/src/main.rs` - Rust recording commands with device configuration
  - `src/hooks/useRecording.ts` - Updated to use Tauri invoke, handles file reading
  - `src/components/RecordingControls.tsx` - Recording UI
- **Status:** ✅ Implemented - Native recording using FFmpeg with correct device mapping

### Issue 6: Recording Not Starting ⚠️ DEBUGGING
- **Problem:** User clicks record button but nothing happens - recording doesn't start
- **Potential Causes:**
  1. **macOS Permissions:** Screen recording and microphone permissions not granted
     - System Settings > Privacy & Security > Screen Recording
     - System Settings > Privacy & Security > Microphone
  2. **FFmpeg Not Found:** System doesn't have FFmpeg installed or not in PATH
  3. **Device Mapping Issue:** FFmpeg device indices may have changed
     - Expected: Device 4 for screen, Device 0 for webcam
     - May need to run `ffmpeg -f avfoundation -list_devices true -i ""` to verify
  4. **Tauri Command Error:** Invoke call failing silently
- **Debugging Steps:**
  - Run app in dev mode: `npm run tauri:dev` to see console errors
  - Check macOS Console.app for errors
  - Verify FFmpeg installation: `which ffmpeg && ffmpeg -version`
  - Test FFmpeg device listing: `ffmpeg -f avfoundation -list_devices true -i ""`
- **Location:** 
  - `src/hooks/useRecording.ts` line 25-71 (startScreenRecording)
  - `src-tauri/src/main.rs` line 117-155 (start_recording command)
- **Status:** 🔍 In Progress - Debugging in development mode

---

## Development Workflow

### Running in Development
```bash
source "$HOME/.cargo/env"
npm run tauri dev
# Or use the dev.sh script:
bash dev.sh
# Or use the npm script:
npm run tauri:dev
```

### Building for Production
```bash
source "$HOME/.cargo/env"
npm run build
npm run tauri build
# Or use the npm script:
npm run tauri:build
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
- **Clip Selection:** Click to select, Ctrl/Cmd+Click to multi-select (automatically sets preferred track)
- **Track Label Click:** Click track label to jump playhead to first clip on that track
- **Dynamic Track Creation:** Drag video below last track to create new track automatically
- **Playback Continuity:** Playback automatically transitions between clips on same track without pausing

---

## Recent Major Updates (January 2025)

### Playback Continuity & Track Selection (Latest - January 2025) ✅
- **Seamless Clip Transitions:** Video playback now automatically transitions from one clip to the next on the same track without pausing or looping
- **Track Label Clicking:** Clicking track labels (Master Track, Source Track N) automatically moves playhead to first clip on that track
- **Preferred Track System:** Added `preferredTrack` state to prioritize clips from selected/preferred tracks in video preview and split operations
- **Clip Selection Sets Preferred Track:** Selecting a clip automatically sets it as the preferred track for operations
- **Smart Split Function:** Split now respects selected clip's track, prioritizing selected track > preferred track > any clip
- **Fixed Merge Continuity:** Merge operations on master track now properly maintain continuity and update playback
- **Video Preview Priority:** Preview prioritizes master track clips over source tracks to match final output
- **Improved Transition Handling:** Better handling of video source switching between clips with proper loading states
- **Prevented Playback Loops:** Added logic to prevent timeline from looping back to beginning when clips end
- **Abort Error Handling:** Gracefully handles video abort errors when switching between clip sources
- **Files Updated:**
  - `src/store/timelineStore.ts` - Added `preferredTrack`, `setPreferredTrack()`, improved `combineClips()`
  - `src/components/VideoPreview.tsx` - Major playback continuity improvements, transition handling
  - `src/components/Timeline.tsx` - Added track label click handlers, clip selection sets preferred track
  - `src/components/TrimToolbar.tsx` - Updated split logic to respect selected/preferred tracks

### UI Refinements & Bug Fixes (January 2025) ✅
- **Reduced Timeline Heights:** Timeline and tracks made more compact (tracks: 65px, timeline: ~240px base)
- **Improved Text Positioning:** Moved track labels and clip text closer to top for better visibility
- **Toolbar Display Update:** Changed toolbar display from "Track Label [badge]" to "Track Label - Video Name" format
- **Removed Button-Style Badges:** Cleaned up toolbar by removing separate track label badges
- **Fixed Drop Zone Issues:** Removed blocking overlays that prevented dragging to Source Track 2+
- **Fixed JSON Parse Error:** Added validation to prevent errors when dropping non-JSON data on preview
- **Micro Tick Marks:** Added minor tick marks in timeline ruler for better granularity
- **Complete Grid Lines:** All vertical grid lines and playhead now extend properly through all tracks
- **Centered Playhead:** Playhead line properly centered under triangle indicator

### Dynamic Tracks & Smart Labels (January 2025) ✅
- **Infinite Track System:** Users can now create unlimited tracks by dragging videos below the last track
- **Automatic Track Creation:** Drop zone appears below all tracks to create new tracks dynamically
- **Smart Track Labels:** Tracks automatically labeled as "Screen Recording N" or "Camera Recording N" based on clip types
- **Track Display in Toolbar:** Shows current track for clip at playhead and selected clips
- **Vertical Scrolling:** Timeline scrolls vertically as tracks are added
- **Recording Type Tracking:** Screen and webcam recordings properly tracked and labeled
- **Files Updated:** 
  - `src/store/timelineStore.ts` - Added `numSourceTracks`, `getNextAvailableTrack()`, `ensureTrackExists()`, `getTrackLabel()`
  - `src/hooks/useRecording.ts` - Added `recordingType` tracking and assignment
  - `src/components/Timeline.tsx` - Added dynamic track rendering with new track drop zone
  - `src/components/TrimToolbar.tsx` - Added track label display for current/selected clips

### Master Track System & Video Trimming (Latest - January 2025)
- ✅ **Master Track System** - Green-themed output track (track 0) for final video
- ✅ **Source Tracks** - Blue-themed staging tracks (1, 2) for organizing clips
- ✅ **Clip Copy Behavior** - Dragging to master track creates a copy, original stays in source
- ✅ **New Clips Start at 0:00** - All new clips automatically positioned at beginning
- ✅ **Automatic Continuity** - Master track automatically prevents gaps between clips
- ✅ **Fixed Video Trimming** - Playback now correctly respects startTime and endTime trim points
- ✅ **Playhead Visualization** - Red line spans full timeline height through all tracks
- ✅ **Dynamic Zoom Timeline** - Timeline extends based on zoom level (30 min at 0.2x, etc.)
- ✅ **Optimized Track Heights** - 65px per track (reduced from 100px) for compact timeline while maintaining usability
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
