// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::{Arc, Mutex};
use std::sync::OnceLock;
use std::process::Child;

static RECORDING_PROCESS: OnceLock<Arc<Mutex<Option<Child>>>> = OnceLock::new();

#[derive(Debug, Serialize, Deserialize)]
struct ExportParams {
    input_path: String,
    output_path: String,
    start_time: f64,
    end_time: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportWithPipParams {
    main_path: String,
    pip_path: String,
    output_path: String,
    main_start_time: f64,
    main_end_time: f64,
    pip_start_time: f64,
    pip_end_time: f64,
    pip_position: String, // "top-left", "top-right", "bottom-left", "bottom-right"
}

#[derive(Debug, Serialize, Deserialize)]
struct ProcessFileParams {
    file_data: Vec<u8>,
    filename: String,
}

// Get the user's documents path
#[tauri::command]
async fn get_documents_path() -> Result<String, String> {
    // For macOS, return the Documents directory
    let home = std::env::var("HOME").map_err(|_| "Could not get HOME env".to_string())?;
    Ok(format!("{}/Documents", home))
}

// Process and save a file to temp directory
#[tauri::command]
async fn process_file(
    _app_handle: tauri::AppHandle,
    params: ProcessFileParams,
) -> Result<String, String> {
    // Get the temp directory
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(&params.filename);
    
    // Write the file
    fs::write(&file_path, params.file_data).map_err(|e| {
        format!("Failed to write file: {}", e)
    })?;
    
    Ok(file_path.to_string_lossy().to_string())
}

// Export a single clip to MP4
#[tauri::command]
async fn export_video(
    _app_handle: tauri::AppHandle,
    params: ExportParams,
) -> Result<String, String> {
    use std::process::Command;
    
    let duration = params.end_time - params.start_time;
    
    // Build ffmpeg command to trim and export
    let mut command = Command::new("ffmpeg");
    command
        .arg("-i")
        .arg(&params.input_path)
        .arg("-ss")
        .arg(format!("{}", params.start_time))
        .arg("-t")
        .arg(format!("{}", duration))
        .arg("-c:v")
        .arg("libx264")
        .arg("-c:a")
        .arg("aac")
        .arg("-preset")
        .arg("medium")
        .arg("-y") // Overwrite output file
        .arg(&params.output_path);
    
    println!("Running FFmpeg command to export video");
    println!("Input: {}", params.input_path);
    println!("Output: {}", params.output_path);
    println!("Start time: {}s, Duration: {}s", params.start_time, duration);
    
    let output = command.output().map_err(|e| {
        format!("Failed to execute FFmpeg: {}. Make sure FFmpeg is installed on your system.", e)
    })?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg error: {}", stderr));
    }
    
    Ok(params.output_path)
}

// Export video with PiP overlay
#[tauri::command]
async fn export_video_with_pip(params: ExportWithPipParams) -> Result<String, String> {
    use std::process::Command;
    
    let main_duration = params.main_end_time - params.main_start_time;
    let pip_duration = params.pip_end_time - params.pip_start_time;
    
    // Calculate PiP position (webcam overlay)
    let pip_x = match params.pip_position.as_str() {
        "top-right" | "bottom-right" => "W-overlay_w-20",
        _ => "20", // top-left or bottom-left
    };
    let pip_y = match params.pip_position.as_str() {
        "bottom-left" | "bottom-right" => "H-overlay_h-20",
        _ => "20", // top-left or top-right
    };
    
    // Build FFmpeg command with filter_complex to overlay PiP
    let filter_complex = format!(
        "[1:v]scale=320:240,setpts=PTS-STARTPTS[pip];[0:v][pip]overlay={}:{}:enable='between(t,0,{})'[v]",
        pip_x, pip_y, main_duration
    );
    
    // FFmpeg command structure: -ss <seek> -i <input> -t <duration> applies to the immediately preceding input
    let command_str = format!(
        "ffmpeg -ss {} -i \"{}\" -t {} -ss {} -i \"{}\" -t {} -filter_complex \"{}\" -map \"[v]\" -map 0:a -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -y \"{}\"",
        params.main_start_time, params.main_path, main_duration,
        params.pip_start_time, params.pip_path, pip_duration,
        filter_complex,
        params.output_path
    );
    
    println!("Exporting with PiP overlay:");
    println!("Main video: {} ({} to {})", params.main_path, params.main_start_time, params.main_end_time);
    println!("PiP video: {} ({} to {})", params.pip_path, params.pip_start_time, params.pip_end_time);
    println!("Position: {}", params.pip_position);
    println!("Command: {}", command_str);
    
    let output = Command::new("sh")
        .arg("-c")
        .arg(&command_str)
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg error: {}", stderr));
    }
    
    Ok(params.output_path)
}

