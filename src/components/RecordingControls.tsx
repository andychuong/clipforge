import { RecordingState, PipPosition } from '../hooks/useRecording';
import { Monitor, Camera, Video, Square, AlertCircle } from 'lucide-react';

interface RecordingControlsProps {
  recordingState: RecordingState;
  onStartScreen: () => void;
  onStartWebcam: () => void;
  onStartPictureInPicture: () => void;
  onStop: () => void;
  onSelectScreen?: (index: number | null) => void;
  onSelectWebcam?: (index: number | null) => void;
  onSetPipPosition?: (position: PipPosition) => void;
}

export default function RecordingControls({
  recordingState,
  onStartScreen,
  onStartWebcam,
  onStartPictureInPicture,
  onStop,
  onSelectScreen,
  onSelectWebcam,
  onSetPipPosition,
}: RecordingControlsProps) {
  const {
    isRecording,
    recordingType,
    duration,
    error,
    availableDevices = [],
    selectedScreenIndex,
    selectedWebcamIndex,
    pipPosition,
  } = recordingState;

  const screens = availableDevices.filter(d => d.device_type === 'screen');
  const webcams = availableDevices.filter(d => d.device_type === 'webcam');

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-950 border-b border-gray-700 px-4 py-3 space-y-3">
      {/* Recording Buttons */}
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-2">
          Record
        </h2>

        {!isRecording ? (
          <>
            <button
              onClick={onStartScreen}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded flex items-center gap-2 transition-colors"
              title="Record screen"
            >
              <Monitor className="h-4 w-4" />
              Screen
            </button>

            <button
              onClick={onStartWebcam}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center gap-2 transition-colors"
              title="Record webcam"
            >
              <Camera className="h-4 w-4" />
              Webcam
            </button>

            <button
              onClick={onStartPictureInPicture}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded flex items-center gap-2 transition-colors"
              title="Record screen with webcam overlay"
            >
              <Video className="h-4 w-4" />
              Screen + Webcam
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-medium">
                {recordingType === 'screen' && 'Recording Screen'}
                {recordingType === 'webcam' && 'Recording Webcam'}
                {recordingType === 'pip' && 'Recording Screen + Webcam'}
              </span>
            </div>

            <div className="text-lg font-mono text-red-500 font-bold">
              {formatDuration(duration)}
            </div>

            <button
              onClick={onStop}
              className="ml-auto px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded flex items-center gap-2 transition-colors"
              title="Stop recording"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 ml-auto flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      {/* Device Selection - Only show when not recording */}
      {!isRecording && (screens.length > 0 || webcams.length > 0) && (
        <div className="flex items-center gap-4 pt-2 border-t border-gray-800">
          {/* Screen Selection */}
          {screens.length > 0 && onSelectScreen && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Screen:</label>
              <select
                value={selectedScreenIndex ?? ''}
                onChange={(e) => onSelectScreen(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded border border-gray-600 focus:outline-none focus:border-blue-500 min-w-[180px]"
              >
                <option value="">Select screen...</option>
                {screens.map((screen) => (
                  <option key={screen.index} value={screen.index}>
                    {screen.name.replace('Capture screen ', 'Screen ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Webcam Selection */}
          {webcams.length > 0 && onSelectWebcam && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Webcam:</label>
              <select
                value={selectedWebcamIndex ?? ''}
                onChange={(e) => onSelectWebcam(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded border border-gray-600 focus:outline-none focus:border-blue-500 min-w-[180px]"
              >
                <option value="">Select webcam...</option>
                {webcams.map((webcam) => (
                  <option key={webcam.index} value={webcam.index}>
                    {webcam.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PiP Position Selection */}
          {onSetPipPosition && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">PiP Position:</label>
              <select
                value={pipPosition}
                onChange={(e) => onSetPipPosition(e.target.value as PipPosition)}
                className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
