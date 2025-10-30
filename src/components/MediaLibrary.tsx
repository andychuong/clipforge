import { useState, useCallback } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { useFileDrop } from '../hooks/useFileDrop';
import { Plus, Trash2, Film } from 'lucide-react';

export interface MediaFile {
  name: string;
  path: string; // Real file system path for export
  blobUrl: string; // Blob URL for video preview
  duration: number;
  fileSize?: number; // File size in bytes
  width?: number; // Video width in pixels
  height?: number; // Video height in pixels
  originalFile?: File; // Store original file for lazy path generation
}

interface MediaLibraryProps {
  onFileSelect?: (file: MediaFile | null) => void;
}

export default function MediaLibrary({ onFileSelect }: MediaLibraryProps) {
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
      
      try {
        // Create blob URL immediately for fast preview
        const blobUrl = URL.createObjectURL(file);
        console.log('Created blob URL:', blobUrl);
        
        // Get duration quickly without blocking
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
          video.onerror = (e) => {
            clearTimeout(timeout);
            console.error('Video error:', e);
            reject(new Error('Failed to load metadata'));
          };
          video.src = blobUrl;
        });

        const duration = video.duration || 0;
        const width = video.videoWidth || 0;
        const height = video.videoHeight || 0;
        const fileSize = file.size || 0;
        console.log('Duration:', duration, 'Resolution:', `${width}x${height}`, 'Size:', fileSize);
        
        // Add to media library immediately with placeholder path
        // The real path will be generated when needed for export
        const mediaFile: MediaFile = {
          name: file.name,
          path: '', // Will be filled when exporting
          blobUrl: blobUrl,
          duration,
          fileSize,
          width,
          height,
          originalFile: file, // Store reference for later
        };

        setMediaFiles((prev) => [...prev, mediaFile]);
        console.log('Added to media library');
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        alert(`Failed to process "${file.name}". Error: ${error}`);
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
      className={`h-full w-full flex flex-col ${
        isDragging ? 'bg-blue-600/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="p-3 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Media</h2>
        <button
          onClick={async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.multiple = true;
            
            const filePromise = new Promise<File[]>((resolve) => {
              input.onchange = (e: any) => {
                const files = Array.from(e.target.files) as File[];
                resolve(files);
              };
            });
            
            input.click();
            const files = await filePromise;
            
            for (const file of files) {
              console.log('Processing file:', file.name);
              
              try {
                // Create blob URL immediately for fast preview
                const blobUrl = URL.createObjectURL(file);
                
                // Get duration quickly
                const video = document.createElement('video');
                video.preload = 'metadata';
                
                const duration = await new Promise<number>((resolve, reject) => {
                  const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                  video.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    resolve(video.duration);
                  };
                  video.onerror = (e) => {
                    clearTimeout(timeout);
                    console.error('Video error:', e);
                    reject(new Error('Failed to load'));
                  };
                  video.src = blobUrl;
                });
                
                const width = video.videoWidth || 0;
                const height = video.videoHeight || 0;
                const fileSize = file.size || 0;
                
                const mediaFile: MediaFile = { 
                  name: file.name, 
                  path: '', // Will be generated when exporting
                  blobUrl: blobUrl,
                  duration,
                  fileSize,
                  width,
                  height,
                  originalFile: file,
                };
                setMediaFiles((prev) => [...prev, mediaFile]);
                console.log('Added file:', file.name, 'duration:', duration);
              } catch (error) {
                console.error('Error processing file:', file.name, error);
                alert(`Failed to process "${file.name}". Error: ${error}`);
              }
            }
          }}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Import Videos
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
      {mediaFiles.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <Film className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Drop videos here</p>
          <p className="text-xs opacity-70 mt-1">MP4, MOV, AVI</p>
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {mediaFiles.map((file, index) => (
            <div
              key={index}
              className={`bg-gray-800 hover:bg-gray-700 rounded transition-all ${
                draggingItem === file.name ? 'opacity-50' : ''
              } ${selectedFile === file.name ? 'ring-1 ring-blue-500' : ''}`}
              onClick={() => {
                const newSelection = selectedFile === file.name ? null : file.name;
                setSelectedFile(newSelection);
                // Notify parent component of selection
                if (onFileSelect) {
                  onFileSelect(newSelection ? file : null);
                }
              }}
            >
              <div
                draggable="true"
                onDragStart={(e) => {
                  console.log('=== DRAG START ===', file.name);
                  setDraggingItem(file.name);
                  
                  // Set drag data - this is critical
                  // Include both path and blobUrl for the clip
                  const dragData = {
                    name: file.name,
                    path: file.path,
                    blobUrl: file.blobUrl,
                    duration: file.duration
                  };
                  e.dataTransfer.setData('application/json', JSON.stringify(dragData));
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
                className="select-none p-2"
                style={{ 
                  cursor: 'grab',
                  userSelect: 'none'
                } as React.CSSProperties}
              >
                <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {Math.floor(file.duration / 60)}:
                    {Math.floor(file.duration % 60)
                      .toString()
                      .padStart(2, '0')}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMedia(file.path);
                    }}
                    className="text-gray-500 hover:text-red-400 p-0.5 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

