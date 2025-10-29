import { useRecording } from '../hooks/useRecording';
import { Monitor, Camera, Video, Square, AlertCircle } from 'lucide-react';

// Check if native recording is available (always true in Tauri)
const isRecordingAvailable = () => {
  // In Tauri, we use native FFmpeg recording, so this should always be available
  return true;
};

export default function RecordingControls() {
  const {
    isRecording,
    recordingType,
    duration,
    error,
    startScreenRecording,
    startWebcamRecording,
    startPictureInPictureRecording,
    stopRecording,
  } = useRecording();

  const recordingAvailable = isRecordingAvailable();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-950 border-b border-gray-700 px-4 py-2 flex items-center gap-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-2">
        Record
      </h2>

      {!isRecording ? (
        <>
          <button
          onClick={startScreenRecording}
          disabled={!recordingAvailable}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={recordingAvailable ? "Record screen" : "Recording not available in Tauri webview"}
        >
          <Monitor className="h-4 w-4" />
          Screen
        </button>

        <button
          onClick={startWebcamRecording}
          disabled={!recordingAvailable}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={recordingAvailable ? "Record webcam" : "Recording not available in Tauri webview"}
        >
          <Camera className="h-4 w-4" />
          Webcam
        </button>

        <button
          onClick={startPictureInPictureRecording}
          disabled={!recordingAvailable}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={recordingAvailable ? "Record screen with webcam overlay" : "Recording not available in Tauri webview"}
        >
          <Video className="h-4 w-4" />
          Screen + Webcam
        </button>

        {!recordingAvailable && (
          <div className="ml-auto flex items-center gap-2 text-xs text-orange-400">
            <AlertCircle className="h-4 w-4" />
            <span>Recording requires native API support</span>
          </div>
        )}
        </>
      ) : (
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="font-medium">
              {recordingType === 'screen' && 'Recording Screen'}
              {recordingType === 'webcam' && 'Recording Webcam'}
              {recordingType === 'picture-in-picture' && 'Recording Screen + Webcam'}
            </span>
          </div>

          <div className="text-lg font-mono text-red-500 font-bold">
            {formatDuration(duration)}
          </div>

          <button
            onClick={stopRecording}
            className="ml-auto px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded flex items-center gap-2 transition-colors"
            title="Stop recording"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 ml-auto">
          {error}
        </div>
      )}
    </div>
  );
}

