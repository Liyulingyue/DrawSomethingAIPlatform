// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, api::process::{Command, CommandEvent, CommandChild}};
use std::sync::{Arc, Mutex};
use std::net::{TcpStream, TcpListener};
use std::io::{Write, Read};
use std::time::Duration;
use std::collections::HashMap;

// 查找可用端口
fn find_available_port(start_port: u16) -> Option<u16> {
    for port in start_port..start_port + 100 {
        if TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok() {
            return Some(port);
        }
    }
    None
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

    fn should_try_parse_port(line: &str) -> bool {
        let lower = line.to_lowercase();
        line.contains("[PORT]")
            || lower.contains("backend port")
            || lower.contains(" port ")
            || lower.contains("://127.0.0.1")
            || lower.contains("uvicorn running on")
    }

    fn is_error_stderr(line: &str) -> bool {
        let lower = line.to_lowercase();
        !(lower.starts_with("info")
            || lower.contains("[info]")
            || line.contains("[PORT]")
            || lower.contains("uvicorn running on")
            || lower.contains("application startup complete")
            || lower.contains("waiting for application startup"))
    }

// 发送 shutdown 请求到后端
fn send_shutdown_request(port: u16, timeout_ms: u64) -> Result<(), Box<dyn std::error::Error>> {
    let addr = format!("127.0.0.1:{}", port);
    let mut stream = TcpStream::connect_timeout(&addr.parse()?, Duration::from_millis(timeout_ms))?;
    
    let request = format!(
        "POST /api/admin/shutdown HTTP/1.1\r\n\
         Host: 127.0.0.1:{}\r\n\
         Content-Type: application/json\r\n\
         Content-Length: 0\r\n\
         Connection: close\r\n\
         \r\n",
        port
    );
    
    stream.write_all(request.as_bytes())?;
    stream.flush()?;
    
    // 读取响应（简单检查）
    let mut buffer = [0; 1024];
    let _ = stream.read(&mut buffer)?;
    
    Ok(())
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

// Tauri 命令：获取 llama-server URL
#[tauri::command]
fn get_llama_url(state: tauri::State<AppState>) -> Option<String> {
    let port = state.llama_port.lock().unwrap();
    match *port {
        Some(p) => Some(format!("http://127.0.0.1:{}", p)),
        None => None,
    }
}

// Tauri 命令：检查 llama-server 是否已启动
#[tauri::command]
fn is_llama_ready(state: tauri::State<AppState>) -> bool {
    state.llama_port.lock().unwrap().is_some()
}

// Tauri 命令：带健康检查的启动 llama-server
#[tauri::command]
async fn start_llama_server(app_handle: tauri::AppHandle) -> Result<HashMap<String, serde_json::Value>, String> {
    let state: tauri::State<AppState> = app_handle.state();
    
    let mut result = HashMap::new();
    
    // 检查是否已经启动
    if let Some(port) = *state.llama_port.lock().unwrap() {
        let url = format!("http://127.0.0.1:{}", port);
        result.insert("url".to_string(), serde_json::json!(url));
        result.insert("ready".to_string(), serde_json::json!(true));
        result.insert("message".to_string(), serde_json::json!("模型已在运行"));
        return Ok(result);
    }
    
    // 获取模型路径
    let resource_path = app_handle.path_resolver()
        .resource_dir()
        .ok_or("无法获取资源目录")?;
    
    let model_path = resource_path.join("models").join("Qwen3VL-2B-Instruct")
        .join("Qwen3VL-2B-Instruct-Q8_0.gguf");
    let mmproj_path = resource_path.join("models").join("Qwen3VL-2B-Instruct")
        .join("mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf");
    
    // 检查模型文件是否存在
    if !model_path.exists() || !mmproj_path.exists() {
        result.insert("ready".to_string(), serde_json::json!(false));
        result.insert("message".to_string(), serde_json::json!("模型文件不存在"));
        return Ok(result);
    }
    
    // 查找可用端口
    let llama_server_port = find_available_port(8080)
        .ok_or("无法找到可用端口")?;
    
    println!("按需启动 llama-server，端口: {}", llama_server_port);
    
    // 启动 llama-server
    let command = Command::new_sidecar("llama-server")
        .map_err(|e| format!("创建命令失败: {}", e))?;
    
    let args = vec![
        "--model".to_string(),
        model_path.to_string_lossy().to_string(),
        "--mmproj".to_string(),
        mmproj_path.to_string_lossy().to_string(),
        "--host".to_string(),
        "127.0.0.1".to_string(),
        "--port".to_string(),
        llama_server_port.to_string(),
        "--ctx-size".to_string(),
        "4096".to_string(),
        "--threads".to_string(),
        "4".to_string(),
    ];
    
    let (mut rx, child) = command.args(&args).spawn()
        .map_err(|e| format!("启动失败: {}", e))?;
    
    // 保存进程句柄和端口
    *state.llama_child.lock().unwrap() = Some(child);
    *state.llama_port.lock().unwrap() = Some(llama_server_port);
    
    let llama_port_arc = state.llama_port.clone();
    
    // 监听进程输出
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[llama-server] {}", line);
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[llama-server] {}", line);
                }
                CommandEvent::Error(err) => {
                    eprintln!("[llama-server 错误] {}", err);
                }
                CommandEvent::Terminated(payload) => {
                    println!("[llama-server] 进程终止，退出码: {:?}", payload.code);
                    *llama_port_arc.lock().unwrap() = None;
                }
                _ => {}
            }
        }
    });
    
    let url = format!("http://127.0.0.1:{}", llama_server_port);
    
    // 等待服务就绪（最多等待 30 秒）
    let max_wait = 30;
    let mut ready = false;
    
    for i in 0..max_wait {
        std::thread::sleep(Duration::from_secs(1));
        
        // 尝试连接
        if TcpStream::connect_timeout(
            &format!("127.0.0.1:{}", llama_server_port).parse().unwrap(),
            Duration::from_secs(1)
        ).is_ok() {
            ready = true;
            println!("[llama-server] 服务已就绪，耗时 {} 秒", i + 1);
            break;
        }
    }
    
    result.insert("url".to_string(), serde_json::json!(url));
    result.insert("ready".to_string(), serde_json::json!(ready));
    result.insert("message".to_string(), serde_json::json!(if ready { "模型加载成功" } else { "模型加载中，请稍后" }));
    
    Ok(result)
}

