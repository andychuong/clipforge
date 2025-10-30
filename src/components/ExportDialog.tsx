import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, X, AlertCircle } from 'lucide-react';
import { Clip } from '../store/timelineStore';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clips: Clip[];
}

export default function ExportDialog({ isOpen, onClose, clips }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track internal progress accumulator - must be before early return
  const progressAccumulator = useRef(0);

  if (!isOpen) return null;

  // Filter to only master track clips (track 0) and sort by position
  const masterClips = clips
    .filter(clip => clip.track === 0)
    .sort((a, b) => a.position - b.position);

  // We allow empty paths since they'll be generated on-demand during export
  const hasInvalidClips = false; // Always allow export, path will be generated if needed

  const handleExport = async () => {
    if (masterClips.length === 0) {
      setError('No clips on master track to export');
      return;
    }

    try {
      setIsExporting(true);
      setProgress(0);
      setError(null);
      progressAccumulator.current = 0;

      // If only one clip, use simple export
      if (masterClips.length === 1) {
        const clip = masterClips[0];
      
      // Generate file path if it doesn't exist yet (lazy path generation)
      let inputPath = clip.path;
      
      if (!inputPath || inputPath.trim() === '' || inputPath.startsWith('blob:')) {
        // No path yet - we need to save the file to temp first
        console.log('Generating file path from blob URL...');
        setProgress(5);
        
        try {
          // Fetch the blob URL as bytes
          const blobUrl = clip.blobUrl || clip.path;
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const fileBytes = Array.from(new Uint8Array(arrayBuffer));
          
          setProgress(10);
          
          // Save to temp directory via Tauri
          inputPath = await invoke('process_file', {
            params: {
              file_data: fileBytes,
              filename: clip.name,
            }
          });
          
          console.log('File saved to temp:', inputPath);
          setProgress(20);
        } catch (err: any) {
          setError(`Failed to prepare file for export: ${err.message}`);
          setIsExporting(false);
          return;
        }
      }
      
      // For MVP, use a simple prompt to get the output path
      const defaultFilename = `${clip.name.replace(/\.[^/.]+$/, '')}_exported.mp4`;
      const outputDir = await invoke('get_documents_path').catch(() => null);
      const outputPath = outputDir 
        ? `${outputDir}/${defaultFilename}`
        : await prompt('Enter output file path:', `${defaultFilename}`);
      
      if (!outputPath) {
        setIsExporting(false);
        return;
      }

      // Log for debugging
      console.log('Exporting:', {
        inputPath,
        outputPath,
        startTime: clip.startTime,
        endTime: clip.endTime
      });

      const startProgress = 30;
      setProgress(startProgress);
      progressAccumulator.current = startProgress;

      // Don't try to estimate - just smoothly increment progress at a reasonable rate
      // Faster increment based on video complexity
      const clipDuration = clip.endTime - clip.startTime;
      const fileSizeBytes = clip.fileSize || 0;
      
      // Adjust speed based on video characteristics
      // Larger/longer videos should increment faster since FFmpeg takes longer
      let incrementSpeed = 0.8; // Base increment (faster for quick exports)
      let updateInterval = 250; // Base update frequency
      
      if (clipDuration > 60) {
        incrementSpeed = 1.5; // Much faster for longer videos
        updateInterval = 200;
      }
      if (fileSizeBytes > 50_000_000) { // > 50MB
        incrementSpeed = 2.0;
        updateInterval = 150;
      }
      
      console.log('Export started with adjusted increment:', {
        duration: clipDuration,
        fileSize: fileSizeBytes,
        increment: incrementSpeed,
        interval: updateInterval
      });

      // Start incrementing progress immediately
      const progressInterval = setInterval(() => {
        progressAccumulator.current += incrementSpeed;
        
        setProgress(prev => {
          // Round to nearest 5% increment
          const roundedProgress = Math.round(progressAccumulator.current / 5) * 5;
          const newProgress = Math.min(roundedProgress, 95);
          
          // Only update if we've crossed a 5% boundary
          if (newProgress > prev && newProgress <= 95) {
            return newProgress;
          }
          return prev;
        });
      }, updateInterval);
      
      try {
        // Check if this clip has a PiP overlay
        if (clip.pipOverlayClipId) {
          const pipClip = clips.find(c => c.id === clip.pipOverlayClipId);
          
          if (!pipClip) {
            throw new Error('PiP overlay clip not found');
          }
          
          // Generate PiP clip path if needed
          let pipPath = pipClip.path;
          if (!pipPath || pipPath.trim() === '' || pipPath.startsWith('blob:')) {
            const blobUrl = pipClip.blobUrl || pipClip.path;
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const fileBytes = Array.from(new Uint8Array(arrayBuffer));
            
            pipPath = await invoke('process_file', {
              params: {
                file_data: fileBytes,
                filename: pipClip.name,
              }
            });
          }
          
          console.log('🚀 Exporting with PiP overlay:', {
            main: inputPath,
            pip: pipPath,
            pipPosition: clip.pipPosition || 'bottom-left',
            mainTime: `${clip.startTime}s - ${clip.endTime}s`,
            pipTime: `${pipClip.startTime}s - ${pipClip.endTime}s`
          });
          
          // Simulate progress while waiting for FFmpeg
          setProgress(10);
          console.log('⏳ Starting FFmpeg export (this may take a while)...');
          
          try {
            const result = await invoke('export_video_with_pip', {
              params: {
                main_path: inputPath,
                pip_path: pipPath,
                output_path: outputPath,
                main_start_time: clip.startTime,
                main_end_time: clip.endTime,
                pip_start_time: pipClip.startTime,
                pip_end_time: pipClip.endTime,
                pip_position: clip.pipPosition || 'bottom-left',
              }
            });
            
            console.log('✅ Export result:', result);
            clearInterval(progressInterval);
            setProgress(100);
            
            alert(`✅ Export complete with PiP overlay!\n\nSaved to:\n${outputPath}`);
            onClose();
          } catch (exportError: any) {
            console.error('❌ Export failed:', exportError);
            throw exportError;
          }
        } else {
          // Normal export without PiP
          const result = await invoke('export_video', {
            params: {
              input_path: inputPath,
              output_path: outputPath,
              start_time: clip.startTime,
              end_time: clip.endTime,
            }
          });

          console.log('Export result:', result);
          clearInterval(progressInterval);
          setProgress(100);
          
          alert(`Export complete! Saved to: ${outputPath}`);
          onClose();
        }
      } catch (err: any) {
        clearInterval(progressInterval);
        setProgress(0);
        setError(err.toString());
      }
      return;
    }
    
    // TODO: Multi-clip concatenation
    // For now, show error if multiple clips
    setError('Multiple clip export not yet implemented. Please export clips one at a time.');
    setIsExporting(false);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Download className="h-6 w-6" />
            Export Video
          </h2>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-white disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-4">
          <p className="text-gray-300 mb-2">
            Exporting {masterClips.length} clip{masterClips.length > 1 ? 's' : ''} from Master Track
          </p>
          {masterClips.length > 0 && (
            <div className="text-sm space-y-2 max-h-40 overflow-y-auto">
              {masterClips.map((clip, idx) => (
                <div key={idx} className="p-2 rounded bg-gray-700/30">
                  <p className="text-gray-400">
                    {idx + 1}. {clip.name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {Math.floor(clip.endTime - clip.startTime)}s @ {Math.floor(clip.position)}s
                  </p>
                </div>
              ))}
            </div>
          )}
          {masterClips.length === 0 && (
            <p className="text-yellow-400 text-sm">Add clips to Master Track to export</p>
          )}
        </div>

        {isExporting && (
          <div className="mb-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">{progress}% complete</p>
            {progress < 100 && <p className="text-xs text-gray-500 mt-1">Processing video export with FFmpeg... This may take a minute.</p>}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || masterClips.length === 0 || hasInvalidClips}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 flex items-center gap-2"
            title={hasInvalidClips ? 'Some clips have invalid file paths and cannot be exported' : ''}
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Master Track'}
          </button>
        </div>
      </div>
    </div>
  );
}
