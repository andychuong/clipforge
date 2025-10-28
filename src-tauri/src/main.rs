// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
struct ExportProgress {
    progress: f64,
    stage: String,
}

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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![process_file, export_video, check_ffmpeg, get_documents_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}