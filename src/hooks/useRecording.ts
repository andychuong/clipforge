import { useState, useCallback, useRef } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { invoke } from '@tauri-apps/api/core';

export interface RecordingState {
  isRecording: boolean;
  recordingType: 'screen' | 'webcam' | 'picture-in-picture' | null;
  duration: number;
  error: string | null;
}

let durationInterval: ReturnType<typeof setInterval> | null = null;
let currentRecordingPath: string | null = null;

export function useRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    recordingType: null,
    duration: 0,
    error: null,
  });

  const addClip = useTimelineStore(state => state.addClip);
  const getNextAvailableTrack = useTimelineStore(state => state.getNextAvailableTrack);
  const recordingTypeRef = useRef<'screen' | 'webcam' | null>(null);

  const startScreenRecording = useCallback(async () => {
    try {
      setRecordingState({
        isRecording: false,
        recordingType: null,
        duration: 0,
        error: null,
      });

      // Generate output path
      const timestamp = Date.now();
      const filename = `recording_${timestamp}.mp4`;
      const outputPath = `/tmp/${filename}`;
      currentRecordingPath = outputPath;

      // Start native recording via Tauri
      await invoke('start_recording', {
        params: {
          output_path: outputPath,
          recording_type: 'screen',
        },
      });

      // Start duration timer
      durationInterval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      recordingTypeRef.current = 'screen';
      
      setRecordingState({
        isRecording: true,
        recordingType: 'screen',
        duration: 0,
        error: null,
      });
    } catch (error: any) {
      console.error('Screen recording error:', error);
      setRecordingState({
        isRecording: false,
        recordingType: null,
        duration: 0,
        error: error.message || 'Failed to start screen recording',
      });
    }
  }, []);

  const startWebcamRecording = useCallback(async () => {
    try {
      setRecordingState({
        isRecording: false,
        recordingType: null,
        duration: 0,
        error: null,
      });

      // Generate output path
      const timestamp = Date.now();
      const filename = `recording_${timestamp}.mp4`;
      const outputPath = `/tmp/${filename}`;
      currentRecordingPath = outputPath;

      // Start native recording via Tauri
      await invoke('start_recording', {
        params: {
          output_path: outputPath,
          recording_type: 'webcam',
        },
      });

      // Start duration timer
      durationInterval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      recordingTypeRef.current = 'webcam';
      
      setRecordingState({
        isRecording: true,
        recordingType: 'webcam',
        duration: 0,
        error: null,
      });
    } catch (error: any) {
      console.error('Webcam recording error:', error);
      setRecordingState({
        isRecording: false,
        recordingType: null,
        duration: 0,
        error: error.message || 'Failed to start webcam recording',
      });
    }
  }, []);

  const startPictureInPictureRecording = useCallback(async () => {
    try {
      setRecordingState({
        isRecording: false,
        recordingType: null,
        duration: 0,
        error: null,
      });

      // Note: Picture-in-picture requires more complex video composition
      // For now, we'll use screen recording with a note that it's a simplified version
      const timestamp = Date.now();
      const filename = `recording_${timestamp}.mp4`;
      const outputPath = `/tmp/${filename}`;
      currentRecordingPath = outputPath;

      // Start screen recording (PiP would require additional video processing)
      await invoke('start_recording', {
        params: {
          output_path: outputPath,
          recording_type: 'screen', // TODO: Implement true PiP with video composition
        },
      });

      // Start duration timer
      durationInterval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      setRecordingState({
        isRecording: true,
        recordingType: 'picture-in-picture',
        duration: 0,
        error: null,
      });
    } catch (error: any) {
      console.error('PiP recording error:', error);
      setRecordingState({
        isRecording: false,
        recordingType: null,
        duration: 0,
        error: error.message || 'Failed to start picture-in-picture recording',
      });
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      // Stop native recording via Tauri
      if (currentRecordingPath) {
        await invoke('stop_recording');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }

    // Clear duration timer
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }

    // Save the recording
    await saveRecording();

    setRecordingState(prev => ({
      ...prev,
      isRecording: false,
    }));
  }, []);

  const saveRecording = async () => {
    if (!currentRecordingPath) {
      console.error('No recording path');
      return;
    }

    try {
      // Read the file bytes using Tauri command
      const fileData = await invoke<number[]>('read_file_bytes', { path: currentRecordingPath });
      
      // Convert to Uint8Array
      const uint8Array = new Uint8Array(fileData);
      
      // Create a blob from the file data
      const blob = new Blob([uint8Array], { type: 'video/mp4' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Get video duration (use a temporary video element)
      const video = document.createElement('video');
      video.src = blobUrl;
      
      // Wait a bit for the video to load metadata
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve(null);
        };
        video.onerror = (e) => {
          clearTimeout(timeout);
          reject(e);
        };
      });

      const duration = video.duration || 0;

      // Add to timeline on next available track
      const track = getNextAvailableTrack();
      const recordingType = recordingTypeRef.current;
      
      addClip({
        name: `Recording ${new Date().toLocaleTimeString()}`,
        path: currentRecordingPath,
        blobUrl: blobUrl,
        duration: duration,
        startTime: 0,
        endTime: duration,
        track: track, // Use next available track
        position: 0,
        recordingType: recordingType || undefined,
      });

      console.log('Recording saved to timeline on track', track, ':', currentRecordingPath);
      recordingTypeRef.current = null;
    } catch (error) {
      console.error('Error saving recording:', error);
    } finally {
      currentRecordingPath = null;
    }
  };

  return {
    ...recordingState,
    startScreenRecording,
    startWebcamRecording,
    startPictureInPictureRecording,
    stopRecording,
  };
}

