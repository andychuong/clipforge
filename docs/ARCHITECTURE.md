# ClipForge Architecture

## Overview

ClipForge is a desktop video editor built with a modern stack that combines web technologies with native performance. The application uses **Tauri** to bridge a React frontend with a Rust backend, enabling efficient file system operations and future FFmpeg integration.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Media        │  │ Video        │  │ Timeline    │     │
│  │ Library      │  │ Preview      │  │ Editor       │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │             │
│         └─────────────────┴─────────────────┘             │
│                           │                                │
│                    Zustand Store                         │
│                  (timelineStore.ts)                      │
└───────────────────────────┼───────────────────────────────┘
                            │ Tauri IPC
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Tauri + Rust)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  File System Operations                             │   │
│  │  Media Processing (Future: FFmpeg integration)    │   │
│  │  Export Pipeline                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **React 18** - UI framework with hooks and functional components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **Vite** - Fast build tool and dev server

### Backend
- **Tauri 2.0** - Cross-platform desktop framework
- **Rust** - Systems programming language (compiled to native binary)
- **FFmpeg** (Planned) - Video processing and encoding

### Build Tools
- **Cargo** - Rust package manager and build system
- **npm** - Node.js package manager

#### 5. MetadataPanel.tsx
**Purpose:** Display metadata for selected media files

**Features:**
- Shows video duration (formatted as MM:SS)
- Displays file size (KB, MB, GB)
- Shows video resolution (width x height)
- Empty state when no file is selected

**Props:**
```typescript
- selectedFile: MediaFile | null
```

#### 6. RecordingControls.tsx
**Purpose:** Recording interface and device selection

**Features:**
- Screen recording controls with device selection
- Webcam recording controls with camera selection
- Picture-in-Picture recording mode
- PiP position selector (top-left, top-right, bottom-left, bottom-right)
- Recording state display

**State Management:**
- Integrates with useRecording hook
- Manages device selection state

#### 7. TrimToolbar.tsx
**Purpose:** Editing tools and clip manipulation

**Features:**
- Split clip at playhead
- Add PiP overlay to master track clips
- Remove PiP overlay
- Combine adjacent clips
- Delete selected clips
- PiP overlay selection menu

**State Management:**
- Reads selected clips from store
- Updates clips with PiP overlay information

#### 8. ExportDialog.tsx
**Purpose:** Video export interface and processing

**Features:**
- Export settings display
- Progress indicator
- Error handling and display
- PiP overlay detection and composition
- FFmpeg integration via Tauri commands

## Component Architecture

### Core Components

#### 1. App.tsx
**Purpose:** Root component and layout manager

**Responsibilities:**
- Defines main application layout (sidebar, preview, timeline)
- Provides container structure for child components
- Coordinates overall UI organization
- Manages selected media file state for metadata panel

**Structure:**
```
┌─────────────────────────────────────────┐
│              Header (App Title)         │
├──────┬──────────────────────────────────┤
│      │                                   │
│      │          Video Preview           │
│ Lib  │          (Centered)               │
│      │                                   │
│      ├──────────────────────────────────┤
│      │           Metadata Panel          │
│      │         (Bottom Left)             │
│      ├──────────────────────────────────┤
│      │         Trim Toolbar              │
│      ├──────────────────────────────────┤
│      │         Timeline Editor           │
└──────┴──────────────────────────────────┘
```

#### 2. MediaLibrary.tsx
**Purpose:** Media file management and import

**Features:**
- Drag & drop file import from filesystem
- File picker button for alternative import
- Display imported files with metadata
- Remove clips from library
- Selection callback for metadata panel

**State Management:**
- Local state for media files array
- Integrates with global timeline store for adding clips
- Manages selected file state for metadata display

**Key Methods:**
```typescript
- handleExternalDrop(files: File[]): Import from filesystem
- Extract metadata (duration, width, height, file size)
- onFileSelect callback to parent component
- handleRemoveMedia(path): Remove from library
```

#### 3. VideoPreview.tsx
**Purpose:** Video playback and preview

