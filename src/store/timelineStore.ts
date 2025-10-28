import { create } from 'zustand';

export interface Clip {
  id: string;
  name: string;
  path: string;
  duration: number; // in seconds
  startTime: number; // trim start in seconds
  endTime: number; // trim end in seconds
  track: number;
  position: number; // position on timeline in seconds
}

interface TimelineState {
  clips: Clip[];
  currentTime: number;
  zoomLevel: number;
  isPlaying: boolean;
  
  addClip: (clip: Omit<Clip, 'id'>) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  setCurrentTime: (time: number) => void;
  setZoomLevel: (zoom: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setTrimPoints: (clipId: string, start: number, end: number) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  clips: [],
  currentTime: 0,
  zoomLevel: 1,
  isPlaying: false,

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
}));

