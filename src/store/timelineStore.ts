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
}

export const useTimelineStore = create<TimelineState>((set) => ({
  clips: [],
  currentTime: 0,
  zoomLevel: 1,
  isPlaying: false,
  selectedClips: [],

  addClip: (clip) =>
    set((state) => ({
      clips: [
        ...state.clips,
        { ...clip, id: `clip-${Date.now()}-${Math.random()}` },
      ],
    })),

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
}));