// 清理 PyInstaller 临时文件
fn cleanup_pyinstaller_temp() {
    #[cfg(target_os = "windows")]
    {
        // 清理 PyInstaller --onefile 创建的 _MEI* 临时目录
        // 由于后端被强制终止，它的 atexit 清理不会执行，所以我们需要在这里清理
        
        // 等待一下，确保后端进程完全终止
        std::thread::sleep(std::time::Duration::from_millis(500));
        
        if let Ok(temp_dir) = std::env::var("TEMP") {
            #[cfg(debug_assertions)]
            println!("🔍 检查临时目录: {}", temp_dir);
            
            if let Ok(entries) = std::fs::read_dir(&temp_dir) {
                let mut cleaned = 0;
                for entry in entries.flatten() {
                    if let Ok(metadata) = entry.metadata() {
                        if metadata.is_dir() {
                            if let Some(file_name) = entry.file_name().to_str() {
                                // 只清理 _MEI 开头的目录
                                if file_name.starts_with("_MEI") {
                                    let path = entry.path();
                                    
                                    // 检查这个目录是否已经不被使用（没有进程占用）
                                    // 通过尝试删除来判断
                                    #[cfg(debug_assertions)]
                                    println!("🗑️ 尝试删除 PyInstaller 临时目录: {}", file_name);
                                    
                                    match std::fs::remove_dir_all(&path) {
                                        Ok(_) => {
                                            cleaned += 1;
                                            #[cfg(debug_assertions)]
                                            println!("✅ 已删除: {}", file_name);
                                        }
                                        Err(e) => {
                                            // 目录可能仍在使用中（有其他进程）或权限问题
                                            #[cfg(debug_assertions)]
                                            println!("⚠️ 无法删除 {} (可能仍在使用): {}", file_name, e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                #[cfg(debug_assertions)]
                if cleaned > 0 {
                    println!("✅ 共清理了 {} 个 PyInstaller 临时目录", cleaned);
                }
            }
        }
    }
}

struct AppState {
    backend_port: Arc<Mutex<Option<u16>>>,
    backend_child: Arc<Mutex<Option<CommandChild>>>,
    llama_port: Arc<Mutex<Option<u16>>>,
    llama_child: Arc<Mutex<Option<CommandChild>>>,
}

// 清理函数：清理临时文件
fn cleanup_backend(app_handle: &tauri::AppHandle) {
    #[cfg(debug_assertions)]
    println!("清理进程...");
    
    let state: tauri::State<AppState> = app_handle.state();

    // 清理 backend 进程（shutdown 请求失败时的兜底）
    {
        let mut backend_child = state.backend_child.lock().unwrap();
        if let Some(mut child) = backend_child.take() {
            #[cfg(debug_assertions)]
            println!("正在杀死 backend 进程...");
            #[cfg(target_os = "windows")]
            {
                let pid = child.pid();
                let _ = std::process::Command::new("taskkill")
                    .args(&["/F", "/T", "/PID", &pid.to_string()])
                    .output();
            }
            #[cfg(not(target_os = "windows"))]
            { let _ = child.kill(); }
        }
    }
    
    // 清理 llama-server
    {
        let mut llama_child = state.llama_child.lock().unwrap();
        if let Some(mut child) = llama_child.take() {
            #[cfg(debug_assertions)]
            println!("正在杀死 llama-server 进程...");
            #[cfg(target_os = "windows")]
            {
                let pid = child.pid();
                let _ = std::process::Command::new("taskkill")
                    .args(&["/F", "/T", "/PID", &pid.to_string()])
                    .output();
            }
            #[cfg(not(target_os = "windows"))]
            { let _ = child.kill(); }
        }
    }

    // 清理 PyInstaller 临时文件
    cleanup_pyinstaller_temp();

    #[cfg(debug_assertions)]
    println!("✅ 临时文件清理完成");
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            backend_port: Arc::new(Mutex::new(None)),
            backend_child: Arc::new(Mutex::new(None)),
            llama_port: Arc::new(Mutex::new(None)),
            llama_child: Arc::new(Mutex::new(None)),
        })
        .setup(|app| {
            // 仅在调试模式下打印启动信息
            #[cfg(debug_assertions)]
            println!("=== 应用启动中 ===");
            
            let app_handle = app.handle();
            let state: tauri::State<AppState> = app_handle.state();
            let backend_port = state.backend_port.clone();
            
            // 检查是否已经有后端进程在运行
            {
                let backend_child = state.backend_child.lock().unwrap();
                if backend_child.is_some() {
                    #[cfg(debug_assertions)]
                    println!("⚠️ 后端进程已经在运行，跳过启动");
                    return Ok(());
                }
            }
            
            // 启动后端 sidecar
            #[cfg(debug_assertions)]
            println!("启动后端服务...");
            #[cfg(debug_assertions)]
            println!("[调试] 准备启动 backend sidecar");
            
            match Command::new_sidecar("DrawSomethingBackend") {
                Ok(command) => {
                    #[cfg(debug_assertions)]
                    println!("[调试] Sidecar 命令创建成功");
                    match command.spawn() {
                        Ok((mut rx, child)) => {
                            // 保存后端进程句柄以便后续终止
                            let backend_child_arc = state.backend_child.clone();
                            *backend_child_arc.lock().unwrap() = Some(child);
                            
                            #[cfg(debug_assertions)]
                            println!("✅ 后端进程已启动并保存句柄");
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
                                            if is_error_stderr(&line) {
                                                eprintln!("[后端错误] {}", line);
                                            } else {
                                                println!("[后端] {}", line);
                                            }

                                            // 仅对可能包含端口的 stderr 行做解析，减少噪音
                                            if !port_found && should_try_parse_port(&line) {
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
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    #[cfg(debug_assertions)]
                    println!("🔴 窗口关闭请求,发送 shutdown 请求到后端...");
                    
                    // 阻止默认关闭行为
                    api.prevent_close();
                    
                    let window = event.window().clone();
                    let app_handle = window.app_handle();
                    
                    // 发送关闭请求事件到前端
                    let _ = window.emit("tauri://close-requested", ());
                    
                    // 立即隐藏窗口，让用户感觉快速关闭
                    let _ = window.hide();
                    
                    // 在新线程中发送 shutdown 请求，清理文件，然后关闭窗口
                    std::thread::spawn(move || {
                        #[cfg(debug_assertions)]
                        println!("🔴 发送 shutdown 请求到后端...");
                        
                        let state: tauri::State<AppState> = app_handle.state();
                        
                        // 发送 shutdown 请求到后端
                        if let Some(port) = *state.backend_port.lock().unwrap() {
                            #[cfg(debug_assertions)]
                            println!("🔴 发送 shutdown 请求到端口 {}", port);
                            let _ = send_shutdown_request(port, 500); // 500ms timeout
                        }
                        
                        // 清理临时文件
                        #[cfg(debug_assertions)]
                        println!("🧹 清理临时文件...");
                        cleanup_backend(&app_handle);
                        
                        #[cfg(debug_assertions)]
                        println!("✅ 清理完成，关闭窗口");
                        
                        // 关闭窗口
                        let _ = window.close();
                    });
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![get_backend_url, get_llama_url, is_llama_ready, start_llama_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}