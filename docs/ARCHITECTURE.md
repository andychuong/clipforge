# ClipForge Architecture

## Overview

ClipForge is a desktop video editor built with a modern stack that combines web technologies with native performance. The application uses **Tauri** to bridge a React frontend with a Rust backend, enabling efficient file system operations and future FFmpeg integration.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Media        │  │ Video        │  │ Timeline    │     │
│  │ Library      │  │ Preview      │  │ Editor      │     │
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

## Component Architecture

### Core Components

#### 1. App.tsx
**Purpose:** Root component and layout manager

**Responsibilities:**
- Defines main application layout (sidebar, preview, timeline)
- Provides container structure for child components
- Coordinates overall UI organization

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
│      │         Timeline Editor           │
└──────┴──────────────────────────────────┘
```

#### 2. MediaLibrary.tsx
**Purpose:** Media file management and import

**Features:**
- Drag & drop file import from filesystem
- File picker button for alternative import
- Display imported files with metadata
- Track buttons (T1/T2) for quick timeline placement
- Remove clips from library

**State Management:**
- Local state for media files array
- Integrates with global timeline store for adding clips

**Key Methods:**
```typescript
- handleExternalDrop(files: File[]): Import from filesystem
- Add to Track 1/2: Quick placement on timeline
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

**State Management:**
- Watches `currentTime` from global store
- Updates video source and position based on timeline clips
- Controls playback state

**Key Methods:**
```typescript
- handlePlayPause(): Toggle play/pause
- handleTimeUpdate(): Sync video time with timeline
- Auto-advance playhead when playing
```

#### 4. Timeline.tsx
**Purpose:** Timeline editing interface

**Features:**
- Time ruler with dynamic markers
- Playhead indicator (red line)
- Two tracks (Track 1 and Track 2)
- Drag & drop clips onto timeline
- Scrubbing (click to move playhead)
- Zoom controls (🔍− / 🔍+)
- Visual clip representation
- Trim handles (left/right edges of clips)

**State Management:**
- Reads clips array from global store
- Manages local drag/drop state
- Updates clip positions and trimming

**Key Methods:**
```typescript
- handleDrop(e, track): Add clip to timeline
- handleTimelineClick(e): Move playhead
- handleTrim(clip, handle, position): Adjust clip boundaries
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
  path: string;            // Video file URL/path
  duration: number;        // Full clip duration (seconds)
  startTime: number;       // Trim start (seconds)
  endTime: number;         // Trim end (seconds)
  track: number;           // Track number (1 or 2)
  position: number;        // Timeline position (seconds)
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
User clicks 🔍+ or 🔍−
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

**Current:** Frontend-only (no Tauri commands yet)
**Future:** Will add Tauri commands for:
- File operations (save/load projects)
- FFmpeg integration (export)
- System APIs (screen recording)

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

## Future Architecture Considerations

### Phase 3: Trim Functionality
**Implementation:**
- Add visual trim handles to clips
- Update `startTime` and `endTime` on drag
- Preview reflects trim points immediately
- Export applies trim points via FFmpeg filters

### Phase 4: Export Pipeline
**Tauri Command:**
```rust
#[tauri::command]
fn export_timeline(clips: Vec<Clip>, output_path: String) -> Result<(), String> {
    // Build FFmpeg command
    // Process each clip with trim points
    // Concatenate clips
    // Encode to MP4
    // Save to output path
}
```

**Flow:**
```
1. Collect all clips from timeline store
2. Call Tauri command with clip data
3. Rust builds FFmpeg command string
4. Execute FFmpeg process
5. Stream progress updates to frontend
6. Show completion dialog
```

### Phase 5: Recording Features
**Screen Recording:**
- Use `navigator.mediaDevices.getDisplayMedia()`
- Record MediaStream to blob
- Save as temporary file
- Add to media library automatically

**Webcam Recording:**
- Use `navigator.mediaDevices.getUserMedia()`
- Similar pipeline to screen recording
- Future: Combine for PiP effect

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

**Document Version:** 1.0  
**Last Updated:** October 27, 2024  
**Status:** Active Development

