/**
 * API 配置 - 自动适配 Web 和 Tauri 环境
 */

// 检测是否在 Tauri 环境中
export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// 获取后端 API 基础 URL
export const getApiBaseUrl = async (): Promise<string> => {
  if (isTauri()) {
    // Tauri 模式：从 Rust 获取动态端口，持续等待直到就绪
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      
      // 持续轮询等待后端端口就绪
      const retryDelay = 500; // 500ms
      let attemptCount = 0;
      
      while (true) {
        attemptCount++;
        const backendUrl = await invoke<string>('get_backend_url');
        
        // 检查是否获取到有效端口（不是默认的 localhost:8002）
        if (backendUrl && !backendUrl.includes('localhost:8002')) {
          const apiUrl = `${backendUrl}/api`;
          console.log(`🎯 Tauri 模式 - 后端地址获取成功 (等待了 ${attemptCount} 次):`, apiUrl);
          return apiUrl;
        }
        
        console.log(`⏳ 等待后端端口就绪... (尝试 ${attemptCount} 次)`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      console.error('❌ 获取后端地址失败，使用默认值:', error);
      return 'http://localhost:8002/api';
    }
  } else {
    // Web 模式：使用相对路径，前缀为 /api
    // 开发环境：通过 vite.config.ts 的 proxy 转发
    // 生产环境：通过 Nginx 反向代理转发
    const baseUrl = '/api';
    console.log('🌐 Web 模式 - 后端地址:', baseUrl);
    return baseUrl;
  }
};

// 单例模式缓存 API 基础 URL
let cachedApiBaseUrl: string | null = null;
let cachedLlamaUrl: string | null = null;

// 获取 llama-server URL（本地模型服务）
export const getLlamaUrl = async (): Promise<string | null> => {
  if (!isTauri()) {
    return null;
  }
  
  try {
    const { invoke } = await import('@tauri-apps/api/tauri');
    
    // 等待 llama-server 就绪（最多等待 30 秒）
    const maxAttempts = 60;
    const retryDelay = 500;
    
    for (let i = 0; i < maxAttempts; i++) {
      const llamaUrl = await invoke<string | null>('get_llama_url');
      if (llamaUrl) {
        console.log('llama-server 地址:', llamaUrl);
        cachedLlamaUrl = llamaUrl;
        return llamaUrl;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    
    console.log('llama-server 未启动或模型不存在');
    return null;
  } catch (error) {
    console.error('获取 llama-server 地址失败:', error);
    return null;
  }
};

// 获取缓存的 llama-server URL
export const getLlamaUrlSync = (): string | null => {
  return cachedLlamaUrl;
};

// 检查 llama-server 是否就绪
export const isLlamaReady = async (): Promise<boolean> => {
  if (!isTauri()) {
    return false;
  }
  
  try {
    const { invoke } = await import('@tauri-apps/api/tauri');
    return await invoke<boolean>('is_llama_ready');
  } catch {
    return false;
  }
};

// 按需启动 llama-server
export interface LlamaServerResult {
  url: string | null;
  ready: boolean;
  message: string;
}

export const startLlamaServer = async (): Promise<LlamaServerResult | null> => {
  if (!isTauri()) {
    return null;
  }
  
  try {
    const { invoke } = await import('@tauri-apps/api/tauri');
    const result = await invoke<{ url: string; ready: boolean; message: string }>('start_llama_server');
    if (result && result.url) {
      cachedLlamaUrl = result.url;
    }
    return result;
  } catch (error) {
    console.error('启动 llama-server 失败:', error);
    return null;
  }
};

export const getApiBaseUrlSync = (): string => {
  if (cachedApiBaseUrl) {
    console.log('👾 使用缓存的 API 地址:', cachedApiBaseUrl);
    return cachedApiBaseUrl;
  }
  // 如果尚未初始化，返回默认值
  const defaultUrl = 'http://localhost:8002';
  console.log('⚠️ API 未初始化，使用默认地址:', defaultUrl);
  return defaultUrl;
};

// 初始化 API 配置（应用启动时调用）
export const initApiConfig = async (): Promise<void> => {
  console.log('🚀 开始初始化 API 配置...');
  cachedApiBaseUrl = await getApiBaseUrl();
  console.log('✅ API 配置完成，缓存地址:', cachedApiBaseUrl);
};

// 构建完整 API URL
export const buildApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrlSync();
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

export default {
  isTauri,
  getApiBaseUrl,
  getApiBaseUrlSync,
  initApiConfig,
  buildApiUrl,
  getLlamaUrl,
  getLlamaUrlSync,
  isLlamaReady,
  startLlamaServer,
};
