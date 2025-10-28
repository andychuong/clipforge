import { useTimelineStore } from './store/timelineStore';
import MediaLibrary from './components/MediaLibrary';
import VideoPreview from './components/VideoPreview';
import Timeline from './components/Timeline';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <h1 className="text-xl font-bold">ClipForge</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Media Library */}
        <div className="w-64 bg-gray-800 border-r border-gray-700">
          <MediaLibrary />
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-gray-950 p-4">
            <VideoPreview />
          </div>

          {/* Bottom - Timeline */}
          <div className="h-48 border-t border-gray-700 bg-gray-900">
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