**Features:**
- Playback controls (Play, Pause, Stop, Rewind)
- Real-time video preview based on playhead position
- Time display showing current position
- Drag & drop zone for adding clips to timeline
- Auto-sync with timeline playhead
- Volume control with mute/unmute
- Picture-in-Picture overlay display during playback
- Live preview during recording (screen, webcam, or both)

**State Management:**
- Watches `currentTime` from global store
- Updates video source and position based on timeline clips
- Controls playback state
- Manages PiP overlay video syncing

**Key Methods:**
```typescript
- handlePlayPause(): Toggle play/pause
- handleTimeUpdate(): Sync video time with timeline
- Auto-advance playhead when playing
- Sync PiP overlay video with main video
- Handle live recording preview streams
```

#### 4. Timeline.tsx
**Purpose:** Timeline editing interface

**Features:**
- Time ruler with dynamic markers
- Playhead indicator (red line)
- Multiple tracks (master track + source tracks)
- Drag & drop clips onto timeline
- Scrubbing (click to move playhead)
- Zoom controls
- Visual clip representation with color coding
- Trim handles (left/right edges of clips)
- PiP overlay indicator (purple icon on clips with overlays)

**State Management:**
- Reads clips array from global store
- Manages local drag/drop state
- Updates clip positions and trimming
- Tracks preferred track for playback priority

**Key Methods:**
```typescript
- handleDrop(e, track): Add clip to timeline
- handleTimelineClick(e): Move playhead
- handleTrim(clip, handle, position): Adjust clip boundaries
- Visual indicator for clips with PiP overlays
```

## State Management

### Zustand Store (timelineStore.ts)

**Central State:**
```typescript
interface TimelineState {
  clips: Clip[];           // Array of timeline clips
  currentTime: number;     // Playhead position (seconds)
  zoomLevel: number;       // Timeline zoom factor
  isPlaying: boolean;       // Playback state
}
```

**Clip Interface:**
```typescript
interface Clip {
  id: string;              // Unique identifier
  name: string;            // Display name
  path: string;            // Video file URL/path (or blob URL)
  blobUrl?: string;        // Blob URL for browser playback
  duration: number;        // Full clip duration (seconds)
  startTime: number;       // Trim start (seconds)
  endTime: number;         // Trim end (seconds)
  track: number;           // Track number (0 = master, 1+ = source tracks)
  position: number;        // Timeline position (seconds)
  recordingType?: 'screen' | 'webcam' | 'pip'; // Type of recording
  pipOverlayClipId?: string; // Reference to webcam clip for PiP overlay
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fileSize?: number;       // File size in bytes
}
```

**State Actions:**
- `addClip(clip)` - Add new clip to timeline
- `removeClip(id)` - Remove clip from timeline
- `updateClip(id, updates)` - Update clip properties
- `setCurrentTime(time)` - Move playhead
- `setZoomLevel(zoom)` - Adjust timeline zoom
- `setIsPlaying(playing)` - Control playback
- `setTrimPoints(clipId, start, end)` - Set trim boundaries
- `splitClip(clipId, splitTime)` - Split clip at specified time
- `combineClips(clipId1, clipId2)` - Combine two adjacent clips
- `moveClip(clipId, newPosition, newTrack)` - Move clip on timeline
- `setSelectedClips(clipIds)` - Select clips for editing

## Data Flow

### Import Flow
```
User drags file
    ↓
MediaLibrary.handleExternalDrop()
    ↓
Parse file and extract metadata
    ↓
Create blob URL (URL.createObjectURL)
    ↓
Add to mediaFiles state
    ↓
Option A: Click T1/T2 button
Option B: Drag to Timeline
    ↓
Timeline.handleDrop()
    ↓
timelineStore.addClip()
    ↓
Clips array updated
    ↓
All components re-render with new clip
```

### Playback Flow
```
User clicks play
    ↓
timelineStore.setIsPlaying(true)
    ↓
VideoPreview detects state change
    ↓
Video element starts playing
    ↓
Interval updates currentTime (every 100ms)
    ↓
timelineStore.setCurrentTime(newTime)
    ↓
Timeline playhead moves
    ↓
Preview shows correct frame
```

