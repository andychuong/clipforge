import { Info } from 'lucide-react';
import type { MediaFile } from './MediaLibrary';

interface MetadataPanelProps {
  selectedFile: MediaFile | null;
}

export default function MetadataPanel({ selectedFile }: MetadataPanelProps) {
  if (!selectedFile) {
    return (
      <div className="h-full bg-gray-950 border-t border-gray-700 p-4 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Select a media file to view metadata</p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return 'Unknown';
    
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    } else if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(2)} KB`;
    } else {
      return `${bytes} bytes`;
    }
  };

  const formatResolution = (width?: number, height?: number): string => {
    if (!width || !height) return 'Unknown';
    return `${width} × ${height}`;
  };

  return (
    <div className="h-full bg-gray-950 border-t border-gray-700 p-4 overflow-y-auto">
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Metadata
        </h3>
        <div className="text-sm font-medium text-white truncate mb-1" title={selectedFile.name}>
          {selectedFile.name}
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Duration</div>
          <div className="text-sm text-gray-300 font-mono">
            {formatDuration(selectedFile.duration)}
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500 mb-1">File Size</div>
          <div className="text-sm text-gray-300 font-mono">
            {formatFileSize(selectedFile.fileSize)}
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500 mb-1">Resolution</div>
          <div className="text-sm text-gray-300 font-mono">
            {formatResolution(selectedFile.width, selectedFile.height)}
          </div>
        </div>
      </div>
    </div>
  );
}

