import { useRef, useEffect, useState } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { Play, Pause, SkipBack, Film } from 'lucide-react';

export default function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { clips, currentTime, isPlaying, addClip, preferredTrack } = useTimelineStore();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [, setCurrentClip] = useState<string | null>(null); // Unused but needed for state management

  // Update current clip based on playhead position
  useEffect(() => {
    if (clips.length === 0) {
      setCurrentClip(null);
      return;
    }

    // Priority: preferred track -> master track -> any clip
    let clip = null;
    
    // First, check if there's a preferred track
    if (preferredTrack !== null) {
      clip = clips.find((c) => {
        const clipStart = c.position;
        const clipEnd = c.position + (c.endTime - c.startTime);
        return c.track === preferredTrack && currentTime >= clipStart && currentTime <= clipEnd;
      });
    }
    
    // Second, prioritize master track (track 0) if no preferred track clip found
    if (!clip) {
      clip = clips.find((c) => {
        const clipStart = c.position;
        const clipEnd = c.position + (c.endTime - c.startTime);
        return c.track === 0 && currentTime >= clipStart && currentTime <= clipEnd;
      });
    }
    
    // Finally, find any clip if no master track clip
    if (!clip) {
      clip = clips.find((c) => {
        const clipStart = c.position;
        const clipEnd = c.position + (c.endTime - c.startTime);
        return currentTime >= clipStart && currentTime <= clipEnd;
      });
    }

    if (clip) {
      const video = videoRef.current;
      const src = clip.blobUrl || clip.path;
      const wasPlaying = isPlaying;
      
      if (video) {
        // Calculate the offset within the clip, then add the startTime trim
        const offsetInClip = currentTime - clip.position;
        const actualVideoTime = clip.startTime + offsetInClip;
        
        // Set src if it hasn't been set yet or changed
        if (!video.src || video.src !== src) {
          const previousSrc = video.src;
          const shouldContinuePlaying = wasPlaying && previousSrc !== src;
          
          // Pause first to avoid abort errors
          if (previousSrc) {
            video.pause();
          }
          
          video.src = src;
          
          // Wait for video to be ready before setting time and playing
          const handleCanPlay = () => {
            video.currentTime = actualVideoTime;
            
            // Wait a bit for time to be set, then play if needed
            if (shouldContinuePlaying) {
              // Use a small delay to ensure currentTime is set
              setTimeout(() => {
                if (video.readyState >= 2) {
                  video.play().catch((err) => {
                    // Ignore abort errors - they happen when switching sources
                    if (err.name !== 'AbortError') {
                      console.error('Play error after clip transition:', err);
                    }
                  });
                }
              }, 50);
            }
          };
          
          video.addEventListener('loadedmetadata', () => {
            // Also wait for canplay to ensure video is ready
            if (video.readyState >= 2) {
              handleCanPlay();
            } else {
              video.addEventListener('canplay', handleCanPlay, { once: true });
            }
          }, { once: true });
        } else if (Math.abs(video.currentTime - actualVideoTime) > 0.1) {
          video.currentTime = actualVideoTime;
        }
      }
      
      setCurrentClip(src);
    }
    // Don't set currentClip to null when no clip - keep the last clip to prevent flickering
  }, [clips, currentTime, preferredTrack, isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && video.src && video.readyState >= 2) {
      video.play().catch((err) => {
        console.error('Play error:', err);
      });
    } else if (!isPlaying) {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const clip = clips.find((c) => {
      const clipStart = c.position;
      const clipEnd = c.position + (c.endTime - c.startTime);
      return currentTime >= clipStart && currentTime <= clipEnd;
    });

    if (clip) {
      const offsetInClip = currentTime - clip.position;
      const actualVideoTime = clip.startTime + offsetInClip;
      if (Math.abs(video.currentTime - actualVideoTime) > 0.1) {
        video.currentTime = actualVideoTime;
      }
    }
  }, [currentTime, clips]);

  const handlePlayPause = () => {
    const newPlayingState = !isPlaying;
    useTimelineStore.getState().setIsPlaying(newPlayingState);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const store = useTimelineStore.getState();
    const currentClips = store.clips;
    const storeCurrentTime = store.currentTime;
    
    const clip = currentClips.find((c) => {
      const clipStart = c.position;
      const clipEnd = c.position + (c.endTime - c.startTime);
      return storeCurrentTime >= clipStart && storeCurrentTime <= clipEnd;
    });
    
    if (clip) {
      // Check if we've reached the end of this clip's trimmed segment
      const clipEndTime = clip.endTime;
      const clipTimelineEnd = clip.position + (clip.endTime - clip.startTime);
      
      // If video has reached the end of the clip segment OR timeline position, transition to next clip
      if (video.currentTime >= clipEndTime - 0.05 || storeCurrentTime >= clipTimelineEnd - 0.05) {
        // Find the next clip on the same track
        const nextClip = currentClips
          .filter((c) => c.track === clip.track)
          .sort((a, b) => a.position - b.position)
          .find((c) => c.position > clip.position);
        
        if (nextClip) {
          // Advance to the start of the next clip (at its startTime, not position)
          const nextTimelineTime = nextClip.position;
          // Only update if we're not already there or close to it
          if (Math.abs(storeCurrentTime - nextTimelineTime) > 0.1) {
            store.setCurrentTime(nextTimelineTime);
          }
          return; // Exit early, don't update currentTime from video
        } else {
          // No more clips, pause at the end
          if (video.currentTime >= clipEndTime || storeCurrentTime >= clipTimelineEnd) {
            store.setIsPlaying(false);
            return;
          }
        }
      }
      
      // Video's currentTime is in the original video's timeline
      // Convert it back to the timeline position by subtracting startTime
      const offsetInClip = video.currentTime - clip.startTime;
      const timelineTime = clip.position + offsetInClip;
      
      // Only update if we're moving forward or if there's a significant difference
      // This prevents looping back
      if (timelineTime > storeCurrentTime - 0.05 && Math.abs(storeCurrentTime - timelineTime) > 0.1) {
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
      const currentTime = store.currentTime;
      const currentClips = store.clips; // Get latest clips from store
      
      // Find current clip
      const currentClip = currentClips.find((c) => {
        const clipStart = c.position;
        const clipEnd = c.position + (c.endTime - c.startTime);
        return currentTime >= clipStart && currentTime <= clipEnd;
      });
      
      if (currentClip) {
        const clipEnd = currentClip.position + (currentClip.endTime - currentClip.startTime);
        
        // Check if we've reached the end of the current clip
        if (currentTime >= clipEnd - 0.1) {
          // Find the next clip on the same track
          const nextClip = currentClips
            .filter((c) => c.track === currentClip.track)
            .sort((a, b) => a.position - b.position)
            .find((c) => c.position > currentClip.position);
          
          if (nextClip) {
            // Advance to the start of the next clip
            store.setCurrentTime(nextClip.position);
          } else {
            // No more clips on this track, stop playback
            store.setIsPlaying(false);
          }
        } else {
          // Continue advancing normally
          const newTime = currentTime + 0.1;
          store.setCurrentTime(newTime);
        }
      } else {
        // No current clip, check if we've reached the end of all clips
        const maxTime = Math.max(...currentClips.map(c => c.position + (c.endTime - c.startTime)), 0);
        const newTime = currentTime + 0.1;
        if (newTime >= maxTime) {
          store.setIsPlaying(false);
        } else {
          store.setCurrentTime(newTime);
        }
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center"
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
        
        // Only try to parse if we have valid JSON data
        if (data && data.trim().startsWith('{')) {
          try {
            const mediaFile = JSON.parse(data);
            
            // Validate that mediaFile has required properties
            if (mediaFile && typeof mediaFile === 'object' && mediaFile.name && mediaFile.path) {
              addClip({
                name: mediaFile.name,
                path: mediaFile.path,
                blobUrl: mediaFile.blobUrl,
                duration: mediaFile.duration,
                startTime: 0,
                endTime: mediaFile.duration,
                track: 1,
                position: 0,
              });
              console.log('Clip added to timeline from video preview drop');
              setIsDraggingOver(false);
            } else {
              console.warn('Invalid media file data:', mediaFile);
            }
          } catch (err) {
            console.error('Video preview drop error:', err);
            console.error('Data that failed to parse:', data);
          }
        } else {
          console.log('No valid JSON data in drop, ignoring');
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
        className="max-w-full max-h-full object-contain"
        controls={false}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          const store = useTimelineStore.getState();
          const currentClips = store.clips; // Get latest clips from store
          const currentClip = currentClips.find((c) => {
            const clipStart = c.position;
            const clipEnd = c.position + (c.endTime - c.startTime);
            return store.currentTime >= clipStart && store.currentTime <= clipEnd;
          });
          
          if (currentClip) {
            // Find the next clip on the same track
            const nextClip = currentClips
              .filter((c) => c.track === currentClip.track)
              .sort((a, b) => a.position - b.position)
              .find((c) => c.position > currentClip.position);
            
            if (nextClip) {
              // Advance to the start of the next clip
              store.setCurrentTime(nextClip.position);
              // Don't pause - let playback continue with next clip
              // The video will switch to next clip automatically via useEffect
              return;
            }
          }
          
          // Only pause if there's no next clip
          store.setIsPlaying(false);
        }}
      >
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
              <Pause className="h-8 w-8" fill="currentColor" />
            ) : (
              <Play className="h-8 w-8 ml-1" fill="currentColor" />
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
            <SkipBack className="h-6 w-6" fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Time Display */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded text-sm font-mono">
        {Math.floor(currentTime / 60)}:
        {Math.floor(currentTime % 60)
          .toString()
          .padStart(2, '0')}
      </div>

      {clips.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <Film className="h-16 w-16 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Import videos to start editing</p>
          </div>
        </div>
      )}
    </div>
  );
}
