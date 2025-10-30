# ClipForge Memory Bank

**Last Updated:** January 2025  
**Project:** ClipForge Desktop Video Editor  
**Status:** Phase 6 Complete - Advanced Recording System with Device Selection & PiP

---

## Project Overview

ClipForge is a desktop video editor built with **Tauri (Rust + React)** that enables users to import, edit, record, and export videos. The app now features advanced recording capabilities with device selection and picture-in-picture (PiP) support.

### Key Technologies
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend:** Tauri 2.0 + Rust
- **Video Processing:** FFmpeg (via system installation)
- **Recording:** FFmpeg avfoundation (macOS native screen/webcam capture)
- **Platform:** macOS (primary), extensible to Windows/Linux

---

## Architecture & Key Decisions

### Why Tauri?
- **Native Performance:** Rust backend provides fast, memory-safe operations
- **Small Binary:** ~12MB compared to Electron's 100MB+
- **System Integration:** Direct access to file system, FFmpeg commands, native recording
- **Security:** Process isolation, capability-based security model

### State Management (Zustand)
- **Reason:** Simple, lightweight, no boilerplate
- **Structure:**
  - `timelineStore.ts` - Manages clips, playhead, zoom, playback state
  - Single store with clear action methods

### Recording Architecture
- **Native FFmpeg Recording:** Uses FFmpeg with avfoundation for hardware-accelerated capture
- **Device Enumeration:** Backend enumerates all screens, webcams, and audio devices
- **Three Recording Modes:**
  1. **Screen Only:** Records selected screen with audio
  2. **Webcam Only:** Records selected webcam with audio
  3. **Picture-in-Picture (PiP):** Records screen with webcam overlay (preview-only, recorded separately)
- **Device Selection:** Users can select specific screens and webcams from dropdowns
- **PiP Positioning:** Webcam overlay can be placed in any of 4 corners (top-left, top-right, bottom-left, bottom-right)
- **Preview Streams:** Browser MediaStream API provides live preview, FFmpeg handles actual recording
- **Auto-Save:** Recordings automatically saved to timeline after stopping

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
- ✅ File path system using Tauri's file.path property

### Phase 4-5: Recording & Polish ✅ (Complete)
- ✅ Recording UI with Screen/Webcam/PiP buttons
- ✅ RecordingControls component with duration timer
- ✅ useRecording hook with native Tauri commands
- ✅ Rust backend using FFmpeg for screen/webcam capture
- ✅ Recording saved to /tmp and added to timeline automatically
- ✅ Native macOS recording using avfoundation
- ✅ Split/Merge/Delete clip functionality
- ✅ Master track system with continuity
- ✅ Dynamic source tracks with smart labels
- ✅ Playback continuity between clips
- ✅ Professional UI with Lucide icons

### Phase 6: Advanced Recording System ✅ (Complete - January 2025)
- ✅ **Device Enumeration:** `list_devices` Tauri command to list all screens, webcams, and audio devices
- ✅ **Device Selection UI:** Dropdown menus to select specific screens and webcams
- ✅ **PiP Positioning:** 4-corner positioning system (top-left, top-right, bottom-left, bottom-right)
- ✅ **Multi-Device Support:** Handles multiple screens and multiple webcams
- ✅ **Smart Recording Indicator:** Automatically repositions to avoid overlapping with webcam overlay
- ✅ **Separate Stream Management:** Browser streams for preview, FFmpeg for recording
- ✅ **Recording Type Tracking:** `recordingType: 'screen' | 'webcam' | 'pip'`
- ✅ **Auto-Detection Removed:** Simplified to manual device selection for reliability
- ✅ **Clean State Management:** Functional updates to prevent state overwrites
- ✅ **Error Handling:** Comprehensive error handling with user-friendly messages

---

## Key Files & Their Purpose

### Core App Files
```
src/
├── App.tsx                 # Main layout, export button, recording integration
├── store/
│   └── timelineStore.ts    # Zustand state management
├── components/
│   ├── MediaLibrary.tsx    # Media import and library (compact sidebar)
│   ├── VideoPreview.tsx    # Video player with PiP overlay support
│   ├── Timeline.tsx        # Timeline tracks and clip arrangement
│   ├── TrimToolbar.tsx     # Editing tools (Split, Merge)
│   ├── RecordingControls.tsx  # Device selection and recording controls
│   └── ExportDialog.tsx    # Export functionality UI
├── hooks/
│   ├── useFileDrop.ts      # Drag & drop handler
│   └── useRecording.ts     # Recording state and device management
└── tauri.d.ts             # Tauri type definitions

src-tauri/
├── src/
│   └── main.rs            # Rust backend, FFmpeg commands, device enumeration
├── capabilities/
│   └── default.json       # Tauri permissions
└── Cargo.toml             # Rust dependencies
```

