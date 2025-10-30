import { useState, useCallback, useRef, useEffect } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { invoke } from '@tauri-apps/api/core';

export interface DeviceInfo {
  index: number;
  name: string;
  device_type: 'screen' | 'webcam' | 'audio';
}

export type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface RecordingState {
  isRecording: boolean;
  recordingType: 'screen' | 'webcam' | 'pip' | null;
  duration: number;
  error: string | null;
  previewStream: MediaStream | null;
  availableDevices: DeviceInfo[];
  selectedScreenIndex: number | null;
  selectedWebcamIndex: number | null;
  pipPosition: PipPosition;
}

let durationInterval: ReturnType<typeof setInterval> | null = null;
let currentRecordingPath: string | null = null;
let previewStreamRef: MediaStream | null = null;

export function useRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    recordingType: null,
    duration: 0,
    error: null,
    previewStream: null,
    availableDevices: [],
    selectedScreenIndex: null,
    selectedWebcamIndex: null,
    pipPosition: 'bottom-left',
  });

  const addClip = useTimelineStore(state => state.addClip);
  const getNextAvailableTrack = useTimelineStore(state => state.getNextAvailableTrack);
  const recordingTypeRef = useRef<'screen' | 'webcam' | 'pip' | null>(null);

  // Load available devices on mount
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await invoke<DeviceInfo[]>('list_devices');
        console.log('📋 Available devices:', devices);
        setRecordingState(prev => ({
          ...prev,
          availableDevices: devices,
        }));
      } catch (error) {
        console.error('Failed to load devices:', error);
      }
    };
    loadDevices();
  }, []);

  const setSelectedScreenIndex = useCallback((index: number | null) => {
    console.log(`📺 Screen selected: ${index}`);
    setRecordingState(prev => ({
      ...prev,
      selectedScreenIndex: index,
    }));
  }, []);

  const setSelectedWebcamIndex = useCallback((index: number | null) => {
    console.log(`📷 Webcam selected: ${index}`);
    setRecordingState(prev => ({
      ...prev,
      selectedWebcamIndex: index,
    }));
  }, []);

  const setPipPosition = useCallback((position: PipPosition) => {
    console.log(`🎯 PiP position set to: ${position}`);
    setRecordingState(prev => ({
      ...prev,
      pipPosition: position,
    }));
  }, []);

  const startScreenRecording = useCallback(async () => {
    try {
      console.log('🎬 Starting screen recording...');
      
      const screenIndex = recordingState.selectedScreenIndex ?? 4;
      console.log(`📺 Using screen index: ${screenIndex}`);

      // Request screen share for preview
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });
        previewStreamRef = stream;
        console.log('✅ Preview stream obtained');
      } catch (error) {
        console.warn('Failed to get preview stream:', error);
      }

      // Generate output path
      const timestamp = Date.now();
      const filename = `recording_${timestamp}.mp4`;
      const outputPath = `/tmp/${filename}`;
      currentRecordingPath = outputPath;

      // Start native recording
      console.log(`🚀 Invoking start_recording...`);
      await invoke('start_recording', {
        params: {
          output_path: outputPath,
          recording_type: 'screen',
          screen_index: screenIndex,
        },
      });
      console.log('✅ Recording started successfully');

      // Start duration timer
      durationInterval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      recordingTypeRef.current = 'screen';
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        recordingType: 'screen',
        duration: 0,
        error: null,
        previewStream: stream,
      }));
    } catch (error: any) {
      console.error('❌ Screen recording error:', error);
      if (previewStreamRef) {
        previewStreamRef.getTracks().forEach(track => track.stop());
        previewStreamRef = null;
      }
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        recordingType: null,
        duration: 0,
        error: error.message || 'Failed to start screen recording',
        previewStream: null,
      }));
    }
  }, [recordingState.selectedScreenIndex]);

  const startWebcamRecording = useCallback(async () => {
    try {
      console.log('🎬 Starting webcam recording...');
      
      const webcamIndex = recordingState.selectedWebcamIndex ?? 0;
      console.log(`📷 Using webcam index: ${webcamIndex}`);

      // Request webcam for preview
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, deviceId: webcamIndex ? { exact: webcamIndex.toString() } : undefined },
          audio: true,
        });
        previewStreamRef = stream;
        console.log('✅ Webcam preview stream obtained');
      } catch (error) {
        console.warn('Failed to get webcam preview:', error);
      }

      // Generate output path
      const timestamp = Date.now();
      const filename = `recording_${timestamp}.mp4`;
      const outputPath = `/tmp/${filename}`;
      currentRecordingPath = outputPath;

      // Start native recording
      console.log(`🚀 Invoking start_recording for webcam...`);
      await invoke('start_recording', {
        params: {
          output_path: outputPath,
          recording_type: 'webcam',
          webcam_index: webcamIndex,
        },
      });
      console.log('✅ Webcam recording started successfully');

      // Start duration timer
      durationInterval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      recordingTypeRef.current = 'webcam';
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        recordingType: 'webcam',
        duration: 0,
        error: null,
        previewStream: stream,
      }));
    } catch (error: any) {
      console.error('❌ Webcam recording error:', error);
      if (previewStreamRef) {
        previewStreamRef.getTracks().forEach(track => track.stop());
        previewStreamRef = null;
      }
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        recordingType: null,
        duration: 0,
        error: error.message || 'Failed to start webcam recording',
        previewStream: null,
      }));
    }
  }, [recordingState.selectedWebcamIndex]);

  const startPictureInPictureRecording = useCallback(async () => {
    try {
      console.log('🎬 Starting PiP recording...');
      
      const screenIndex = recordingState.selectedScreenIndex ?? 4;
      const webcamIndex = recordingState.selectedWebcamIndex ?? 0;
      console.log(`📺 Screen: ${screenIndex}, 📷 Webcam: ${webcamIndex}`);

      // Request both screen and webcam
      let screenStream: MediaStream | null = null;
      let webcamStream: MediaStream | null = null;
      
      try {
        console.log('📹 Requesting screen share...');
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });
        
        console.log('📷 Requesting webcam...');
        webcamStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        
        // Combine streams (screen as main, webcam as overlay data)
        const combinedStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...screenStream.getAudioTracks(),
        ]);
        
        // Attach webcam stream for component access
        (combinedStream as any).__webcamStream = webcamStream;
        (combinedStream as any).__screenStream = screenStream;
        
        previewStreamRef = combinedStream;
        console.log('✅ Both streams obtained');
      } catch (error) {
        console.error('Failed to get streams:', error);
        throw error;
      }

      // Generate output path
      const timestamp = Date.now();
      const filename = `recording_${timestamp}.mp4`;
      const outputPath = `/tmp/${filename}`;
      currentRecordingPath = outputPath;

      // Start native recording (screen only - webcam overlay is visual-only for now)
      console.log(`🚀 Invoking start_recording for PiP...`);
      await invoke('start_recording', {
        params: {
          output_path: outputPath,
          recording_type: 'pip',
          screen_index: screenIndex,
          webcam_index: webcamIndex,
          pip_position: recordingState.pipPosition,
        },
      });
      console.log('✅ PiP recording started successfully');

      // Start duration timer
      durationInterval = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      recordingTypeRef.current = 'pip';
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        recordingType: 'pip',
        duration: 0,
        error: null,
        previewStream: previewStreamRef,
      }));
    } catch (error: any) {
      console.error('❌ PiP recording error:', error);
      if (previewStreamRef) {
        previewStreamRef.getTracks().forEach(track => track.stop());
        previewStreamRef = null;
      }
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        recordingType: null,
        duration: 0,
        error: error.message || 'Failed to start PiP recording',
        previewStream: null,
      }));
    }
  }, [recordingState.selectedScreenIndex, recordingState.selectedWebcamIndex, recordingState.pipPosition]);

  const stopRecording = useCallback(async () => {
    try {
      console.log('🛑 Stopping recording...');
      
      if (currentRecordingPath) {
        await invoke('stop_recording');
        console.log('✅ Recording stopped');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }

    // Stop and cleanup preview streams
    if (previewStreamRef) {
      const webcamStream = (previewStreamRef as any).__webcamStream;
      const screenStream = (previewStreamRef as any).__screenStream;
      
      if (webcamStream) {
        webcamStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      
      previewStreamRef.getTracks().forEach(track => track.stop());
      previewStreamRef = null;
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
      previewStream: null,
    }));
  }, []);

  const saveRecording = async () => {
    if (!currentRecordingPath) {
      console.error('No recording path');
      return;
    }

    try {
      console.log('💾 Saving recording...');
      
      // Read the file bytes
      const fileData = await invoke<number[]>('read_file_bytes', { path: currentRecordingPath });
      const uint8Array = new Uint8Array(fileData);
      const blob = new Blob([uint8Array], { type: 'video/mp4' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Get video duration
      const video = document.createElement('video');
      video.src = blobUrl;
      
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

      // Add to timeline
      const track = getNextAvailableTrack();
      const recordingType = recordingTypeRef.current;
      
      addClip({
        name: `${recordingType === 'pip' ? 'PiP' : recordingType === 'webcam' ? 'Webcam' : 'Screen'} Recording ${new Date().toLocaleTimeString()}`,
        path: currentRecordingPath,
        blobUrl: blobUrl,
        duration: duration,
        startTime: 0,
        endTime: duration,
        track: track,
        position: 0,
        recordingType: recordingType || undefined,
      });

      console.log('✅ Recording saved to timeline on track', track);
      recordingTypeRef.current = null;
    } catch (error) {
      console.error('❌ Error saving recording:', error);
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
    setSelectedScreenIndex,
    setSelectedWebcamIndex,
    setPipPosition,
  };
}
