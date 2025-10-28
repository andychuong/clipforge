import { useTimelineStore } from '../store/timelineStore';
import { Scissors, Merge, Trash2 } from 'lucide-react';

export default function TrimToolbar() {
  const { clips, currentTime, splitClip, combineClips, removeClip, selectedClips, setSelectedClips } = useTimelineStore();

  // Find the clip at the current playhead position
  const clipAtPlayhead = clips.find((clip) => 
    currentTime >= clip.position + clip.startTime &&
    currentTime <= clip.position + clip.endTime
  );

  // Find adjacent clips for combining
  const getAdjacentClip = () => {
    if (!selectedClips || selectedClips.length !== 1) return null;

    const selectedClip = clips.find((c) => c.id === selectedClips[0]);
    if (!selectedClip) return null;

    // Find the next adjacent clip on the same track
    const adjacentClip = clips
      .filter((c) => c.track === selectedClip.track && c.id !== selectedClip.id)
      .find((c) => Math.abs(c.position - (selectedClip.position + (selectedClip.endTime - selectedClip.startTime))) < 0.5);

    return adjacentClip;
  };

  const handleSplit = () => {
    if (!clipAtPlayhead) return;
    splitClip(clipAtPlayhead.id, currentTime);
  };

  const handleCombine = () => {
    if (!selectedClips || selectedClips.length !== 1) return;

    const adjacentClip = getAdjacentClip();
    if (!adjacentClip) return;

    combineClips(selectedClips[0], adjacentClip.id);
    setSelectedClips([]);
  };

  const handleDelete = () => {
    if (!selectedClips || selectedClips.length === 0) return;
    
    selectedClips.forEach(clipId => {
      removeClip(clipId);
    });
    setSelectedClips([]);
  };

  const canSplit = clipAtPlayhead !== undefined;
  const canCombine = selectedClips && selectedClips.length === 1 && getAdjacentClip() !== null;
  const canDelete = selectedClips && selectedClips.length > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-t border-gray-700 border-b">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tools</div>
      
      <div className="h-6 w-px bg-gray-700" />
      
      <button
        onClick={handleSplit}
        disabled={!canSplit}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-all"
        title="Split clip at playhead (S)"
      >
        <Scissors className="h-4 w-4" />
        Split
      </button>

      <button
        onClick={handleCombine}
        disabled={!canCombine}
        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-all"
        title="Combine selected clip with adjacent clip (C)"
      >
        <Merge className="h-4 w-4" />
        Merge
      </button>

      <div className="h-6 w-px bg-gray-700" />

      <button
        onClick={handleDelete}
        disabled={!canDelete}
        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-all"
        title="Delete selected clip(s) (Delete key)"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      <div className="flex-1" />

      <div className="text-xs text-gray-500 flex items-center gap-3">
        {clipAtPlayhead && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="truncate max-w-xs">{clipAtPlayhead.name}</span>
          </div>
        )}
        {selectedClips && selectedClips.length > 0 && (
          <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
            {selectedClips.length} selected
          </span>
        )}
      </div>
    </div>
  );
}