### Important Tauri Commands (Rust)
```rust
// Available commands in src-tauri/src/main.rs:
list_devices()             // Enumerate screens, webcams, and audio devices
start_recording(params)    // Start recording with device indices and type
  // params: {
  //   output_path: String,
  //   recording_type: "screen" | "webcam" | "pip",
  //   screen_index: Option<u32>,      // FFmpeg device index (4+ for screens)
  //   webcam_index: Option<u32>,      // FFmpeg device index (0-3 for webcams)
  //   pip_position: Option<String>,   // "top-left" | "top-right" | "bottom-left" | "bottom-right"
  //   pip_size: Option<String>        // Reserved for future use
  // }
stop_recording()           // Stop current recording and save file
is_recording()             // Check if recording is currently active
read_file_bytes(path)      // Read file content as bytes for blob creation
export_video(params)       // Trim and export clip to MP4
process_file(params)       // Save blob data to temp file, return path
check_ffmpeg()             // Verify FFmpeg installation
get_documents_path()       // Get user Documents directory
```

### Store Actions (Zustand)
```typescript
// Available actions in src/store/timelineStore.ts:
addClip(clip)                 // Add clip to timeline
removeClip(id)                // Remove clip
updateClip(id, updates)       // Update clip properties
setCurrentTime(time)          // Set playhead position
setIsPlaying(bool)            // Set playback state
splitClip(clipId, time)       // Split clip at specified time
combineClips(id1, id2)        // Merge two adjacent clips
setSelectedClips(ids)         // Set selected clip IDs
moveClip(clipId, pos, track)  // Move/reposition clip on timeline
setDraggingClipId(id)         // Track currently dragging clip
getMasterTrackClips()         // Get all clips on master track
ensureMasterTrackContinuity() // Reorder master track clips with no gaps
getNextAvailableTrack()       // Find next available empty track
ensureTrackExists(num)        // Ensure track exists by expanding if needed
getTrackLabel(num)            // Get smart track label
setPreferredTrack(track)      // Set preferred track for operations
```

### Recording Hook (useRecording)
```typescript
// Available from src/hooks/useRecording.ts:
const {
  isRecording,                    // Boolean: currently recording
  recordingType,                  // 'screen' | 'webcam' | 'pip' | null
  duration,                       // Recording duration in seconds
  error,                          // Error message if any
  previewStream,                  // MediaStream for preview
  availableDevices,               // DeviceInfo[] - all devices
  selectedScreenIndex,            // Currently selected screen index
  selectedWebcamIndex,            // Currently selected webcam index
  pipPosition,                    // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  startScreenRecording,           // Start screen recording
  startWebcamRecording,           // Start webcam recording
  startPictureInPictureRecording, // Start PiP recording
  stopRecording,                  // Stop current recording
  setSelectedScreenIndex,         // Select screen device
  setSelectedWebcamIndex,         // Select webcam device
  setPipPosition,                 // Set PiP corner position
} = useRecording();
```

### Timeline Data Structure
```typescript
interface Clip {
  id: string;                // Unique identifier
  name: string;              // Display name
  path: string;              // Real file system path for export
  blobUrl?: string;          // Blob URL for video preview (optional)
  duration: number;          // Total duration in seconds
  startTime: number;         // Trim start (seconds)
  endTime: number;           // Trim end (seconds)
  track: number;             // Timeline track (0 = master, 1+ = source tracks)
  position: number;          // Timeline position in seconds
  fileSize?: number;         // File size in bytes (for export estimation)
  recordingType?: 'screen' | 'webcam' | 'pip'; // Type of recording
}

interface DeviceInfo {
  index: number;             // FFmpeg device index
  name: string;              // Device name from FFmpeg
  device_type: 'screen' | 'webcam' | 'audio'; // Device type
}

type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
```

---

## Recording System Architecture

### Device Enumeration (FFmpeg)
```bash
# Backend runs this command to enumerate devices:
ffmpeg -f avfoundation -list_devices true -i ""

# Example output parsed:
# [0] MacBook Pro Camera          -> webcam
# [1] Andys iPhone Camera         -> webcam
# [4] Capture screen 0            -> screen
# [5] Capture screen 1            -> screen
# [0] MacBook Pro Microphone      -> audio
```

### Recording Flow
1. **Device Loading:**
   - App loads available devices via `list_devices` command
   - Devices populated in dropdown menus
   - User selects preferred screen/webcam

