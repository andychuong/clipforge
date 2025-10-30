import { useState, useEffect, useRef } from 'react';
import { useTimelineStore, useTimelineStore as timelineStore } from '../store/timelineStore';
import { Scissors, Merge, Trash2, Video, X } from 'lucide-react';
import type { PipPosition } from '../hooks/useRecording';

export default function TrimToolbar() {
  const { clips, currentTime, splitClip, combineClips, removeClip, selectedClips, setSelectedClips, getTrackLabel, preferredTrack, updateClip } = useTimelineStore();
  const [showPipMenu, setShowPipMenu] = useState(false);
  const pipMenuRef = useRef<HTMLDivElement>(null);
  
  // Close PiP menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pipMenuRef.current && !pipMenuRef.current.contains(event.target as Node)) {
        setShowPipMenu(false);
      }
    };
    
    if (showPipMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPipMenu]);

  // Find the clip at the current playhead position
  // Priority: selected clip's track, then preferred track, then any clip
  let clipAtPlayhead = null;
  
  // First, check if there's a selected clip and prioritize its track
  if (selectedClips && selectedClips.length > 0) {
    const selectedClip = clips.find((c) => c.id === selectedClips[0]);
    if (selectedClip) {
      // Find any clip on the selected clip's track at the playhead position
      clipAtPlayhead = clips.find((clip) => 
        clip.track === selectedClip.track &&
        currentTime >= clip.position + clip.startTime &&
        currentTime <= clip.position + clip.endTime
      );
    }
  }
  
  // If no clip from selected track, try preferred track
  if (!clipAtPlayhead && preferredTrack !== null) {
    clipAtPlayhead = clips.find((clip) => 
      clip.track === preferredTrack &&
      currentTime >= clip.position + clip.startTime &&
      currentTime <= clip.position + clip.endTime
    );
  }
  
  // If no clip on preferred track, find any clip
  if (!clipAtPlayhead) {
    clipAtPlayhead = clips.find((clip) => 
      currentTime >= clip.position + clip.startTime &&
      currentTime <= clip.position + clip.endTime
    );
  }

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

  // Find webcam clips that can be used as PiP overlays
  const webcamClips = clips.filter(c => c.recordingType === 'webcam' || c.recordingType === 'pip');
  
  // Check if selected clip is on master track and can have PiP
  const selectedMasterClip = selectedClips && selectedClips.length === 1 
    ? clips.find(c => c.id === selectedClips[0] && c.track === 0)
    : null;
  const canAddPip = selectedMasterClip !== null && webcamClips.length > 0;
  const hasPip = selectedMasterClip?.pipOverlayClipId !== undefined;

  const handleSetPipOverlay = (webcamClipId: string, position: PipPosition) => {
    if (!selectedMasterClip) {
      console.error('❌ Cannot add PiP: No master track clip selected');
      return;
    }
    
    console.log('✅ Adding PiP overlay:', {
      masterClip: selectedMasterClip.name,
      webcamClipId,
      position,
    });
    
    updateClip(selectedMasterClip.id, {
      pipOverlayClipId: webcamClipId,
      pipPosition: position,
    });
    
    // Verify the update happened after state update
    setTimeout(() => {
      const state = timelineStore.getState();
      const updatedClip = state.clips.find(c => c.id === selectedMasterClip.id);
      const webcamClip = state.clips.find(c => c.id === webcamClipId);
      
      console.log('📋 Updated clip:', {
        name: updatedClip?.name,
        pipOverlayClipId: updatedClip?.pipOverlayClipId,
        pipPosition: updatedClip?.pipPosition,
      });
      
      if (updatedClip?.pipOverlayClipId) {
        console.log(`✅ PiP overlay successfully added to "${updatedClip.name}" with "${webcamClip?.name}" at ${position}`);
        // Show visual feedback
        alert(`✅ PiP Overlay Added!\n\nMain Video: ${updatedClip.name}\nWebcam: ${webcamClip?.name}\nPosition: ${position.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ')}`);
      } else {
        console.error('❌ Update failed - pipOverlayClipId is still undefined');
      }
    }, 100);
    
    setShowPipMenu(false);
  };

  const handleRemovePipOverlay = () => {
    if (!selectedMasterClip) return;
    updateClip(selectedMasterClip.id, {
      pipOverlayClipId: undefined,
      pipPosition: undefined,
    });
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

      <div className="h-6 w-px bg-gray-700" />

      {/* PiP Overlay Controls */}
      {hasPip && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">PiP:</span>
          <span className="text-xs text-gray-300">{clips.find(c => c.id === selectedMasterClip?.pipOverlayClipId)?.name || 'Webcam'}</span>
          <button
            onClick={handleRemovePipOverlay}
            className="p-1 text-gray-400 hover:text-white rounded"
            title="Remove PiP overlay"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      {canAddPip && !hasPip && (
        <div className="relative">
          <button
            onClick={() => setShowPipMenu(!showPipMenu)}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 text-sm font-medium transition-all"
            title="Add webcam as PiP overlay"
          >
            <Video className="h-4 w-4" />
            Add PiP
          </button>
          
          {showPipMenu && (
            <div ref={pipMenuRef} className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-[200px]">
              <div className="p-2 border-b border-gray-700">
                <div className="text-xs text-gray-400 mb-2">Select webcam clip:</div>
                {webcamClips.map(webcamClip => (
                  <div key={webcamClip.id} className="mb-2">
                    <div className="text-xs font-medium text-white mb-1 px-2 py-1">{webcamClip.name}</div>
                    <div className="flex flex-wrap gap-1 px-2">
                      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as PipPosition[]).map(pos => (
                        <button
                          key={pos}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🎯 PiP position clicked:', pos, 'for webcam:', webcamClip.name);
                            handleSetPipOverlay(webcamClip.id, pos);
                          }}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          {pos.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      <div className="text-xs text-gray-500 flex items-center gap-3">
        {clipAtPlayhead && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="truncate max-w-xs">
              {clipAtPlayhead.track > 0 
                ? `${getTrackLabel(clipAtPlayhead.track)} - ${clipAtPlayhead.name}`
                : clipAtPlayhead.name}
            </span>
          </div>
        )}
        {selectedClips && selectedClips.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedClips.length === 1 && (() => {
              const selectedClip = clips.find(c => c.id === selectedClips[0]);
              return selectedClip ? (
                <span className="truncate max-w-xs">
                  {selectedClip.track > 0 
                    ? `${getTrackLabel(selectedClip.track)} - ${selectedClip.name}`
                    : selectedClip.name}
                </span>
              ) : null;
            })()}
            {selectedClips.length > 1 && (
              <span>{selectedClips.length} selected</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

