import { useRef, useEffect, useState } from 'react';
import { useTimelineStore } from '../store/timelineStore';

export default function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { clips, currentTime, isPlaying, addClip } = useTimelineStore();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [currentClip, setCurrentClip] = useState<string | null>(null);

  // Update current clip based on playhead position
  useEffect(() => {
    if (clips.length === 0) {
      setCurrentClip(null);
      return;
    }

    const clip = clips.find((c) => 
      currentTime >= c.position + c.startTime && 
      currentTime <= c.position + c.endTime
    );

    if (clip) {
      setCurrentClip(clip.path);
      const video = videoRef.current;
      if (video && video.src !== clip.path) {
        const offset = currentTime - clip.position;
        video.src = clip.path;
        video.currentTime = offset;
      }
    } else {
      setCurrentClip(null);
    }
  }, [clips, currentTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && currentClip) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [isPlaying, currentClip]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentClip) return;

    const clip = clips.find((c) => 
      currentTime >= c.position + c.startTime && 
      currentTime <= c.position + c.endTime
    );

    if (clip) {
      const offset = currentTime - clip.position;
      if (Math.abs(video.currentTime - offset) > 0.1) {
        video.currentTime = offset;
      }
    }
  }, [currentTime, currentClip, clips]);

  const handlePlayPause = () => {
    const newPlayingState = !isPlaying;
    useTimelineStore.getState().setIsPlaying(newPlayingState);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const clip = clips.find((c) => 
      currentTime >= c.position + c.startTime && 
      currentTime <= c.position + c.endTime
    );
    
    if (clip) {
      const offset = video.currentTime;
      const timelineTime = clip.position + clip.startTime + offset;
      const store = useTimelineStore.getState();
      if (Math.abs(store.currentTime - timelineTime) > 0.1) {
        store.setCurrentTime(timelineTime);
      }
    }
  };

  const handleStop = () => {
    useTimelineStore.getState().setIsPlaying(false);
    useTimelineStore.getState().setCurrentTime(0);
  };

  // Auto-advance playhead when playing
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const store = useTimelineStore.getState();
      const newTime = store.currentTime + 0.1;
      store.setCurrentTime(newTime);
      
      // Check if we've reached the end of all clips
      const maxTime = Math.max(...clips.map(c => c.position + c.endTime), 0);
      if (newTime >= maxTime) {
        store.setIsPlaying(false);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, clips]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
      onDragEnter={(e) => {
        e.preventDefault();
        console.log('Drag entered video preview');
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
        console.log('Drop on video preview');
        
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
              position: 0,
            });
            console.log('Clip added to timeline from video preview drop');
            setIsDraggingOver(false);
          } catch (err) {
            console.error('Video preview drop error:', err);
          }
        }
      }}
    >
      {/* Drop overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-blue-500/30 border-4 border-blue-500 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-blue-600 text-white px-8 py-4 rounded-lg text-xl font-bold">
            DROP TO ADD TO TIMELINE
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls={false}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          useTimelineStore.getState().setIsPlaying(false);
        }}
      >
        {currentClip && <source src={currentClip} />}
      </video>

      {/* Playback Controls Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center space-x-4 pointer-events-auto">
          <button
            onClick={handleStop}
            className="bg-gray-800/80 hover:bg-gray-700/90 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all"
            title="Stop"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>
          
          <button
            onClick={handlePlayPause}
            className="bg-gray-800/80 hover:bg-gray-700/90 text-white rounded-full w-16 h-16 flex items-center justify-center transition-all"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          
          <button
            onClick={() => {
              const store = useTimelineStore.getState();
              store.setCurrentTime(0);
            }}
            className="bg-gray-800/80 hover:bg-gray-700/90 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all"
            title="Rewind to Start"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Time Display */}
      <div className="absolute bottom-4 right-4 bg-gray-900/80 px-3 py-1 rounded text-sm">
        {Math.floor(currentTime / 60)}:
        {Math.floor(currentTime % 60)
          .toString()
          .padStart(2, '0')}
      </div>

      {clips.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <p>No video loaded</p>
        </div>
      )}
    </div>
  );
}

