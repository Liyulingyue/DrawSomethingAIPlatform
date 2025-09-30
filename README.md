# DrawSomethingAIPlatform
基于AI的你画我猜游戏

## 配置说明

后端默认使用百度文心一言的多模态模型完成图像识别，请在运行前设置以下环境变量：

- `AI_STUDIO_API_KEY`：百度AI Studio 访问令牌，必填。从 https://aistudio.baidu.com/account/accessToken 获取。

若未配置上述变量，系统将回退到简单的提示词匹配启发式逻辑，仍可保证游戏流程正常体验。

### 自定义模型配置

前端支持配置OpenAI兼容的AI模型服务：

- `模型 URL`：API端点地址（必须是OpenAI兼容的API）
- `访问密钥`：API密钥（必填）
- `模型名称`：模型标识符
- `自定义提示词`：可选的提示词模板

支持的API包括：
- OpenAI官方API
- 百度AI Studio
- 其他OpenAI兼容服务（如Azure OpenAI、第三方代理等）

## 端口与前后端联调

后端默认监听 8002 端口，前端通过 `.env` 文件的 `VITE_API_BASE_URL` 变量指定后端地址（已默认指向 `http://localhost:8002`）。如需修改端口，请同步调整后端 `run.py` 和前端 `.env`。

### 环境配置

前端支持多环境配置：
- `.env.development`: 开发环境配置（默认指向 `http://localhost:8002`）
- `.env.production`: 生产环境配置（请替换为实际的生产 API 地址）

Vite 会根据运行模式自动加载对应的环境文件。

### 绘图数据格式

后端 `recognize_drawing` 接口支持两种图片入参：

1. 纯 base64 字符串（自动补全 `data:image/png;base64,` 前缀）。
2. 已经带有 `data:` 前缀的 Data URL。

前端或自测脚本可参考以下伪代码：

```python
from openai import OpenAI

client = OpenAI(
    api_key="<AI_STUDIO_API_KEY>",  # 百度AI Studio访问令牌
    base_url="https://aistudio.baidu.com/llm/lmapi/v3",
)

completion = client.chat.completions.create(
    model="ernie-4.5-8k-preview",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "请描述图片内容"},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64,<BASE64>"}},
            ],
        }
    ],
)
print(resp.choices[0].message)
```