### Scrubbing Flow
```
User clicks timeline
    ↓
Timeline.handleTimelineClick()
    ↓
Calculate time from mouse position
    ↓
timelineStore.setCurrentTime(time)
    ↓
VideoPreview detects time change
    ↓
Update video.currentTime
    ↓
Preview shows new frame
```

### Zoom Flow
```
User clicks zoom in or zoom out button
    ↓
Timeline button handler
    ↓
timelineStore.setZoomLevel(newZoom)
    ↓
Markers recalculated
    ↓
Clips resized on timeline
    ↓
Pixel-to-time ratio updated
```

## File Structure

```
clipforge/
├── src/                          # Frontend source
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   ├── components/               # React components
│   │   ├── MediaLibrary.tsx      # Media import UI
│   │   ├── VideoPreview.tsx      # Video player
│   │   └── Timeline.tsx          # Timeline editor
│   ├── store/
│   │   └── timelineStore.ts       # Zustand state
│   ├── hooks/
│   │   └── useFileDrop.ts        # File drop hook
│   └── styles/
│       └── index.css              # Global styles
│
├── src-tauri/                     # Backend source
│   ├── src/
│   │   └── main.rs                # Tauri entry point
│   ├── Cargo.toml                 # Rust dependencies
│   └── tauri.conf.json            # Tauri config
│
├── index.html                     # HTML entry
├── vite.config.ts                 # Vite config
├── tailwind.config.js             # Tailwind config
├── tsconfig.json                  # TypeScript config
├── package.json                   # Node dependencies
└── dev.sh                         # Dev helper script
```

## Key Design Decisions

### 1. Zustand for State Management
**Why:** Lightweight alternative to Redux, easy to use with hooks, minimal boilerplate.

**Benefits:**
- Simple API for reading/updating state
- TypeScript support out of the box
- Component re-renders are optimized automatically

### 2. Blob URLs for Video Files
**Why:** `URL.createObjectURL()` creates in-memory references without copying file data.

**Benefits:**
- Efficient memory usage
- No need to copy files to temp directory
- Fast file handling

### 3. Timeline Rendering Approach
**Why:** DOM-based rendering with absolute positioning for clips.

**Benefits:**
- Fast to implement and iterate
- Easy to debug with browser DevTools
- Sufficient performance for MVP

**Trade-offs:**
- For 100+ clips, might need virtualization
- Canvas rendering would be faster but more complex

### 4. Component Structure
**Why:** Simple structure with minimal nesting.

**Benefits:**
- Easy to understand
- Quick to implement features
- Can refactor easily when needed

### 5. Tauri IPC Separation
**Why:** Keeps React components focused on UI.

**Current Implementation:**
- File operations via `process_file` command
- FFmpeg integration for export (`export_video`, `export_video_with_pip`)
- Screen/webcam recording via `start_recording` and `stop_recording`
- Device enumeration via `list_devices`

**Future Enhancements:**
- Project save/load functionality
- Batch export operations
- Advanced video effects

## Development Workflow

### Running in Development
```bash
# Load Rust environment
source "$HOME/.cargo/env"

# Start dev server
npm run tauri dev
```

**What happens:**
1. Vite starts on port 1420
2. Hot reload for React code
3. Cargo compiles Rust backend
4. Tauri window opens with app

### Building for Production
```bash
npm run tauri build
```

**Output:** `src-tauri/target/release/clipforge.app` (macOS)

### File Processing Pipeline
```
1. User drops file
2. Browser creates blob URL
3. Video element loads metadata
4. Extract duration
5. Add to media library
6. User adds to timeline
7. Preview renders from blob URL
8. Export (future): FFmpeg processes files
```

## Recording Architecture

### Screen Recording
**Implementation:**
- Native FFmpeg screen capture using `avfoundation` on macOS
- Device index selection for multiple screens
- Real-time preview using `getDisplayMedia()` API
- Output saved directly to file system

**Tauri Command:**
```rust
#[tauri::command]
async fn start_recording(params: StartRecordingParams) -> Result<String, String>
```

