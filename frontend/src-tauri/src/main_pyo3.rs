// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use pyo3::prelude::*;
use std::sync::{Arc, Mutex};

struct AppState {
    backend_port: Arc<Mutex<Option<u16>>>,
}

// 使用 PyO3 初始化 Python 后端
fn initialize_python_backend() -> PyResult<u16> {
    // 初始化 Python
    pyo3::Python::initialize();
    
    #[allow(deprecated)]
    Python::with_gil(|py| {
        // 获取 sys 模块并添加 backend 目录到路径
        let sys = py.import("sys")?;
        let path = sys.getattr("path")?;
        
        // 获取应用程序根目录
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                println!("[PyO3] Executable directory: {}", exe_dir.display());
                
                // 计算项目根目录
                let project_root = exe_dir
                    .parent().unwrap() // debug
                    .parent().unwrap() // target
                    .parent().unwrap() // src-tauri
                    .parent().unwrap(); // frontend -> DrawSomethingAIPlatform
                
                let backend_path = project_root.join("backend");
                
                if backend_path.exists() {
                    println!("[PyO3] Found backend at: {}", backend_path.display());
                    let path_string = backend_path.to_string_lossy().to_string();
                    path.call_method1("insert", (0, path_string.clone()))?;
                    println!("[PyO3] Added to sys.path: {}", path_string);
                } else {
                    println!("[PyO3] Backend not found at: {}", backend_path.display());
                }
                
                // 添加虚拟环境的 site-packages
                let venv_site_packages = project_root.join("backend").join(".venv").join("Lib").join("site-packages");
                if venv_site_packages.exists() {
                    let venv_path_string = venv_site_packages.to_string_lossy().to_string();
                    path.call_method1("insert", (0, venv_path_string.clone()))?;
                    println!("[PyO3] Added venv site-packages to sys.path: {}", venv_path_string);
                } else {
                    println!("[PyO3] Venv site-packages not found at: {}", venv_site_packages.display());
                }
                
                // 打印最终的 sys.path
                println!("[PyO3] Final sys.path[0]: {:?}", path.get_item(0).ok());
            }
        }

        // 设置编码环境变量
        let os = py.import("os")?;
        os.getattr("environ")?
            .call_method1("setdefault", ("PYTHONIOENCODING", "utf-8"))?;

        // 导入并初始化后端
        match py.import("pyo3_backend") {
            Ok(backend_module) => {
                let port = backend_module.call_method0("initialize_backend")?.extract::<u16>()?;
                println!("[PyO3] Backend initialized on port: {}", port);
                Ok(port)
            }
            Err(e) => {
                eprintln!("[PyO3] Failed to import pyo3_backend: {}", e);
                Err(e)
            }
        }
    })
}

fn main() {
    println!("[PyO3] Starting Tauri application with embedded Python backend...");

    // 初始化 Python 后端
    let backend_port = match initialize_python_backend() {
        Ok(port) => {
            println!("[PyO3] Backend ready on port {}", port);
            port
        }
        Err(e) => {
            eprintln!("[PyO3] FATAL: Failed to initialize Python backend: {}", e);
            std::process::exit(1);
        }
    };

    tauri::Builder::default()
        .manage(AppState {
            backend_port: Arc::new(Mutex::new(Some(backend_port))),
        })
        .invoke_handler(tauri::generate_handler![get_backend_port, get_backend_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_backend_port(state: tauri::State<AppState>) -> u16 {
    state.backend_port.lock().unwrap().unwrap_or(0)
}

#[tauri::command]
fn get_backend_url(state: tauri::State<AppState>) -> String {
    let port = state.backend_port.lock().unwrap().unwrap_or(8002);
    format!("http://127.0.0.1:{}", port)
}