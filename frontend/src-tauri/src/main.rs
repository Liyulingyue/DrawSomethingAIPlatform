// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, api::process::{Command, CommandEvent}};
use std::sync::{Arc, Mutex};

struct AppState {
    backend_port: Arc<Mutex<Option<u16>>>,
}

// 从日志行中解析端口号
fn parse_port_from_line(line: &str) -> Option<u16> {
    println!("[调试] parse_port_from_line 输入: {}", line);
    
    // 优先检查 [PORT] 标记
    if line.contains("[PORT]") {
        // 提取 [PORT] 后面的数字
        if let Some(start) = line.find("[PORT]") {
            let after_tag = &line[start..];
            let numbers: String = after_tag.chars().filter(|c| c.is_numeric()).collect();
            if let Ok(port) = numbers.parse::<u16>() {
                if port > 1024 && port < 65535 {
                    println!("[调试] 从 [PORT] 标记找到有效端口: {}", port);
                    return Some(port);
                }
            }
        }
    }
    
    // 使用正则表达式的替代方案:提取所有连续的数字
    let mut numbers = Vec::new();
    let mut current_num = String::new();
    
    for ch in line.chars() {
        if ch.is_numeric() {
            current_num.push(ch);
        } else {
            if !current_num.is_empty() {
                if let Ok(num) = current_num.parse::<u16>() {
                    numbers.push(num);
                }
                current_num.clear();
            }
        }
    }
    // 处理最后一个数字
    if !current_num.is_empty() {
        if let Ok(num) = current_num.parse::<u16>() {
            numbers.push(num);
        }
    }
    
    println!("[调试] 提取到的所有数字: {:?}", numbers);
    
    // 查找有效的端口号(1024-65535)
    // 优先选择关键字明确的端口
    for num in &numbers {
        if *num > 1024 && *num < 65535 {
            if line.contains("port") || line.contains("端口") || line.contains("://127.0.0.1") {
                println!("[调试] 找到有效端口: {}", num);
                return Some(*num);
            }
        }
    }
    
    // 如果没有关键字,选择最后一个有效的端口号(通常是最相关的)
    for num in numbers.iter().rev() {
        if *num > 1024 && *num < 65535 {
            println!("[调试] 找到有效端口: {}", num);
            return Some(*num);
        }
    }
    
    println!("[调试] 未能从此行解析出有效端口");
    None
}

// Tauri 命令：获取后端 URL
#[tauri::command]
fn get_backend_url(state: tauri::State<AppState>) -> String {
    println!("[调试] get_backend_url 被调用");
    let port = state.backend_port.lock().unwrap();
    println!("[调试] 当前后端端口状态: {:?}", *port);
    match *port {
        Some(p) => {
            println!("✅ 返回后端地址: http://127.0.0.1:{}", p);
            format!("http://127.0.0.1:{}", p)
        },
        None => {
            println!("⚠️  后端端口未设置，使用默认地址 http://localhost:8002");
            "http://localhost:8002".to_string()
        }
    }
}

