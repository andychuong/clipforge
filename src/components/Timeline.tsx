import { useState, useEffect, useRef } from 'react';
import { useTimelineStore } from '../store/timelineStore';

export default function Timeline() {
  const { 
    clips, 
    currentTime, 
    zoomLevel, 
    selectedClips, 
    draggingClipId,
    numSourceTracks,
    setCurrentTime,
    addClip, 
    updateClip, 
    setSelectedClips,
    moveClip,
    setDraggingClipId,
    ensureMasterTrackContinuity,
    ensureTrackExists,
    getTrackLabel,
    setPreferredTrack
  } = useTimelineStore();
  const [dragOverTrack, setDragOverTrack] = useState<number | null>(null);
  const [trimmingClip, setTrimmingClip] = useState<string | null>(null);
  const [trimHandle, setTrimHandle] = useState<'start' | 'end' | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const trimThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle scrubbing (click and drag to move playhead)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('bg-red-600') || 
        (e.target as HTMLElement).classList.contains('bg-red-500')) {
      // If clicking on playhead, don't scrub
      return;
    }
    setIsScrubbing(true);
    handleTimelineClick(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isScrubbing) return;
    // Create a simple calculation for time based on mouse position
    // We need to find the timeline div
    const timelineElement = document.querySelector('.timeline-tracks') as HTMLDivElement;
    if (timelineElement) {
      const rect = timelineElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = x / pixelsPerSecond;
      setCurrentTime(Math.max(0, time));
    }
  };

  const handleMouseUp = () => {
    setIsScrubbing(false);
  };

  useEffect(() => {
    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isScrubbing]);

  const pixelsPerSecond = 10 * zoomLevel;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    console.log('Timeline clicked at:', time, 'seconds, x:', x, 'pixelsPerSecond:', pixelsPerSecond);
    setCurrentTime(Math.max(0, time));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatTimeCompact = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    // For very zoomed out view, show compact format
    if (seconds >= 3600) {
      const hrs = Math.floor(seconds / 3600);
      const minsInHour = Math.floor((seconds % 3600) / 60);
      return `${hrs}:${minsInHour.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate timeline width based on content and zoom level
  // Account for trimmed clips: position + (endTime - startTime)
  const maxTimeFromClips = Math.max(...clips.map((c) => c.position + (c.endTime - c.startTime)), 0);
  
  // When zoomed out, extend the timeline much further for better navigation
  let minTimelineDuration: number;
  if (zoomLevel < 0.3) {
    minTimelineDuration = 1800; // 30 minutes when very zoomed out
  } else if (zoomLevel < 0.5) {
    minTimelineDuration = 900; // 15 minutes
  } else if (zoomLevel < 1) {
    minTimelineDuration = 600; // 10 minutes
  } else if (zoomLevel < 2) {
    minTimelineDuration = 300; // 5 minutes
  } else {
    minTimelineDuration = 180; // 3 minutes
  }
  
  const maxTime = Math.max(maxTimeFromClips, minTimelineDuration);
  const timelineContentWidth = Math.max(maxTime * pixelsPerSecond + 100, 2000);
  
  // Generate time markers based on zoom level with better intervals
  const markers = [];
  let markerInterval: number;
  let minorTickInterval: number;
  
  if (zoomLevel < 0.2) {
    markerInterval = 300; // Every 5 minutes
    minorTickInterval = 60; // Every 1 minute
  } else if (zoomLevel < 0.5) {
    markerInterval = 120; // Every 2 minutes
    minorTickInterval = 30; // Every 30 seconds
  } else if (zoomLevel < 1) {
    markerInterval = 60; // Every 1 minute
    minorTickInterval = 10; // Every 10 seconds
  } else if (zoomLevel < 2) {
    markerInterval = 30; // Every 30 seconds
    minorTickInterval = 5; // Every 5 seconds
  } else if (zoomLevel < 5) {
    markerInterval = 10; // Every 10 seconds
    minorTickInterval = 2; // Every 2 seconds
  } else {
    markerInterval = 5; // Every 5 seconds
    minorTickInterval = 1; // Every 1 second
  }

  for (let i = 0; i <= maxTime; i += markerInterval) {
    markers.push(i);
  }
  
  // Generate minor tick marks
  const minorTicks = [];
  for (let i = 0; i <= maxTime; i += minorTickInterval) {
    if (!markers.includes(i)) {
      minorTicks.push(i);
    }
  }

  const handleDrop = (e: React.DragEvent, track: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrack(null);
    
    console.log('Drop received on track:', track);
    
    // Try both data types
    let data = e.dataTransfer.getData('application/json');
    if (!data) {
      data = e.dataTransfer.getData('text/plain');
    }
    
    console.log('Drop data:', data);
    
    if (!data) {
      console.log('No data in transfer');
      return;
    }
    
    try {
      const mediaFile = JSON.parse(data);
      console.log('Parsed media file:', mediaFile);
      
      // For new clips from library, always start at 0:00
      // Place on source tracks (1, 2), not master track (0)
      const targetTrack = track === 0 ? 1 : track; // Don't allow direct drops to master track
      
      console.log('Adding clip at position 0:00 on track:', targetTrack);
      
      // Ensure the track exists
      ensureTrackExists(targetTrack);
      
      addClip({
        name: mediaFile.name,
        path: mediaFile.path,
        blobUrl: mediaFile.blobUrl,
        duration: mediaFile.duration,
        startTime: 0,
        endTime: mediaFile.duration,
        track: targetTrack,
        position: 0, // Always start at 0:00
      });
      
      console.log('Clip added successfully');
    } catch (err) {
      console.error('Failed to parse drop data:', err);
    }
  };

  const handleTrackLabelClick = (trackNumber: number) => {
    // Find the first clip on this track
    const clipsOnTrack = clips
      .filter(clip => clip.track === trackNumber)
      .sort((a, b) => a.position - b.position);
    
    // Set this as the preferred track
    setPreferredTrack(trackNumber);
    
    if (clipsOnTrack.length > 0) {
      // Move playhead to the start of the first clip
      setCurrentTime(clipsOnTrack[0].position);
    } else {
      // If no clips on this track, just move to beginning
      setCurrentTime(0);
    }
  };


  // Calculate dynamic timeline height based on number of tracks
  // Master track (65px) + top spacing (8px) + (numSourceTracks * (65px height + 8px spacing)) + new track drop zone
  const trackHeight = 65;
  const trackSpacing = 8;
  const dynamicTimelineHeight = trackSpacing + trackHeight + (numSourceTracks * (trackHeight + trackSpacing)) + (trackHeight + trackSpacing);
  
  // Generate array of source track numbers
  const sourceTracks = Array.from({ length: numSourceTracks }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Combined scrollable container for ruler and tracks */}
      <div className="flex-1 overflow-x-auto overflow-y-auto" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Time Ruler - Fixed to top */}
        <div className="relative h-6 bg-gray-800 border-b border-gray-700 sticky top-0 z-30">
          <div
            className="absolute inset-0 z-10 bg-gray-800"
            onClick={handleTimelineClick}
            style={{ cursor: 'pointer', pointerEvents: 'auto', width: `${timelineContentWidth}px` }}
          >
            {/* Major time markers with labels */}
            {markers.map((time) => (
              <div
                key={time}
                className="absolute top-0 text-[10px] text-gray-400 bg-gray-800"
                style={{ left: `${time * pixelsPerSecond}px` }}
              >
                <div className="border-l border-gray-600 h-full w-0" />
                <div className="ml-1 mt-0.5 bg-gray-800">{zoomLevel < 0.5 ? formatTimeCompact(time) : formatTime(time)}</div>
              </div>
            ))}
            
            {/* Minor tick marks */}
            {minorTicks.map((time) => (
              <div
                key={`minor-${time}`}
                className="absolute top-0 border-l border-gray-700"
                style={{ 
                  left: `${time * pixelsPerSecond}px`,
                  height: '8px',
                  width: '0'
                }}
              />
            ))}
          </div>

          {/* Playhead indicator - triangle only in ruler */}
          <div
            className="absolute top-0 pointer-events-none z-20"
            style={{ 
              left: `${currentTime * pixelsPerSecond}px`,
            }}
          >
            <div 
              className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-600" 
            />
            {/* Extended playhead line through ruler */}
            <div 
              className="absolute top-0 left-1/2 transform -translate-x-1/2 pointer-events-none"
              style={{ 
                width: '1px',
                height: '24px', // Full height of ruler (h-6 = 24px)
                background: '#ef4444',
              }}
            />
          </div>
        </div>

        {/* Timeline Tracks */}
        <div 
          className="bg-gray-900 relative"
          style={{ width: `${timelineContentWidth}px`, height: `${dynamicTimelineHeight}px` }}
          onClick={handleTimelineClick}
      >
        
        <div
          className={`relative h-full ${isScrubbing ? 'cursor-ew-resize' : 'cursor-pointer'}`}
          style={{ width: `${timelineContentWidth}px` }}
          onMouseDown={handleMouseDown}
        >
          {/* Track Labels and Drop Zones */}
          {/* Master Track (0) - Output video with no gaps */}
          <div
            key="track-master"
            className={`absolute left-0 right-0 border-b-2 border-green-600 ${
              dragOverTrack === 0 ? 'bg-green-900/20 border-green-400' : 'bg-green-950/30'
            } transition-all pointer-events-auto`}
            style={{
              top: `${trackSpacing}px`,
              height: `${trackHeight}px`,
              minWidth: '100%',
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverTrack(0);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Allow moving clips to master track
              if (draggingClipId) {
                e.dataTransfer.dropEffect = 'move';
              } else {
                e.dataTransfer.dropEffect = 'none';
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverTrack(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggingClipId) {
                // Copying clip to master track (keeps original in source track)
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left - dragStartOffset.x;
                const newPosition = Math.max(0, x / pixelsPerSecond);
                moveClip(draggingClipId, newPosition, 0);
                setDraggingClipId(null);
                // Ensure master track has no gaps
                setTimeout(() => ensureMasterTrackContinuity(), 0);
              }
              setDragOverTrack(null);
            }}
          >
            <div 
              className="absolute left-2 top-0.5 text-[10px] font-semibold text-green-400 uppercase tracking-wide cursor-pointer hover:text-green-300 flex items-center gap-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleTrackLabelClick(0);
              }}
            >
              <span className="text-green-500">★</span> Master Track (Output)
            </div>
            {dragOverTrack === 0 && draggingClipId && (
              <div className="h-full flex items-center justify-center text-green-400 text-xs font-medium pointer-events-none">
                Drop to add to output
              </div>
            )}
          </div>

          {/* Source Tracks - For staging clips */}
          {sourceTracks.map((track) => (
            <div
              key={`track-${track}`}
              className={`absolute left-0 right-0 border-b border-gray-700 ${
                dragOverTrack === track ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-900/30'
              } transition-all pointer-events-auto`}
              style={{
                top: `${trackSpacing + track * (trackHeight + trackSpacing)}px`,
                height: `${trackHeight}px`,
                minWidth: '100%',
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverTrack(track);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = draggingClipId ? 'move' : 'copy';
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverTrack(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggingClipId) {
                  // Moving existing clip within timeline
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left - dragStartOffset.x;
                  const newPosition = Math.max(0, x / pixelsPerSecond);
                  moveClip(draggingClipId, newPosition, track);
                  setDraggingClipId(null);
                } else {
                  // New clip from library
                  handleDrop(e, track);
                }
                setDragOverTrack(null);
              }}
            >
              <div 
                className="absolute left-2 top-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTrackLabelClick(track);
                }}
              >
                {getTrackLabel(track)}
              </div>
              {dragOverTrack === track && (
                <div className="h-full flex items-center justify-center text-blue-400 text-xs font-medium pointer-events-none">
                  {draggingClipId ? 'Move clip here' : 'Drop video here'}
                </div>
              )}
            </div>
          ))}

          {/* New Track Drop Zone - appears below the last track */}
          <div
            key="new-track-zone"
            className={`absolute left-0 right-0 border-b border-dashed border-gray-600 ${
              dragOverTrack === numSourceTracks + 1 ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-900/10'
            } transition-all pointer-events-auto`}
            style={{
              top: `${trackSpacing + (numSourceTracks + 1) * (trackHeight + trackSpacing)}px`,
              height: `${trackHeight}px`,
              minWidth: '100%',
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverTrack(numSourceTracks + 1);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = draggingClipId ? 'move' : 'copy';
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverTrack(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const newTrack = numSourceTracks + 1;
              
              if (draggingClipId) {
                // Moving existing clip to new track
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left - dragStartOffset.x;
                const newPosition = Math.max(0, x / pixelsPerSecond);
                ensureTrackExists(newTrack);
                moveClip(draggingClipId, newPosition, newTrack);
                setDraggingClipId(null);
              } else {
                // New clip from library
                ensureTrackExists(newTrack);
                handleDrop(e, newTrack);
              }
              setDragOverTrack(null);
            }}
          >
            <div className="absolute left-2 top-0.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wide pointer-events-none flex items-center gap-1">
              <span>+</span> Drop to Create New Track
            </div>
            {dragOverTrack === numSourceTracks + 1 && (
              <div className="h-full flex items-center justify-center text-blue-400 text-xs font-medium pointer-events-none">
                {draggingClipId ? 'Move clip here' : 'Drop video here to create new track'}
              </div>
            )}
          </div>

          {/* Clips with trim handles */}
          {clips.map((clip) => {
            const clipWidth = (clip.endTime - clip.startTime) * pixelsPerSecond;
            const isTrimming = trimmingClip === clip.id;
            const isSelected = selectedClips.includes(clip.id);
            const isDragging = draggingClipId === clip.id;
            const isMasterTrack = clip.track === 0;
            
            // Different colors for master track vs source tracks
            const clipColors = isMasterTrack 
              ? 'from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border-green-800'
              : 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-800';
            
            return (
              <div
                key={clip.id}
                draggable={!isTrimming}
                className={`absolute bg-gradient-to-r ${clipColors} border-2 rounded shadow-lg transition-all cursor-move ${
                  isTrimming ? 'border-yellow-400 shadow-yellow-400/50' : ''
                } ${isSelected ? 'ring-2 ring-white shadow-white/30' : ''} ${
                  isDragging ? 'opacity-50' : ''
                }`}
                style={{
                  left: `${clip.position * pixelsPerSecond}px`,
                  top: `${trackSpacing + clip.track * (trackHeight + trackSpacing) + 20}px`,
                  width: `${clipWidth}px`,
                  height: '42px',
                }}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDraggingClipId(clip.id);
                  // Store offset from click point to clip start
                  const rect = e.currentTarget.getBoundingClientRect();
                  const offsetX = e.clientX - rect.left;
                  const offsetY = e.clientY - rect.top;
                  setDragStartOffset({ x: offsetX, y: offsetY });
                  // Set drag data
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', clip.id);
                }}
                onDragEnd={(e) => {
                  e.stopPropagation();
                  setDraggingClipId(null);
                  setDragOverTrack(null);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // Calculate which end of the clip is being dragged
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const handleWidth = 8;
                  
                  // Check if clicking trim handles
                  if (x < handleWidth) {
                    setTrimmingClip(clip.id);
                    setTrimHandle('start');
                    return;
                  } else if (x > clipWidth - handleWidth) {
                    setTrimmingClip(clip.id);
                    setTrimHandle('end');
                    return;
                  }
                  
                  // Select clip on click (middle area)
                  if (e.ctrlKey || e.metaKey) {
                    // Multi-select
                    setSelectedClips(selectedClips.includes(clip.id) 
                      ? selectedClips.filter(id => id !== clip.id)
                      : [...selectedClips, clip.id]);
                  } else {
                    // Single select - also set preferred track
                    setSelectedClips([clip.id]);
                    setPreferredTrack(clip.track);
                  }
                }}
                onMouseMove={(e) => {
                  if (!trimmingClip || trimmingClip !== clip.id || !trimHandle) return;
                  
                  // Throttle updates to improve performance
                  if (trimThrottleRef.current) return;
                  
                  // Capture the values we need before the timeout
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  
                  trimThrottleRef.current = setTimeout(() => {
                    const time = x / pixelsPerSecond;
                    
                    if (trimHandle === 'start') {
                      const newStart = Math.max(0, Math.min(time, clip.endTime - 0.1));
                      updateClip(clip.id, { startTime: newStart });
                    } else if (trimHandle === 'end') {
                      const newEnd = Math.max(clip.startTime + 0.1, time);
                      updateClip(clip.id, { endTime: newEnd });
                    }
                    trimThrottleRef.current = null;
                  }, 16); // ~60fps
                }}
                onMouseUp={() => {
                  if (trimThrottleRef.current) {
                    clearTimeout(trimThrottleRef.current);
                    trimThrottleRef.current = null;
                  }
                  setTrimmingClip(null);
                  setTrimHandle(null);
                }}
                onMouseLeave={() => {
                  if (trimHandle) {
                    setTrimmingClip(null);
                    setTrimHandle(null);
                  }
                }}
              >
                <div className="flex items-center h-full">
                  {/* Start trim handle */}
                  <div 
                    className="w-2 h-full bg-yellow-500/80 hover:bg-yellow-400 cursor-ew-resize border-r border-yellow-600"
                    style={{ marginLeft: '-2px' }}
                  />
                  <div className="flex-1 truncate px-1.5 pt-0.5 pb-1 flex flex-col">
                    <div className="text-[10px] font-medium text-white truncate">{clip.name}</div>
                    <div className="text-[9px] text-blue-200 opacity-70">
                      {Math.floor(clip.endTime - clip.startTime)}s
                    </div>
                  </div>
                  {/* End trim handle */}
                  <div 
                    className="w-2 h-full bg-yellow-500/80 hover:bg-yellow-400 cursor-ew-resize border-l border-yellow-600"
                    style={{ marginRight: '-2px' }}
                  />
                </div>
              </div>
            );
          })}

          {/* Grid Lines - extend through all tracks */}
          {markers.map((time) => (
            <div
              key={time}
              className="absolute top-0 w-0 border-l border-gray-700"
              style={{ 
                left: `${time * pixelsPerSecond}px`,
                height: `${dynamicTimelineHeight}px`,
              }}
            />
          ))}
          
          {/* Playhead line through tracks - centered and extends through all tracks */}
          <div
            className="absolute top-0 pointer-events-none z-50"
            style={{ 
              left: `${currentTime * pixelsPerSecond}px`,
              width: '1px',
              height: `${dynamicTimelineHeight}px`,
              background: '#ef4444',
              transform: 'translateX(-50%)', // Center the line
            }}
          />
        </div>
        </div>
      </div>

      {/* Controls */}
      <div className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 space-x-3 flex-shrink-0">
        <button
          onClick={() => useTimelineStore.getState().setZoomLevel(zoomLevel / 1.5)}
          className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
        >
          🔍−
        </button>
        <button
          onClick={() => useTimelineStore.getState().setZoomLevel(zoomLevel * 1.5)}
          className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
        >
          🔍+
        </button>
        <div className="text-xs text-gray-400 ml-auto">
          Zoom: {zoomLevel.toFixed(1)}x
        </div>
      </div>
    </div>
  );
}

