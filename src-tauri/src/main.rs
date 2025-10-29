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

#[derive(Debug, Serialize, Deserialize)]
struct StartRecordingParams {
    output_path: String,
    recording_type: String, // "screen", "webcam", or "both"
}

// Start native screen recording using FFmpeg
#[tauri::command]
async fn start_recording(params: StartRecordingParams) -> Result<String, String> {
    use std::process::Command;
    
    let recording = RECORDING_PROCESS.get_or_init(|| Arc::new(Mutex::new(None)));
    let mut process_guard = recording.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    // If already recording, return error
    if process_guard.is_some() {
        return Err("Already recording".to_string());
    }
    
    // Build ffmpeg command based on recording type
    // Device list: [0] MacBook Pro Camera, [1] iPhone Camera, [2-3] Desk View Cameras, [4] Capture screen 0, [5] Capture screen 1
    let command_str = match params.recording_type.as_str() {
        "screen" => format!(
            "ffmpeg -f avfoundation -framerate 30 -video_size 1920x1080 -i \"4\" -pix_fmt yuv420p -c:v libx264 -preset ultrafast -crf 28 \"{}\"",
            params.output_path
        ),
        "webcam" => format!(
            "ffmpeg -f avfoundation -framerate 30 -video_size 1280x720 -i \"0:0\" -pix_fmt yuv420p -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k \"{}\"",
            params.output_path
        ),
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
    let mut process_guard = recording.lock().map_err(|e| format!("Lock error: {}", e))?;
    
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
    let process_guard = recording.lock().map_err(|e| format!("Lock error: {}", e))?;
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
            check_ffmpeg, 
            get_documents_path,
            start_recording,
            stop_recording,
            is_recording,
            read_file_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}