**Flow:**
```
1. User selects screen from dropdown
2. Frontend requests screen share for preview
3. Backend starts FFmpeg process with selected device index
4. Recording saved to temp file
5. On stop, file path returned to frontend
6. Clip automatically added to timeline
```

### Webcam Recording
**Implementation:**
- Native FFmpeg webcam capture using `avfoundation`
- Device index selection for multiple cameras
- Real-time preview using `getUserMedia()` API
- Audio capture included

### Picture-in-Picture Recording
**Implementation:**
- Simultaneous screen and webcam capture
- FFmpeg `filter_complex` for real-time compositing
- Webcam scaled to 320x240 and positioned based on user selection
- Single output file with overlay already applied
- Live preview shows both streams synchronized

**FFmpeg Command Structure:**
```
ffmpeg -f avfoundation -i "screen_index:audio_index" 
       -f avfoundation -i "webcam_index:audio_index"
       -filter_complex "[1:v]scale=320:240[webcam];
                        [0:v][webcam]overlay=x:y[v]"
       -map "[v]" -map 0:a
       -c:v libx264 -c:a aac output.mp4
```

## Export Architecture

### Export Pipeline
**Tauri Commands:**
- `export_video(params)` - Export single clip with trim points
- `export_video_with_pip(params)` - Export with PiP overlay composition

**Flow:**
```
1. User clicks Export button
2. Frontend collects clips from master track
3. For each clip:
   - Check if PiP overlay is configured
   - If PiP: Call export_video_with_pip with overlay info
   - Otherwise: Call export_video
4. FFmpeg processes clips with trim points
5. Progress updates sent to frontend
6. Completion dialog shows output path
```

### PiP Export
**Implementation:**
- Detects `pipOverlayClipId` on master track clips
- Loads both main video and overlay video
- Uses FFmpeg `filter_complex` to composite overlay
- Applies trim points to both videos
- Positions overlay based on `pipPosition` setting

## Performance Considerations

### Current Optimizations
1. **Blob URLs** - Efficient file references
2. **Local State** - Minimize store updates
3. **Event Delegation** - Reduced event listeners

### Future Optimizations
1. **Virtual Scrolling** - For 50+ clips on timeline
2. **Thumbnail Generation** - Use FFmpeg to generate thumbnails
3. **Lazy Loading** - Load video data only when needed
4. **Worker Threads** - Move heavy processing to workers
5. **Memoization** - Use React.memo() for expensive components

## Security Considerations

### Current
- File handling uses browser APIs (sandboxed)
- No arbitrary file system access
- Tauri security model enforced

### Future (when adding Tauri commands)
- Validate file paths (prevent directory traversal)
- Sanitize user input in FFmpeg commands
- Check file permissions before operations
- Use Tauri's capability system for file access

## Testing Strategy

### Manual Testing (Current)
- Test drag & drop with various file types
- Verify timeline playback accuracy
- Check zoom and scroll behavior
- Test trim handles

### Automated Testing (Future)
- Unit tests for utility functions
- Integration tests for state management
- E2E tests with Playwright
- FFmpeg command validation tests

## Known Limitations

1. **No multi-track audio sync** - Tracks 1 and 2 are rendered separately
2. **No transitions** - Cuts only, no crossfades
3. **Memory usage** - All video data kept in memory (fine for MVP)
4. **Export quality** - Will use default FFmpeg settings initially
5. **No undo/redo** - State changes are immediate

## Troubleshooting

### Common Issues

**Drag & Drop Not Working:**
- Check browser console for errors
- Verify file is valid video format
- Try using file picker button instead

**Timeline Clips Not Visible:**
- Check zoom level (might be too zoomed in)
- Verify clip is within visible time range
- Check that clip.track is 1 or 2

**Preview Not Playing:**
- Check isPlaying state in DevTools
- Verify video source is valid
- Check that clip exists at currentTime

**Build Fails:**
- Clean cargo cache: `cd src-tauri && cargo clean`
- Check Rust version: `rustc --version`
- Verify dependencies: `npm install`

---

**Document Version:** 2.0  
**Last Updated:** January 2025  
**Status:** Active Development

