# ⚠️ SmolVLM 本地推理方案已弃用

## 原因

SmolVLM-256M 虽然只有 256M 参数，但在普通 CPU 上的推理速度仍然**不合理**：
- **i7 CPU** 上单次推理需要 **30+ 秒**
- 用户体验非常差
- 无法满足实时交互需求

## 建议方案

**直接使用云 AI 服务的 OpenAI 兼容 API**：

### 推荐配置

1. **免费方案**：使用百度飞桨 AI Studio
   - 视觉模型：`ernie-4.5-vl-28b-a3b`
   - 文生图模型：`Stable-Diffusion-XL`
   - 免费额度：每月 100 万 tokens
   - API 地址：`https://aistudio.baidu.com/llm/lmapi/v3`

2. **其他云服务**：
   - OpenAI GPT-4V (需付费)
   - Claude Vision (需付费)
   - 其他支持 OpenAI 兼容格式的 API

### 配置步骤

1. 访问 [百度 AI Studio](https://aistudio.baidu.com/account/accessToken)
2. 获取 Access Token
3. 打开应用 → AI 配置
4. 填入对应的 API URL、Key 和模型名称
5. 点击"测试视觉模型"验证配置

## 已弃用的文件

- `smolvlm_server.py` - 本地 SmolVLM 推理服务（已过时）
- `start_smolvlm.py` - 启动脚本（已过时）

这些文件保留供参考，但不再使用。

## 后续计划

- [ ] 支持更多云服务集成
- [ ] 实现请求缓存优化
- [ ] 添加成本统计功能
