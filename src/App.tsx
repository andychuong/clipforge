import { useState } from 'react';
import { useTimelineStore } from './store/timelineStore';
import MediaLibrary from './components/MediaLibrary';
import VideoPreview from './components/VideoPreview';
import Timeline from './components/Timeline';
import ExportDialog from './components/ExportDialog';
import TrimToolbar from './components/TrimToolbar';
import { Download } from 'lucide-react';

function App() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const clips = useTimelineStore(state => state.clips);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header - Compact */}
      <div className="bg-gray-950 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-blue-400">ClipForge</h1>
          <div className="text-xs text-gray-500">Cut • Merge • Export</div>
        </div>
        <button
          onClick={() => setIsExportDialogOpen(true)}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Video
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Media Library - Narrower */}
        <div className="w-56 bg-gray-950 border-r border-gray-700 overflow-hidden flex-shrink-0 flex flex-col">
          <MediaLibrary />
        </div>

        {/* Center - Preview and Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Preview - Larger */}
          <div className="flex-1 bg-black overflow-hidden flex items-center justify-center min-h-0">
            <VideoPreview />
          </div>

          {/* Trim Toolbar - Above Timeline */}
          <TrimToolbar />

          {/* Timeline - Taller for better editing */}
          <div className="h-72 border-t border-gray-700 bg-gray-900 overflow-hidden flex-shrink-0">
            <Timeline />
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        clips={clips}
      />
    </div>
  );
}

export default App;

