import { useState, useEffect, useRef, useCallback } from 'react';
import { useTimelineStore } from '../store/timelineStore';

export default function Timeline() {
  const { clips, currentTime, zoomLevel, selectedClips, setCurrentTime, addClip, updateClip, setSelectedClips } = useTimelineStore();
  const [dragOverTrack, setDragOverTrack] = useState<number | null>(null);
  const [trimmingClip, setTrimmingClip] = useState<string | null>(null);
  const [trimHandle, setTrimHandle] = useState<'start' | 'end' | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDraggingFromLibrary, setIsDraggingFromLibrary] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const trimThrottleRef = useRef<NodeJS.Timeout | null>(null);
  
  // Listen for global drag state
  useEffect(() => {
    const handleDragStart = () => setIsDraggingFromLibrary(true);
    const handleDragEnd = () => setIsDraggingFromLibrary(false);
    
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    
    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

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

  // Calculate timeline width based on content
  // Always show at least 5 minutes (300 seconds) for a full default view
  const maxTime = Math.max(...clips.map((c) => c.position + c.endTime), 300);
  const timelineContentWidth = Math.max(maxTime * pixelsPerSecond + 100, 2000);
  
  // Generate time markers based on zoom and available space
  const markers = [];
  // Use adaptive intervals: more zoom = smaller intervals
  let markerInterval: number;
  if (zoomLevel < 0.5) {
    markerInterval = 30; // Every 30 seconds
  } else if (zoomLevel < 1) {
    markerInterval = 15; // Every 15 seconds
  } else if (zoomLevel < 2) {
    markerInterval = 10; // Every 10 seconds
  } else if (zoomLevel < 5) {
    markerInterval = 5; // Every 5 seconds
  } else {
    markerInterval = 1; // Every 1 second at high zoom
  }

  for (let i = 0; i <= maxTime; i += markerInterval) {
    markers.push(i);
  }

  const handleDrop = (e: React.DragEvent, track: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrack(null);
    setIsDraggingFromLibrary(false);
    
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
      
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = x / pixelsPerSecond;
      
      console.log('Adding clip at position:', position);
      
      addClip({
        name: mediaFile.name,
        path: mediaFile.path,
        blobUrl: mediaFile.blobUrl,
        duration: mediaFile.duration,
        startTime: 0,
        endTime: mediaFile.duration,
        track,
        position: Math.max(0, position),
      });
      
      console.log('Clip added successfully');
    } catch (err) {
      console.error('Failed to parse drop data:', err);
    }
  };


  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Combined scrollable container for ruler and tracks */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Time Ruler - Fixed to top */}
        <div className="relative h-8 bg-gray-800 border-b border-gray-700 sticky top-0 z-30 overflow-hidden">
          <div
            className="absolute inset-0 z-10 bg-gray-800"
            onClick={handleTimelineClick}
            style={{ cursor: 'pointer', pointerEvents: 'auto', width: `${timelineContentWidth}px` }}
          >
            {markers.map((time) => (
              <div
                key={time}
                className="absolute top-0 text-xs text-gray-400 bg-gray-800"
                style={{ left: `${time * pixelsPerSecond}px` }}
              >
                <div className="border-l border-gray-600 h-full w-0" />
                <div className="ml-1 mt-1 bg-gray-800">{formatTime(time)}</div>
              </div>
            ))}
          </div>

          {/* Playhead - in the time ruler */}
          <div
            className="absolute top-0 pointer-events-none z-20"
            style={{ 
              left: `${currentTime * pixelsPerSecond}px`,
            }}
          >
            <div 
              className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-600" 
            />
            <div 
              className="absolute top-2 bg-red-500"
              style={{
                width: '1px',
                height: '180px',
              }}
            />
          </div>
        </div>

        {/* Timeline Tracks */}
        <div 
          className="bg-gray-900 relative"
          style={{ width: `${timelineContentWidth}px`, minHeight: '150px' }}
          onClick={handleTimelineClick}
        onDragEnter={(e) => {
          e.preventDefault();
          console.log('>>> DRAG ENTERED TIMELINE <<<');
          setIsDraggingOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDraggingOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          console.log('>>> DROP ON TIMELINE <<<');
          
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const position = x / pixelsPerSecond;
          
          let data = e.dataTransfer.getData('application/json');
          if (!data) {
            data = e.dataTransfer.getData('text/plain');
          }
          
          if (data) {
            try {
              const mediaFile = JSON.parse(data);
              addClip({
                name: mediaFile.name,
                path: mediaFile.path,
                blobUrl: mediaFile.blobUrl,
                duration: mediaFile.duration,
                startTime: 0,
                endTime: mediaFile.duration,
                track: 1,
                position: Math.max(0, position),
              });
              console.log('>>> CLIP ADDED <<<');
              setIsDraggingOver(false);
            } catch (err) {
              console.error('Drop error:', err);
            }
          }
        }}
      >
        {/* Visual indicator when dragging */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-blue-500/30 border-4 border-blue-500 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-blue-600 text-white px-8 py-4 rounded-lg text-xl font-bold">
              DROP HERE
            </div>
          </div>
        )}
        {/* Drag overlay to catch drop events */}
        {isDraggingFromLibrary && (
          <div
            className="absolute inset-0 bg-blue-500/20 z-50 flex items-center justify-center pointer-events-auto"
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Drag entered overlay');
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Dragging over overlay, types:', Array.from(e.dataTransfer.types));
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Drop on overlay, types:', Array.from(e.dataTransfer.types));
              // Try both data types
              let data = e.dataTransfer.getData('application/json');
              if (!data) {
                data = e.dataTransfer.getData('text/plain');
              }
              console.log('Overlay data:', data);
              // Parse and add to track 1 at playhead position
              try {
                const mediaFile = JSON.parse(data);
                // Use playhead (currentTime) for overlay drops since mouse position isn't accurate
                const position = currentTime;
                addClip({
                  name: mediaFile.name,
                  path: mediaFile.path,
                  blobUrl: mediaFile.blobUrl,
                  duration: mediaFile.duration,
                  startTime: 0,
                  endTime: mediaFile.duration,
                  track: 1,
                  position: Math.max(0, position),
                });
                console.log('Added clip via overlay at:', position);
                setIsDraggingFromLibrary(false);
              } catch (err) {
                console.error('Overlay drop error:', err);
              }
            }}
          >
            <div className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg">
              Drop video here on Timeline
            </div>
          </div>
        )}
        
        <div
          className={`relative h-full ${isDraggingOver ? 'ring-2 ring-blue-500' : ''} ${isScrubbing ? 'cursor-ew-resize' : 'cursor-pointer'}`}
          style={{ width: `${timelineContentWidth}px` }}
          onMouseDown={handleMouseDown}
        >
          {/* Track Labels and Drop Zones */}
          {[1, 2].map((track) => (
            <div
              key={`track-${track}`}
              className={`absolute left-0 right-0 border-b border-gray-700 ${
                dragOverTrack === track ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-900/30'
              } transition-all pointer-events-auto`}
              style={{
                top: `${20 + (track - 1) * 80}px`,
                height: '80px',
                minWidth: '100%',
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Drag entered track', track, 'types:', Array.from(e.dataTransfer.types));
                setDragOverTrack(track);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.types.includes('application/json')) {
                  e.dataTransfer.dropEffect = 'copy';
                }
                console.log('Dragging over track', track);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Drop event on track', track);
                handleDrop(e, track);
              }}
            >
              <div className="absolute left-2 top-2 text-xs font-semibold text-gray-600 uppercase tracking-wide pointer-events-none">
                Track {track}
              </div>
              {dragOverTrack === track && (
                <div className="h-full flex items-center justify-center text-blue-400 text-sm font-medium pointer-events-none">
                  Drop video here
                </div>
              )}
            </div>
          ))}

          {/* Clips with trim handles */}
          {clips.map((clip) => {
            const clipWidth = (clip.endTime - clip.startTime) * pixelsPerSecond;
            const isTrimming = trimmingClip === clip.id;
            const isSelected = selectedClips.includes(clip.id);
            
            return (
              <div
                key={clip.id}
                className={`absolute bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-2 rounded shadow-lg transition-all ${
                  isTrimming ? 'border-yellow-400 shadow-yellow-400/50' : 'border-blue-800'
                } ${isSelected ? 'ring-2 ring-white shadow-white/30' : ''}`}
                style={{
                  left: `${clip.position * pixelsPerSecond}px`,
                  top: `${20 + (clip.track - 1) * 80 + 20}px`,
                  width: `${clipWidth}px`,
                  height: '50px',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // Calculate which end of the clip is being dragged
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const handleWidth = 10;
                  
                  // Select clip on click (unless clicking trim handle)
                  if (x >= handleWidth && x <= clipWidth - handleWidth) {
                    if (e.ctrlKey || e.metaKey) {
                      // Multi-select
                      setSelectedClips(selectedClips.includes(clip.id) 
                        ? selectedClips.filter(id => id !== clip.id)
                        : [...selectedClips, clip.id]);
                    } else {
                      // Single select
                      setSelectedClips([clip.id]);
                    }
                  } else if (x < handleWidth) {
                    setTrimmingClip(clip.id);
                    setTrimHandle('start');
                  } else if (x > clipWidth - handleWidth) {
                    setTrimmingClip(clip.id);
                    setTrimHandle('end');
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
                    className="w-3 h-full bg-yellow-500/80 hover:bg-yellow-400 cursor-ew-resize border-r border-yellow-600"
                    style={{ marginLeft: '-2px' }}
                  />
                  <div className="flex-1 truncate px-2 py-1 flex flex-col justify-center">
                    <div className="text-xs font-medium text-white truncate">{clip.name}</div>
                    <div className="text-xs text-blue-200 opacity-70">
                      {Math.floor(clip.endTime - clip.startTime)}s
                    </div>
                  </div>
                  {/* End trim handle */}
                  <div 
                    className="w-3 h-full bg-yellow-500/80 hover:bg-yellow-400 cursor-ew-resize border-l border-yellow-600"
                    style={{ marginRight: '-2px' }}
                  />
                </div>
              </div>
            );
          })}

          {/* Grid Lines */}
          {markers.map((time) => (
            <div
              key={time}
              className="absolute top-0 bottom-0 w-0 border-l border-gray-700"
              style={{ left: `${time * pixelsPerSecond}px` }}
            />
          ))}
          
          {/* Playhead line through tracks */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ 
              left: `${currentTime * pixelsPerSecond}px`,
              width: '1px',
              background: '#ef4444',
            }}
          />
        </div>
        </div>
      </div>

      {/* Controls */}
      <div className="h-12 bg-gray-800 border-t border-gray-700 flex items-center px-4 space-x-4 flex-shrink-0">
        <button
          onClick={() => useTimelineStore.getState().setZoomLevel(zoomLevel / 1.5)}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          🔍−
        </button>
        <button
          onClick={() => useTimelineStore.getState().setZoomLevel(zoomLevel * 1.5)}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          🔍+
        </button>
        <div className="text-sm text-gray-400 ml-auto">
          Zoom: {zoomLevel.toFixed(1)}x
        </div>
      </div>
    </div>
  );
}

