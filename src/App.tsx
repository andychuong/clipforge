import { useState } from 'react';
import { useTimelineStore } from './store/timelineStore';
import MediaLibrary, { type MediaFile } from './components/MediaLibrary';
import VideoPreview from './components/VideoPreview';
import Timeline from './components/Timeline';
import ExportDialog from './components/ExportDialog';
import TrimToolbar from './components/TrimToolbar';
import RecordingControls from './components/RecordingControls';
import MetadataPanel from './components/MetadataPanel';
import { useRecording } from './hooks/useRecording';
import { Download } from 'lucide-react';

function App() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedMediaFile, setSelectedMediaFile] = useState<MediaFile | null>(null);
  const clips = useTimelineStore(state => state.clips);
  const recordingHook = useRecording();
  const { isRecording, recordingType, duration: recordingDuration, previewStream, pipPosition } = recordingHook;

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

      {/* Recording Controls */}
      <RecordingControls
        recordingState={recordingHook}
        onStartScreen={recordingHook.startScreenRecording}
        onStartWebcam={recordingHook.startWebcamRecording}
        onStartPictureInPicture={recordingHook.startPictureInPictureRecording}
        onStop={recordingHook.stopRecording}
        onSelectScreen={recordingHook.setSelectedScreenIndex}
        onSelectWebcam={recordingHook.setSelectedWebcamIndex}
        onSetPipPosition={recordingHook.setPipPosition}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Media Library and Metadata - Narrower */}
        <div className="w-56 bg-gray-950 border-r border-gray-700 overflow-hidden flex-shrink-0 flex flex-col">
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <MediaLibrary onFileSelect={setSelectedMediaFile} />
          </div>
          <div className="h-64 flex-shrink-0 border-t border-gray-700">
            <MetadataPanel selectedFile={selectedMediaFile} />
          </div>
        </div>

        {/* Center - Preview and Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Preview - Larger */}
          <div className="flex-1 bg-black overflow-hidden flex items-center justify-center min-h-0">
            <VideoPreview 
              previewStream={previewStream}
              isRecording={isRecording}
              recordingType={recordingType}
              recordingDuration={recordingDuration}
              pipPosition={pipPosition}
            />
          </div>

          {/* Trim Toolbar - Above Timeline */}
          <TrimToolbar />

          {/* Timeline - Taller for 3 tracks (master + 2 source) */}
          <div className="h-96 border-t border-gray-700 bg-gray-900 overflow-hidden flex-shrink-0">
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