// 清理函数：清理后端状态
fn cleanup_backend(_app_handle: &tauri::AppHandle) {
    #[cfg(debug_assertions)]
    println!("🔴 应用关闭中,后端进程将自动清理...");
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            backend_port: Arc::new(Mutex::new(None)),
        })
        .setup(|app| {
            // 仅在调试模式下打印启动信息
            #[cfg(debug_assertions)]
            println!("=== 应用启动中 ===");
            
            let app_handle = app.handle();
            let state: tauri::State<AppState> = app_handle.state();
            let backend_port = state.backend_port.clone();
            
            // 启动后端 sidecar
            #[cfg(debug_assertions)]
            println!("启动后端服务...");
            #[cfg(debug_assertions)]
            println!("[调试] 准备启动 backend sidecar");
            
            match Command::new_sidecar("backend") {
                Ok(command) => {
                    #[cfg(debug_assertions)]
                    println!("[调试] Sidecar 命令创建成功");
                    match command.spawn() {
                        Ok((mut rx, _child)) => {
                            // CommandChild 会在 Drop 时自动清理，不需要手动保存
                            #[cfg(debug_assertions)]
                            println!("✅ 后端进程已启动");
                            #[cfg(debug_assertions)]
                            println!("[调试] 开始监听后端输出...");
                            
                            // 为异步任务克隆一份
                            let backend_port_async = backend_port.clone();
                            
                            // 异步读取后端输出
                            tauri::async_runtime::spawn(async move {
                                let mut port_found = false;
                                #[cfg(debug_assertions)]
                                println!("[调试] 异步任务已启动,开始接收后端事件");
                                
                                while let Some(event) = rx.recv().await {
                                    match event {
                                        CommandEvent::Stdout(line) => {
                                            // 始终打印后端输出（用于调试）
                                            println!("[后端] {}", line);
                                            
                                            // 尝试从输出中解析端口号
                                            if !port_found {
                                                println!("[调试] 尝试从 stdout 解析端口: {}", line);
                                                if let Some(port) = parse_port_from_line(&line) {
                                                    println!("✅ 从 stdout 检测到后端端口: {}", port);
                                                    *backend_port_async.lock().unwrap() = Some(port);
                                                    port_found = true;
                                                } else {
                                                    println!("[调试] 此行未能解析出端口");
                                                }
                                            }
                                        }
                                        CommandEvent::Stderr(line) => {
                                            // 始终打印后端错误输出（用于调试）
                                            eprintln!("[后端错误] {}", line);
                                            
                                            // 也尝试从 stderr 解析端口(uvicorn 输出在这里)
                                            if !port_found {
                                                println!("[调试] 尝试从 stderr 解析端口: {}", line);
                                                if let Some(port) = parse_port_from_line(&line) {
                                                    println!("✅ 从 stderr 检测到后端端口: {}", port);
                                                    *backend_port_async.lock().unwrap() = Some(port);
                                                    port_found = true;
                                                } else {
                                                    println!("[调试] 此行未能解析出端口");
                                                }
                                            }
                                        }
                                        CommandEvent::Error(err) => {
                                            eprintln!("[后端进程错误] {}", err);
                                        }
                                        CommandEvent::Terminated(payload) => {
                                            println!("[后端] 进程终止，退出码: {:?}", payload.code);
                                        }
                                        _ => {}
                                    }
                                }
                                
                                // 如果后端进程退出后仍未获取到端口,尝试从文件读取
                                if backend_port_async.lock().unwrap().is_none() {
                                    #[cfg(debug_assertions)]
                                    println!("后端退出,尝试从文件读取端口信息...");
                                    if let Some(data_dir) = dirs::data_local_dir() {
                                        let port_file = data_dir.join("DrawSomethingAI").join("server_info.json");
                                        if port_file.exists() {
                                            if let Ok(content) = std::fs::read_to_string(&port_file) {
                                                if let Ok(info) = serde_json::from_str::<serde_json::Value>(&content) {
                                                    if let Some(port) = info["backend_port"].as_u64() {
                                                        #[cfg(debug_assertions)]
                                                        println!("✅ 从文件读取到端口: {}", port);
                                                        *backend_port_async.lock().unwrap() = Some(port as u16);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            });
                            
                            // 立即返回,不阻塞窗口 - 前端会通过轮询检查端口
                            #[cfg(debug_assertions)]
                            println!("✅ 后端启动任务已提交到后台,主线程立即返回以保持窗口响应");
                        }
                        Err(e) => {
                            #[cfg(debug_assertions)]
                            eprintln!("❌ 启动后端进程失败: {}", e);
                        }
                    }
                }
                Err(e) => {
                    #[cfg(debug_assertions)]
                    eprintln!("❌ 创建后端命令失败: {}", e);
                }
            }
            
            #[cfg(debug_assertions)]
            println!("=== 应用初始化完成 ===");
            Ok(())
        })
        .on_window_event(|event| {
            // 监听窗口关闭事件
            match event.event() {
                tauri::WindowEvent::CloseRequested { .. } => {
                    #[cfg(debug_assertions)]
                    println!("🔴 窗口关闭中,杀死后端进程...");
                    
                    cleanup_backend(&event.window().app_handle());
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![get_backend_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

