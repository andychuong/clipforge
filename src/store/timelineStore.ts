import { create } from 'zustand';

export interface Clip {
  id: string;
  name: string;
  path: string; // Real file system path for export
  blobUrl?: string; // Blob URL for video preview (optional for backward compatibility)
  duration: number; // in seconds
  startTime: number; // trim start in seconds
  endTime: number; // trim end in seconds
  track: number;
  position: number; // position on timeline in seconds
  fileSize?: number; // File size in bytes (optional, for export estimation)
  recordingType?: 'screen' | 'webcam' | 'pip'; // Type of recording if it's a recording
  pipOverlayClipId?: string; // If this master track clip has a PiP overlay, reference the webcam clip ID
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; // PiP overlay position
}

interface TimelineState {
  clips: Clip[];
  currentTime: number;
  zoomLevel: number;
  isPlaying: boolean;
  selectedClips: string[];
  draggingClipId: string | null;
  numSourceTracks: number;
  preferredTrack: number | null; // Track to prioritize when finding clip
  
  addClip: (clip: Omit<Clip, 'id'>) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  setCurrentTime: (time: number) => void;
  setZoomLevel: (zoom: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setTrimPoints: (clipId: string, start: number, end: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  combineClips: (clipId1: string, clipId2: string) => void;
  setSelectedClips: (clips: string[]) => void;
  moveClip: (clipId: string, newPosition: number, newTrack: number) => void;
  setDraggingClipId: (id: string | null) => void;
  getMasterTrackClips: () => Clip[];
  ensureMasterTrackContinuity: () => void;
  getNextAvailableTrack: () => number;
  ensureTrackExists: (trackNumber: number) => void;
  getTrackLabel: (trackNumber: number) => string;
  setPreferredTrack: (track: number | null) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  clips: [],
  currentTime: 0,
  zoomLevel: 1,
  isPlaying: false,
  selectedClips: [],
  draggingClipId: null,
  numSourceTracks: 2, // Start with 2 source tracks
  preferredTrack: null, // No preferred track by default

  addClip: (clip) =>
    set((state) => {
      // If no clips exist on the specified track, start at 0:00
      // Otherwise, find the end of the last clip on that track
      const tracksClips = state.clips.filter(c => c.track === clip.track);
      let position = 0;
      
      if (tracksClips.length > 0) {
        // Find the last clip position on this track
        const lastClip = tracksClips.reduce((latest, current) => 
          current.position > latest.position ? current : latest
        );
        // If track 0 (master track), append to the end with no gap
        if (clip.track === 0) {
          position = lastClip.position + (lastClip.endTime - lastClip.startTime);
        } else {
          // For source tracks, use the provided position or default to 0
          position = clip.position;
        }
      }
      
      return {
        clips: [
          ...state.clips,
          { ...clip, position, id: `clip-${Date.now()}-${Math.random()}` },
        ],
      };
    }),

  removeClip: (id) =>
    set((state) => ({
      clips: state.clips.filter((clip) => clip.id !== id),
    })),

  updateClip: (id, updates) =>
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === id ? { ...clip, ...updates } : clip
      ),
    })),

  setCurrentTime: (time) => set({ currentTime: time }),

  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setTrimPoints: (clipId, start, end) =>
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId ? { ...clip, startTime: start, endTime: end } : clip
      ),
    })),

  splitClip: (clipId, splitTime) =>
    set((state) => {
      const clipIndex = state.clips.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return state;

      const clip = state.clips[clipIndex];
      const offset = splitTime - clip.position;

      // Create two new clips from the original
      const firstClip: Clip = {
        ...clip,
        endTime: clip.startTime + offset,
      };

      const secondClip: Clip = {
        ...clip,
        id: `clip-${Date.now()}-${Math.random()}`,
        startTime: clip.startTime + offset,
        position: splitTime,
      };

      const newClips = [...state.clips];
      newClips[clipIndex] = firstClip;
      newClips.splice(clipIndex + 1, 0, secondClip);

      return { clips: newClips };
    }),

  combineClips: (clipId1, clipId2) =>
    set((state) => {
      const clip1Index = state.clips.findIndex((c) => c.id === clipId1);
      const clip2Index = state.clips.findIndex((c) => c.id === clipId2);

      if (clip1Index === -1 || clip2Index === -1) return state;
      if (clip1Index === clip2Index) return state;

      const clip1 = state.clips[clip1Index];
      const clip2 = state.clips[clip2Index];

      // Only combine if same track and adjacent
      if (clip1.track !== clip2.track) return state;
      const clip1Duration = clip1.endTime - clip1.startTime;
      if (Math.abs(clip1.position + clip1Duration - clip2.position) > 0.1) {
        return state;
      }

      // Create combined clip - use clip1's path/blobUrl, extend endTime
      // Calculate total duration: clip1's trimmed duration + clip2's trimmed duration
      const clip2Duration = clip2.endTime - clip2.startTime;
      const combinedClip: Clip = {
        ...clip1,
        // Keep clip1's startTime, extend endTime by clip2's duration
        endTime: clip1.endTime + clip2Duration,
        // Position stays at clip1's position
        position: clip1.position,
      };

      const newClips = state.clips.filter((c) => c.id !== clipId1 && c.id !== clipId2);
      newClips.push(combinedClip);

      const result = { clips: newClips };
      
      // If merging on master track, ensure continuity after merge
      if (clip1.track === 0) {
        // Use setTimeout to ensure state is updated first
        setTimeout(() => {
          get().ensureMasterTrackContinuity();
        }, 0);
      }

      return result;
    }),

  setSelectedClips: (clips) => set({ selectedClips: clips }),

  moveClip: (clipId, newPosition, newTrack) =>
    set((state) => {
      const originalClip = state.clips.find((clip) => clip.id === clipId);
      if (!originalClip) return state;
      
      // If moving to master track (0), create a copy
      if (newTrack === 0 && originalClip.track !== 0) {
        const newClip = {
          ...originalClip,
          id: `clip-${Date.now()}-${Math.random()}`,
          position: newPosition,
          track: newTrack,
        };
        return { clips: [...state.clips, newClip] };
      }
      
      // Otherwise, just move the clip
      const clips = state.clips.map((clip) =>
        clip.id === clipId ? { ...clip, position: newPosition, track: newTrack } : clip
      );
      return { clips };
    }),

  setDraggingClipId: (id) => set({ draggingClipId: id }),

  getMasterTrackClips: () => {
    return get().clips.filter((clip) => clip.track === 0).sort((a, b) => a.position - b.position);
  },

  ensureMasterTrackContinuity: () =>
    set((state) => {
      const masterClips = state.clips
        .filter((clip) => clip.track === 0)
        .sort((a, b) => a.position - b.position);

      if (masterClips.length === 0) return state;

      // Ensure first clip starts at 0:00
      const updatedClips = [...state.clips];
      let currentPosition = 0;

      masterClips.forEach((clip) => {
        const clipIndex = updatedClips.findIndex((c) => c.id === clip.id);
        if (clipIndex !== -1) {
          updatedClips[clipIndex] = { ...clip, position: currentPosition };
          currentPosition += clip.endTime - clip.startTime;
        }
      });

      return { clips: updatedClips };
    }),

  getNextAvailableTrack: () => {
    const state = get();
    // Find the highest used track number (excluding master track 0)
    const usedTracks = state.clips
      .filter(clip => clip.track > 0)
      .map(clip => clip.track);
    
    if (usedTracks.length === 0) return 1;
    
    // Find first unused track or return next track number
    for (let i = 1; i <= state.numSourceTracks; i++) {
      if (!usedTracks.includes(i)) return i;
    }
    
    // All tracks used, create a new one
    const newTrackNumber = state.numSourceTracks + 1;
    set({ numSourceTracks: newTrackNumber });
    return newTrackNumber;
  },

  ensureTrackExists: (trackNumber) => {
    const state = get();
    if (trackNumber > state.numSourceTracks) {
      set({ numSourceTracks: trackNumber });
    }
  },

  getTrackLabel: (trackNumber) => {
    const state = get();
    // Find clips on this track
    const trackClips = state.clips.filter(clip => clip.track === trackNumber);
    
    if (trackClips.length === 0) {
      return `Source Track ${trackNumber}`;
    }
    
    // Check if all clips are screen recordings
    const allScreenRecordings = trackClips.every(clip => clip.recordingType === 'screen');
    if (allScreenRecordings) {
      return `Screen Recording ${trackNumber}`;
    }
    
    // Check if all clips are webcam recordings
    const allWebcamRecordings = trackClips.every(clip => clip.recordingType === 'webcam');
    if (allWebcamRecordings) {
      return `Camera Recording ${trackNumber}`;
    }
    
    // Mixed or no recording type
    return `Source Track ${trackNumber}`;
  },

  setPreferredTrack: (track) => set({ preferredTrack: track }),
}));

