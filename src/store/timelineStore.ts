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
}

interface TimelineState {
  clips: Clip[];
  currentTime: number;
  zoomLevel: number;
  isPlaying: boolean;
  selectedClips: string[];
  draggingClipId: string | null;
  
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
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  clips: [],
  currentTime: 0,
  zoomLevel: 1,
  isPlaying: false,
  selectedClips: [],
  draggingClipId: null,

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
      if (Math.abs(clip1.position + clip1.endTime - clip1.startTime - clip2.position) > 0.1) {
        return state;
      }

      // Create combined clip
      const combinedClip: Clip = {
        ...clip1,
        endTime: clip1.endTime + (clip2.endTime - clip2.startTime),
      };

      const newClips = state.clips.filter((c) => c.id !== clipId1 && c.id !== clipId2);
      newClips.push(combinedClip);

      return { clips: newClips };
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
}));