// Check if FFmpeg is installed
#[tauri::command]
async fn check_ffmpeg() -> Result<bool, String> {
    use std::process::Command;
    
    let output = Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map_err(|_| "FFmpeg not found".to_string())?;
    
    Ok(output.status.success())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DeviceInfo {
    index: u32,
    name: String,
    device_type: String, // "screen", "webcam", "audio"
}

// List all available devices (screens, webcams, microphones)
#[tauri::command]
async fn list_devices() -> Result<Vec<DeviceInfo>, String> {
    use std::process::Command;
    
    // Use ffmpeg to list avfoundation devices
    let output = Command::new("ffmpeg")
        .arg("-f")
        .arg("avfoundation")
        .arg("-list_devices")
        .arg("true")
        .arg("-i")
        .arg("")
        .output()
        .map_err(|e| format!("Failed to list devices: {}", e))?;
    
    let stderr = String::from_utf8_lossy(&output.stderr);
    println!("FFmpeg device list output:\n{}", stderr);
    
    let mut devices = Vec::new();
    let mut in_video_section = false;
    let mut in_audio_section = false;
    
    for line in stderr.lines() {
        let line_lower = line.to_lowercase();
        
        // Track which section we're in
        if line_lower.contains("avfoundation video devices") {
            in_video_section = true;
            in_audio_section = false;
            continue;
        } else if line_lower.contains("avfoundation audio devices") {
            in_video_section = false;
            in_audio_section = true;
            continue;
        }
        
        // Parse device lines: "[0] MacBook Pro Camera" or "[4] Capture screen 0"
        if (in_video_section || in_audio_section) && line.contains('[') {
            let mut bracket_pos = 0;
            while let Some(bracket_start) = line[bracket_pos..].find('[') {
                let actual_start = bracket_pos + bracket_start;
                if let Some(bracket_end) = line[actual_start + 1..].find(']') {
                    let actual_end = actual_start + 1 + bracket_end;
                    let content = &line[actual_start + 1..actual_end];
                    
                    if let Ok(index) = content.parse::<u32>() {
                        let name_start = actual_end + 1;
                        let name = if name_start < line.len() {
                            line[name_start..].trim().to_string()
                        } else {
                            format!("Device {}", index)
                        };
                        
                        // Determine device type
                        let device_type = if line_lower.contains("capture screen") {
                            "screen"
                        } else if in_audio_section {
                            "audio"
                        } else {
                            "webcam"
                        };
                        
                        println!("Found {}: index={}, name={}", device_type, index, name);
                        devices.push(DeviceInfo {
                            index,
                            name,
                            device_type: device_type.to_string(),
                        });
                        break;
                    }
                }
                bracket_pos = actual_start + 1;
                if bracket_pos >= line.len() {
                    break;
                }
            }
        }
    }
    
    println!("Total devices found: {}", devices.len());
    Ok(devices)
}

#[derive(Debug, Serialize, Deserialize)]
struct StartRecordingParams {
    output_path: String,
    recording_type: String, // "screen", "webcam", or "pip" (picture-in-picture)
    screen_index: Option<u32>, // FFmpeg device index for screen (4+ for screens)
    webcam_index: Option<u32>, // FFmpeg device index for webcam (0-3 typically)
    pip_position: Option<String>, // "top-left", "top-right", "bottom-left", "bottom-right"
    pip_size: Option<String>, // "small", "medium", "large"
}

// Start native screen recording using FFmpeg
#[tauri::command]
async fn start_recording(params: StartRecordingParams) -> Result<String, String> {
    use std::process::Command;
    
    let recording = RECORDING_PROCESS.get_or_init(|| Arc::new(Mutex::new(None)));
    
    // Handle poisoned lock by clearing it
    let mut process_guard = match recording.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            println!("⚠️ Lock was poisoned, recovering...");
            poisoned.into_inner()
        }
    };
    
    // If already recording, return error
    if process_guard.is_some() {
        return Err("Already recording".to_string());
    }
    
    let screen_idx = params.screen_index.unwrap_or(4); // Default to screen 0
    let webcam_idx = params.webcam_index.unwrap_or(0); // Default to first webcam
    
    let command_str = match params.recording_type.as_str() {
        "screen" => {
            // Simple screen recording with audio
            format!(
                "ffmpeg -f avfoundation -framerate 30 -i \"{}:0\" -c:v libx264 -preset ultrafast -crf 23 -c:a aac -b:a 128k \"{}\"",
                screen_idx, params.output_path
            )
        },
        "webcam" => {
            // Webcam recording with audio
            format!(
                "ffmpeg -f avfoundation -framerate 30 -video_size 1280x720 -i \"{}:0\" -c:v libx264 -preset ultrafast -crf 23 -c:a aac -b:a 128k \"{}\"",
                webcam_idx, params.output_path
            )
        },
        "pip" => {
            // Picture-in-picture: Screen with webcam overlay using filter_complex
            // Input format: "screen_index:audio_index|webcam_index:audio_index"
            // Scale webcam to 320x240 (small overlay), position based on pip_position
            let pip_x = match params.pip_position.as_ref().map(|s| s.as_str()) {
                Some("top-right") | Some("bottom-right") => "W-overlay_w-20",
                _ => "20", // top-left or bottom-left
            };
            let pip_y = match params.pip_position.as_ref().map(|s| s.as_str()) {
                Some("bottom-left") | Some("bottom-right") => "H-(overlay_h+20)",
                _ => "20", // top-left or top-right
            };
            
            format!(
                "ffmpeg -f avfoundation -framerate 30 -i \"{}:0\" -f avfoundation -framerate 30 -video_size 640x480 -i \"{}:0\" -filter_complex \"[1:v]scale=320:240[webcam];[0:v][webcam]overlay={}:{}:enable='between(t,0,999999)'\" -c:v libx264 -preset ultrafast -crf 23 -c:a aac -b:a 128k \"{}\"",
                screen_idx, webcam_idx, pip_x, pip_y, params.output_path
            )
        },
        _ => return Err("Invalid recording type".to_string()),
    };
    
    println!("Starting recording: {}", command_str);
    
    // Start the ffmpeg process
    let child = Command::new("sh")
        .arg("-c")
        .arg(&command_str)
        .spawn()
        .map_err(|e| format!("Failed to start ffmpeg: {}", e))?;
    
    *process_guard = Some(child);
    
    Ok(format!("Recording started to: {}", params.output_path))
}

