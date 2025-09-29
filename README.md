# DrawSomethingAIPlatform
基于AI的你画我猜游戏

## 配置说明

后端默认使用 OpenAI 的多模态模型完成图像识别，请在运行前设置以下环境变量：

- `OPENAI_API_KEY`：OpenAI 密钥，必填。
- `OPENAI_API_BASE`：可选，自定义 API Base（如使用兼容 OpenAI 的代理服务）。
- `OPENAI_VISION_MODEL`：可选，默认为 `gpt-4o-mini`。
- `OPENAI_VISION_PROMPT`：可选，自定义提示词模板，使用 `{hint}` 占位符表示游戏中的提示词。

若未配置上述变量，系统将回退到简单的提示词匹配启发式逻辑，仍可保证游戏流程正常体验。

### 绘图数据格式

后端 `recognize_drawing` 接口支持两种图片入参：

1. 纯 base64 字符串（自动补全 `data:image/png;base64,` 前缀）。
2. 已经带有 `data:` 前缀的 Data URL。

前端或自测脚本可参考以下伪代码：

```python
from openai import OpenAI

client = OpenAI(api_key="<OPENAI_API_KEY>")
resp = client.chat.completions.create(
	model="gpt-4o-mini",
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
