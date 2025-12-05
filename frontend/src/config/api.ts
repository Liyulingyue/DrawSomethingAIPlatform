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
    // Tauri 模式：从 Rust 获取动态端口
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const backendUrl = await invoke<string>('get_backend_url');
      console.log('🎯 Tauri 模式 - 后端地址:', backendUrl);
      return backendUrl;
    } catch (error) {
      console.error('❌ 获取后端地址失败，使用默认值:', error);
      return 'http://localhost:8002';
    }
  } else {
    // Web 模式：使用环境变量或默认值
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002';
    console.log('🌐 Web 模式 - 后端地址:', baseUrl);
    return baseUrl;
  }
};

// 单例模式缓存 API 基础 URL
let cachedApiBaseUrl: string | null = null;

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
};