// Stop the current recording
#[tauri::command]
async fn stop_recording() -> Result<String, String> {
    let recording = RECORDING_PROCESS.get_or_init(|| Arc::new(Mutex::new(None)));
    
    // Handle poisoned lock by clearing it
    let mut process_guard = match recording.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            println!("⚠️ Lock was poisoned during stop, recovering...");
            poisoned.into_inner()
        }
    };
    
    match process_guard.take() {
        Some(mut child) => {
            // Send SIGINT (Ctrl+C) to ffmpeg to stop recording gracefully
            let pid = child.id();
            
            // Use kill command on Unix systems (macOS/Linux)
            #[cfg(unix)]
            {
                use std::process::Command;
                Command::new("kill")
                    .arg("-INT")
                    .arg(&pid.to_string())
                    .output()
                    .ok();
            }
            
            // Wait for the process to finish
            let _ = child.wait();
            
            Ok("Recording stopped".to_string())
        }
        None => Err("No active recording".to_string()),
    }
}

// Check recording status
#[tauri::command]
async fn is_recording() -> Result<bool, String> {
    let recording = RECORDING_PROCESS.get_or_init(|| Arc::new(Mutex::new(None)));
    
    // Handle poisoned lock by clearing it
    let process_guard = match recording.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            println!("⚠️ Lock was poisoned during check, recovering...");
            poisoned.into_inner()
        }
    };
    
    Ok(process_guard.is_some())
}

// Read file content for blob creation
#[tauri::command]
async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            process_file, 
            export_video,
            export_video_with_pip,
            check_ffmpeg, 
            get_documents_path,
            start_recording,
            stop_recording,
            is_recording,
            read_file_bytes,
            list_devices
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}