2. **Start Recording:**
   - User clicks "Screen", "Webcam", or "Screen + Webcam" button
   - Frontend requests browser MediaStream for preview (getDisplayMedia/getUserMedia)
   - Frontend invokes `start_recording` with selected device indices
   - Backend spawns FFmpeg process with avfoundation input
   - Preview stream displayed in VideoPreview component
   - Duration timer starts

3. **During Recording:**
   - FFmpeg captures to `/tmp/recording_[timestamp].mp4`
   - Preview plays in browser (separate from recording)
   - For PiP: Both screen and webcam streams shown with overlay
   - Recording indicator positioned to avoid webcam overlay

4. **Stop Recording:**
   - User clicks "Stop" button
   - Frontend invokes `stop_recording`
   - Backend sends SIGINT to FFmpeg process
   - FFmpeg finalizes video file
   - File read via `read_file_bytes` and converted to blob URL
   - Clip automatically added to timeline on next available track
   - All preview streams cleaned up

### FFmpeg Recording Commands

**Screen Recording:**
```bash
ffmpeg -f avfoundation -framerate 30 -i "[screen_index]:0" \
  -c:v libx264 -preset ultrafast -crf 23 \
  -c:a aac -b:a 128k output.mp4
```

**Webcam Recording:**
```bash
ffmpeg -f avfoundation -framerate 30 -video_size 1280x720 \
  -i "[webcam_index]:0" \
  -c:v libx264 -preset ultrafast -crf 23 \
  -c:a aac -b:a 128k output.mp4
```

**PiP Recording (Current):**
```bash
# Currently records screen only
# Webcam shown as overlay in preview but not composited into recording
# Future: Use filter_complex for true PiP compositing
ffmpeg -f avfoundation -framerate 30 -i "[screen_index]:0" \
  -c:v libx264 -preset ultrafast -crf 23 \
  -c:a aac -b:a 128k output.mp4
```

---

## Known Issues & Solutions

### Issue 1: Blob URLs vs File Paths ✅ FIXED
- **Problem:** Browser File API creates blob URLs, not file paths
- **Solution:** Implemented dual-path system
  - `blobUrl`: For instant preview in browser
  - `path`: Empty initially, generated on-demand for export
- **Implementation:** `process_file` Tauri command converts blob data to temp files
- **Status:** ✅ Fixed - Lazy path generation for performance

### Issue 2: Recording Not Starting ✅ FIXED
- **Problem:** Auto-detection of screens was unreliable, recordings would hang
- **Root Causes:**
  1. Browser labels for screens were inconsistent ("ClipForge" vs "Screen 0")
  2. Complex auto-detection logic had race conditions
  3. State updates were overwriting device selections
  4. Stale closures in useCallback dependencies
- **Solution:** Complete system rewrite with:
  - Manual device selection via dropdowns
  - `list_devices` command to enumerate all devices
  - Simplified recording flow with no auto-detection
  - Functional state updates to prevent overwrites
  - useRef for persistent device selections
- **Status:** ✅ Fixed - Recordings start reliably with device selection

### Issue 3: PiP Webcam Overlay Not Showing ✅ FIXED
- **Problem:** Webcam overlay wouldn't appear in PiP mode
- **Solution:** 
  - Separate MediaStream management for screen and webcam
  - Attached streams as custom properties (`__screenStream`, `__webcamStream`)
  - Dedicated `<video>` element with refs for webcam overlay
  - Dynamic positioning based on `pipPosition` state
  - Visual container with border to debug visibility
- **Status:** ✅ Fixed - Webcam overlay now displays correctly in all 4 corners

### Issue 4: Screen Selection Mismatch ✅ FIXED
- **Problem:** Selected screen in dropdown didn't match recorded screen
- **Solution:**
  - Removed unreliable auto-detection heuristics
  - Manual selection takes priority
  - Device indices passed directly to FFmpeg
  - `selectedScreenIndexRef` for immediate access in callbacks
- **Status:** ✅ Fixed - Selected screen always matches recording

---

## Recent Major Updates (January 2025)

### Advanced Recording System (Latest - January 2025) ✅
- **Complete Rewrite:** Rebuilt entire recording system from scratch
- **Device Enumeration:** New `list_devices` Tauri command enumerates all screens, webcams, and audio devices
- **Device Selection UI:** Dropdown menus for selecting specific screens and webcams
- **Three Recording Modes:**
  1. Screen-only recording with audio
  2. Webcam-only recording with audio
  3. Picture-in-picture with live preview (screen + webcam overlay)
