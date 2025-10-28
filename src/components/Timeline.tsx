import { useState, useEffect } from 'react';
import { useTimelineStore } from '../store/timelineStore';

export default function Timeline() {
  const { clips, currentTime, zoomLevel, setCurrentTime, addClip, updateClip } = useTimelineStore();
  const [dragOverTrack, setDragOverTrack] = useState<number | null>(null);
  const [trimmingClip, setTrimmingClip] = useState<string | null>(null);
  const [trimHandle, setTrimHandle] = useState<'start' | 'end' | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDraggingFromLibrary, setIsDraggingFromLibrary] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
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
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('bg-red-600') || 
        (e.target as HTMLElement).classList.contains('bg-red-500')) {
      // If clicking on playhead, don't scrub
      return;
    }
    setIsScrubbing(true);
    handleTimelineClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isScrubbing) return;
    handleTimelineClick(e);
  };

  const handleMouseUp = () => {
    setIsScrubbing(false);
  };

  useEffect(() => {
    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove as any);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isScrubbing]);

  const timelineWidth = 1000;
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

  // Generate time markers
  const markers = [];
  const maxTime = Math.max(...clips.map((c) => c.position + c.endTime), 30);
  const markerInterval = zoomLevel < 1 ? 10 : zoomLevel < 2 ? 5 : 1;

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

  const handleDragOver = (e: React.DragEvent, track: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/json') || e.dataTransfer.types.includes('text/plain')) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
    setDragOverTrack(track);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Time Ruler */}
      <div className="relative h-8 bg-gray-800 border-b border-gray-700">
        <div
          className="absolute inset-0 z-10"
          onClick={handleTimelineClick}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        >
          {markers.map((time) => (
            <div
              key={time}
              className="absolute top-0 text-xs text-gray-400"
              style={{ left: `${time * pixelsPerSecond}px` }}
            >
              <div className="border-l border-gray-600 h-full w-0" />
              <div className="ml-1 mt-1">{formatTime(time)}</div>
            </div>
          ))}
        </div>

        {/* Playhead - in the time ruler, extends down */}
        <div
          className="absolute top-0 pointer-events-none z-20"
          style={{ 
            left: `${currentTime * pixelsPerSecond}px`,
          }}
        >
          {/* Top arrow pointing down */}
          <div 
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-600" 
          />
          {/* Vertical line extending down through the timeline area */}
          <div 
            className="absolute top-2 bg-red-500"
            style={{
              width: '1px',
              height: '180px', // Extends further down
            }}
          />
        </div>
      </div>

      {/* Timeline Tracks - FULL DROP ZONE */}
      <div 
        className="flex-1 overflow-auto bg-gray-900 relative"
        style={{ minHeight: '200px' }}
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
              // Parse and add to track 1
              try {
                const mediaFile = JSON.parse(data);
                const position = currentTime;
                addClip({
                  name: mediaFile.name,
                  path: mediaFile.path,
                  duration: mediaFile.duration,
                  startTime: 0,
                  endTime: mediaFile.duration,
                  track: 1,
                  position,
                });
                console.log('Added clip via overlay');
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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Drop Zones - Full width drop zones for each track */}
          {[1, 2].map((track) => (
            <div
              key={`track-${track}`}
              className={`absolute left-0 right-0 ${
                dragOverTrack === track ? 'bg-blue-900/30 ring-2 ring-blue-500' : ''
              } transition-all pointer-events-auto`}
              style={{
                top: `${20 + (track - 1) * 60}px`, // 20px top margin to avoid time ruler
                height: '60px',
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
              {dragOverTrack === track && (
                <div className="h-full flex items-center justify-center text-blue-400 text-sm font-medium pointer-events-none">
                  Drop here on Track {track}
                </div>
              )}
            </div>
          ))}

          {/* Clips with trim handles */}
          {clips.map((clip) => {
            const clipWidth = (clip.endTime - clip.startTime) * pixelsPerSecond;
            const isTrimming = trimmingClip === clip.id;
            
            return (
              <div
                key={clip.id}
                className={`absolute bg-blue-600 hover:bg-blue-500 border border-blue-700 rounded px-2 py-1 text-xs text-white ${
                  isTrimming ? 'ring-2 ring-yellow-400' : ''
                }`}
                style={{
                  left: `${clip.position * pixelsPerSecond}px`,
                  top: `${20 + (clip.track - 1) * 60 + 10}px`, // 20px top margin to avoid time ruler
                  width: `${clipWidth}px`,
                  height: '40px',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // Calculate which end of the clip is being dragged
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const handleWidth = 10;
                  
                  if (x < handleWidth) {
                    setTrimmingClip(clip.id);
                    setTrimHandle('start');
                  } else if (x > clipWidth - handleWidth) {
                    setTrimmingClip(clip.id);
                    setTrimHandle('end');
                  }
                }}
                onMouseMove={(e) => {
                  if (!trimmingClip || trimmingClip !== clip.id || !trimHandle) return;
                  
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const time = x / pixelsPerSecond;
                  
                  if (trimHandle === 'start') {
                    const newStart = Math.max(0, Math.min(time, clip.endTime - 0.1));
                    updateClip(clip.id, { startTime: newStart });
                  } else if (trimHandle === 'end') {
                    const newEnd = Math.max(clip.startTime + 0.1, time);
                    updateClip(clip.id, { endTime: newEnd });
                  }
                }}
                onMouseUp={() => {
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
                    className="w-2 h-full bg-blue-700 hover:bg-blue-800 cursor-ew-resize"
                    style={{ marginLeft: '-2px' }}
                  />
                  <div className="flex-1 truncate px-1">
                    {clip.name}
                  </div>
                  {/* End trim handle */}
                  <div 
                    className="w-2 h-full bg-blue-700 hover:bg-blue-800 cursor-ew-resize"
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
        </div>
      </div>

      {/* Controls */}
      <div className="h-12 bg-gray-800 border-t border-gray-700 flex items-center px-4 space-x-4">
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

