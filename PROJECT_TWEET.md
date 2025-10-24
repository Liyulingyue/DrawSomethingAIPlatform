# DrawSomething 你画AI猜

🎨 基于AI的你画我猜小游戏 🎮

## 🖌️ 什么是 你画AI猜
你画我猜是一款经典的绘画猜词游戏，玩家通过绘画和猜词互动，享受创意与乐趣的碰撞！

具体游戏流程如下：
1. 玩家分为绘画者和猜词者。
2. 绘画者根据系统提供的词语进行绘画。
3. 猜词者根据绘画内容进行猜词，猜中得分。

你画AI猜，将传统你画我猜与 AI 技术相结合，在原有的基础上，加入了 AI 猜词功能，修改后游戏流程如下：
1. 玩家为绘画者，根据系统提供的词语进行绘画。
2. AI 作为猜词者，根据绘画内容进行猜词，猜中则绘画成功。

## 🔧 技术实现
- **前端**：基于 React + TypeScript 构建，UI 现代简洁。
- **后端**：使用 Python FastAPI 提供高效的 API 服务。
- **AI 集成**：支持 OpenAI 和百度文心大模型，智能生成绘画提示。

## 📦 完整项目部署指南
1. 克隆项目代码。[项目地址](https://github.com/Liyulingyue/DrawSomethingAIPlatform)
2. 配置 AI 模型参数（API Key、模型 URL 等）。
3. 启动前后端服务，开始游戏！

> 如果你不想部署，可以尝试在线体验：[你画AI猜](http://182.92.203.64:5175/app/home/)。这个在线链接可能会不定期更新、维护或失效，如果无法访问就是失效了~

## 应用实现（核心代码介绍）
因为项目采用了前后端分离架构（前端与Python基本没啥关系，所以无法在Aistudio上演示），完整代码请参考 GitHub 仓库：[DrawSomethingAIPlatform](https://github.com/Liyulingyue/DrawSomethingAIPlatform)。

### 使用 Ernie4.5 模型
使用Ernie4.5 模型进行绘画内容的识别和猜词，需要你配置好百度 AI Studio 的 API Key 和模型调用地址。
- 模型名称为 "ernie-4.5-vl-28b-a3b"
- 模型调用地址为 "https://aistudio.baidu.com/llm/lmapi/v3"
- API Key 需要从[百度 AI Studio](https://aistudio.baidu.com/account/accessToken) 获取

以下是调用 Ernie4.5 模型的核心代码片段，展示了如何通过 API 调用进行绘画内容的识别：

```python
# backend/app/services/ai.py
from openai import OpenAI

def _call_ernie_inference(image: str, prompt: str, model_name: Optional[str] = None) -> Dict[str, Any]:
    api_key = os.getenv("AI_STUDIO_API_KEY")
    client = OpenAI(
        api_key=api_key,
        base_url="https://aistudio.baidu.com/llm/lmapi/v3",
    )
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image, "detail": "high"}}
            ]
        }
    ]
    completion = client.chat.completions.create(
        model=model_name or "ernie-4.5-vl-28b-a3b",
        messages=messages,
        stream=False,
    )
    content = completion.choices[0].message.content
    return {"result": content}
```

### 提示词设计
提示词的设计是 AI 猜词准确性的关键。以下是生成提示词的代码片段：

```python
# backend/app/services/ai.py
def _build_instruction(clue: Optional[str], custom_prompt: Optional[str]) -> str:
    sections = ["请仅输出一个 JSON 代码块，严格按照以下格式返回："]
    if custom_prompt:
        sections.append(custom_prompt.strip())
    if clue:
        sections.append(f"猜词的参考线索：{clue}")
    sections.append("{" + "\n  \"best_guess\": \"最可能的中文词语或短语\",\n  \"alternatives\": [\"备选答案1\", \"备选答案2\"],\n  \"reason\": \"简要的中文解释\"\n}")
    return "\n\n".join(sections)
```

### 核心页面交互代码
#### 画板实现
以下是画板组件的核心代码，展示了如何实现绘画功能并实时获取绘画数据：

```typescript
// frontend/src/components/DrawBoard.tsx
function DrawBoard({ width, height, disabled = false, onDraw, externalImage }: DrawBoardProps, ref: React.Ref<DrawBoardRef>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || event.button !== 0) return
    const ctx = contextRef.current
    if (!ctx) return
    const { x, y } = getCanvasCoords(event.nativeEvent)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [disabled])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const ctx = contextRef.current
    if (!ctx) return
    const { x, y } = getCanvasCoords(event.nativeEvent)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing])

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const ctx = contextRef.current
    if (!ctx) return
    ctx.closePath()
    setIsDrawing(false)
    event.currentTarget.releasePointerCapture(event.pointerId)

    if (onDraw) {
      const image = canvasRef.current?.toDataURL('image/png')
      if (image) {
        onDraw(image)
      }
    }
  }, [isDrawing, onDraw])

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ border: '1px solid #ccc', borderRadius: '8px' }}
    />
  )
}
```
#### 提交绘画数据并获取 AI 猜词结果
以下是前端页面与后端交互的代码示例，展示了如何提交绘画数据并获取 AI 的猜词结果：

```typescript
// frontend/src/pages/AppDraw.tsx
const handleSubmitDrawing = async () => {
  const requestBody = {
    image: drawingData, // 用户绘制的内容以 Base64 格式发送
    target: targetWord, // 当前绘画目标词语
    config: {
      url: "https://aistudio.baidu.com/llm/lmapi/v3", // 后端调用的 AI 模型地址
      key: apiKey, // API Key 用于身份验证
      model: "ernie-4.5-vl-28b-a3b", // 使用的 AI 模型名称
    },
  };
  const response = await fetch("/api/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const result = await response.json();
  console.log("AI 猜词结果:", result);
};
```