- **PiP Positioning:** 4-corner positioning system (top-left, top-right, bottom-left, bottom-right)
- **Smart UI:** Recording indicator automatically repositions to avoid overlapping webcam
- **Robust State Management:** Functional updates prevent state overwrites
- **Simplified Flow:** Removed unreliable auto-detection in favor of manual selection
- **Error Handling:** Comprehensive error messages and graceful degradation
- **Files Updated:**
  - `src-tauri/src/main.rs` - New `list_devices` command, updated `start_recording`
  - `src/hooks/useRecording.ts` - Complete rewrite with device management
  - `src/components/RecordingControls.tsx` - New device selection UI
  - `src/components/VideoPreview.tsx` - PiP positioning support
  - `src/App.tsx` - Integration of new recording props

### Playback Continuity & Track Selection (January 2025) ✅
- **Seamless Clip Transitions:** Video playback automatically transitions between clips on same track
- **Track Label Clicking:** Clicking track labels moves playhead to first clip
- **Preferred Track System:** Prioritizes clips from selected/preferred tracks
- **Smart Split Function:** Respects selected clip's track
- **Files Updated:**
  - `src/store/timelineStore.ts`
  - `src/components/VideoPreview.tsx`
  - `src/components/Timeline.tsx`
  - `src/components/TrimToolbar.tsx`

### Dynamic Tracks & Smart Labels (January 2025) ✅
- **Infinite Track System:** Unlimited tracks via drag-below-last-track
- **Smart Track Labels:** Auto-labeled based on recording type
- **Vertical Scrolling:** Timeline scrolls as tracks are added
- **Files Updated:**
  - `src/store/timelineStore.ts`
  - `src/hooks/useRecording.ts`
  - `src/components/Timeline.tsx`

### Master Track System (January 2025) ✅
- **Green Master Track:** Final output track with automatic continuity
- **Blue Source Tracks:** Staging tracks for clip organization
- **Clip Copy Behavior:** Dragging to master creates copy, keeps original
- **Files Updated:**
  - `src/store/timelineStore.ts`
  - `src/components/Timeline.tsx`

---

## Development Workflow

### Running in Development
```bash
source "$HOME/.cargo/env"
npm run tauri:dev
```

### Building for Production
```bash
npm run tauri:build
```

### Output Location
- **Development binary:** `src-tauri/target/debug/clipforge`
- **Production .app:** `src-tauri/target/release/bundle/macos/clipforge.app`
- **App size:** ~12MB

---

## FFmpeg Usage

### Installation
```bash
brew install ffmpeg
```

### Export Command
```bash
ffmpeg -i INPUT -ss START -t DURATION \
  -c:v libx264 -c:a aac -preset medium -y OUTPUT
```

---

## Testing Checklist

### Recording System Testing
- [x] App lists available screens correctly
- [x] App lists available webcams correctly
- [x] Screen recording works with selected screen
- [x] Webcam recording works with selected webcam
- [x] PiP recording shows both streams in preview
- [x] PiP webcam overlay appears in all 4 corners
- [x] Recording indicator repositions to avoid overlap
- [x] Recordings save to timeline automatically
- [x] Device selection persists during recording session

### Core Functionality Testing
- [x] App launches from packaged .app
- [x] Import videos via drag & drop
- [x] Timeline displays imported clips
- [x] Preview plays imported video
- [x] Trim clip by adjusting start/end
- [x] Export to MP4 successfully
- [x] Split/Merge functionality works

---

## Next Steps (Future Enhancements)

### Short Term
1. True PiP recording with FFmpeg filter_complex (webcam composited into recording)
2. Add keyboard shortcuts (S for split, C for combine, etc.)
3. Webcam overlay on master track for export
4. Snap-to-grid functionality

### Long Term
1. Audio waveform visualization
2. Multiple clip export (concatenate)
3. Transitions and effects
4. Cross-platform support (Windows/Linux)

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
- **Launch Time:** <5 seconds
- **Timeline Performance:** Responsive with 10+ clips
- **Recording:** 30fps screen/webcam capture
- **Memory Usage:** <500MB baseline

---

## Git Configuration

### Repository Status
- Main branch: Up to date with origin
- Clean working tree
- MEMORY_BANK.md: Comprehensive project documentation

---

## Environment Setup

### Required Tools
- Node.js (v18+)
- Rust/Cargo (via `source "$HOME/.cargo/env"`)
- FFmpeg (via `brew install ffmpeg`)
- Tauri CLI (via `npm install -g @tauri-apps/cli`)

---

**Note:** This memory bank is kept up-to-date with major project changes. Last updated with Phase 6 - Advanced Recording System implementation.
