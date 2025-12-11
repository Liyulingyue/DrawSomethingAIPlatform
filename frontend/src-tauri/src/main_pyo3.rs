// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use pyo3::prelude::*;
use std::sync::{Arc, Mutex};
use tauri::{Manager, Window};

struct AppState {
    backend_port: Arc<Mutex<Option<u16>>>,
}

// 初始化 Python 解释器和后端
fn initialize_python_backend() -> PyResult<u16> {
    pyo3::prepare_freethreaded_python();

    Python::with_gil(|py| {
        // 添加 Python 路径
        let sys = py.import("sys")?;
        let path = sys.getattr("path")?;

        // 获取当前可执行文件目录
        let exe_path = std::env::current_exe()?;
        let exe_dir = exe_path.parent().unwrap();

        // 在开发和生产环境中查找 backend 目录
        let backend_paths = vec![
            // 生产环境：backend 目录在可执行文件同级
            exe_dir.join("backend"),
            // 开发环境：backend 目录在项目根目录
            exe_dir.join("../../../backend"),
            // 另一种开发环境路径
            exe_dir.join("../../backend"),
        ];

        let mut backend_found = false;
        for backend_path in backend_paths {
            if backend_path.exists() {
                let backend_path_str = backend_path.canonicalize()
                    .unwrap_or(backend_path)
                    .to_string_lossy()
                    .to_string();
                path.call_method1("insert", (0, backend_path_str.as_str()))?;
                println!("[PyO3] Added backend path: {}", backend_path_str);
                backend_found = true;
                break;
            }
        }

        if !backend_found {
            println!("[PyO3] Warning: backend directory not found, trying current directory");
            // 如果找不到，尝试当前目录
            path.call_method1("insert", (0, "."))?;
        }

        // 导入后端模块
        let backend_module = py.import("pyo3_backend")?;
        println!("[PyO3] Backend module imported successfully");

        // 初始化后端
        let port: u16 = backend_module
            .getattr("initialize_backend")?
            .call0()?
            .extract()?;

        println!("[PyO3] Backend initialized on port: {}", port);
        Ok(port)
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
            eprintln!("[PyO3] Failed to initialize Python backend: {}", e);
            std::process::exit(1);
        }
    };

    tauri::Builder::default()
        .manage(AppState {
            backend_port: Arc::new(Mutex::new(Some(backend_port))),
        })
        .invoke_handler(tauri::generate_handler![get_backend_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_backend_port(state: tauri::State<AppState>) -> u16 {
    state.backend_port.lock().unwrap().unwrap_or(0)
}