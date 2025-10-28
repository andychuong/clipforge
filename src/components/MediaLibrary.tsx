import { useState, useCallback } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { useFileDrop } from '../hooks/useFileDrop';

interface MediaFile {
  name: string;
  path: string;
  duration: number;
}

export default function MediaLibrary() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Handle external file drops (from Finder/Desktop)
  const handleExternalDrop = useCallback(async (files: File[]) => {
    console.log('External drop received:', files.length, 'files');
    
    const videoFiles = files.filter((file) =>
      file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|webm)$/i)
    );
    
    console.log('Video files:', videoFiles.length);

    for (const file of videoFiles) {
      console.log('Processing:', file.name);
      const url = URL.createObjectURL(file);
      
      // Create video element to get duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
          video.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load metadata'));
          };
          video.src = url;
        });

        const duration = video.duration || 0;
        console.log('Duration:', duration);
        
        const mediaFile: MediaFile = {
          name: file.name,
          path: url,
          duration,
        };

        setMediaFiles((prev) => [...prev, mediaFile]);
        console.log('Added to media library');
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        const mediaFile: MediaFile = {
          name: file.name,
          path: url,
          duration: 0,
        };
        setMediaFiles((prev) => [...prev, mediaFile]);
      }
    }
  }, []);

  // Use browser file drop for external files (always enabled, but will ignore internal drags)
  useFileDrop(handleExternalDrop, true);

  // Add dragover handler to Media Library container to accept external file drops
  const handleDragOver = (e: React.DragEvent) => {
    // Only handle external file drags
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveMedia = (path: string) => {
    setMediaFiles((prev) => prev.filter((file) => file.path !== path));
    useTimelineStore.getState().removeClip(path);
  };

  return (
    <div
      className={`h-full p-4 ${
        isDragging ? 'bg-blue-600/20 border-2 border-blue-500' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Media Library</h2>
        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.multiple = true;
            input.onchange = async (e: any) => {
              const files = Array.from(e.target.files) as File[];
              for (const file of files) {
                console.log('Processing file:', file.name);
                const url = URL.createObjectURL(file);
                const video = document.createElement('video');
                video.preload = 'metadata';
                
                try {
                  const duration = await new Promise<number>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                    video.onloadedmetadata = () => {
                      clearTimeout(timeout);
                      resolve(video.duration);
                    };
                    video.onerror = () => {
                      clearTimeout(timeout);
                      reject(new Error('Failed to load'));
                    };
                    video.src = url;
                  });
                  
                  const mediaFile: MediaFile = { name: file.name, path: url, duration };
                  setMediaFiles((prev) => [...prev, mediaFile]);
                  console.log('Added file:', file.name, 'duration:', duration);
                } catch (error) {
                  console.error('Error processing file:', file.name, error);
                  // Add anyway with 0 duration
                  const mediaFile: MediaFile = { name: file.name, path: url, duration: 0 };
                  setMediaFiles((prev) => [...prev, mediaFile]);
                }
              }
            };
            input.click();
          }}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
        >
          + Add Files
        </button>
      </div>
      {mediaFiles.length === 0 ? (
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center text-gray-400">
          <p className="mb-2">Drag & drop video files here</p>
          <p className="text-sm">Supports MP4, MOV, AVI</p>
          <p className="text-xs mt-2">Or click the "+ Add Files" button above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mediaFiles.map((file, index) => (
            <div
              key={index}
              className={`bg-gray-700 p-2 rounded hover:bg-gray-600 transition-all ${
                draggingItem === file.name ? 'opacity-50' : ''
              } ${selectedFile === file.name ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => {
                setSelectedFile(selectedFile === file.name ? null : file.name);
              }}
            >
              <div
                draggable="true"
                onDragStart={(e) => {
                  console.log('=== DRAG START ===', file.name);
                  setDraggingItem(file.name);
                  
                  // Set drag data - this is critical
                  e.dataTransfer.setData('application/json', JSON.stringify(file));
                  e.dataTransfer.setData('text/plain', file.name); // Fallback
                  e.dataTransfer.effectAllowed = 'copy';
                  
                  // Dispatch to window
                  const evt = new Event('dragstart', { bubbles: true });
                  window.dispatchEvent(evt);
                  
                  console.log('Drag data set successfully');
                }}
                onDrag={() => {
                  // Dragging in progress
                }}
                onDragEnd={(e) => {
                  console.log('=== DRAG END ===', e.dataTransfer.dropEffect);
                  setDraggingItem(null);
                  
                  const evt = new Event('dragend', { bubbles: true });
                  window.dispatchEvent(evt);
                }}
                className="select-none"
                style={{ 
                  cursor: 'grab',
                  userSelect: 'none'
                } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {Math.floor(file.duration / 60)}:
                    {Math.floor(file.duration % 60)
                      .toString()
                      .padStart(2, '0')}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const store = useTimelineStore.getState();
                      const track1Clips = store.clips.filter(c => c.track === 1);
                      const lastClipEnd = track1Clips.length > 0 
                        ? Math.max(...track1Clips.map(c => c.position + c.endTime))
                        : 0;
                      store.addClip({
                        name: file.name,
                        path: file.path,
                        duration: file.duration,
                        startTime: 0,
                        endTime: file.duration,
                        track: 1,
                        position: lastClipEnd,
                      });
                    }}
                    className="text-blue-400 hover:text-blue-300 px-1 text-xs font-bold border border-blue-400 rounded"
                    title="Add to Track 1"
                  >
                    T1
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const store = useTimelineStore.getState();
                      const track2Clips = store.clips.filter(c => c.track === 2);
                      const lastClipEnd = track2Clips.length > 0 
                        ? Math.max(...track2Clips.map(c => c.position + c.endTime))
                        : 0;
                      store.addClip({
                        name: file.name,
                        path: file.path,
                        duration: file.duration,
                        startTime: 0,
                        endTime: file.duration,
                        track: 2,
                        position: lastClipEnd,
                      });
                    }}
                    className="text-green-400 hover:text-green-300 px-1 text-xs font-bold border border-green-400 rounded"
                    title="Add to Track 2"
                  >
                    T2
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMedia(file.path);
                    }}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

