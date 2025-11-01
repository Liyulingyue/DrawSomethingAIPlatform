from fastapi import APIRouter
from pydantic import BaseModel
from ..services.ai import guess_drawing
from ..shared import get_user_by_session
from ..database import SessionLocal
import random
import openai

router = APIRouter(prefix="/ai", tags=["ai"])


class ModelConfig(BaseModel):
    url: str | None = None
    key: str | None = None
    model: str | None = None
    prompt: str | None = None


class GuessRequest(BaseModel):
    image: str
    clue: str | None = None
    hint: str | None = None  # legacy payload key
    target: str | None = None  # 绘制目标，用于判断是否猜中
    config: ModelConfig | None = None
    call_preference: str | None = None  # 调用偏好: 'custom' 或 'server'
    session_id: str | None = None  # 用户会话ID


@router.post("/guess")
@router.post("/recognize")
async def guess(req: GuessRequest):
    """Call ERNIE vision-language model (or fallback heuristic) to guess drawing content."""
    
    # 新增：判断会话有效性和服务点
    user = None
    session_id = getattr(req, 'session_id', None)  # 如果前端传递了session_id
    if session_id:
        user = get_user_by_session(session_id)
    calls_remaining = getattr(user, "calls_remaining", 0) if user else 0
    session_valid = user is not None
    # 判断调用偏好
    call_preference = (req.call_preference or "server").lower()

    # 业务逻辑：优先服务器调用
    use_server = session_valid and call_preference == "server" and calls_remaining > 0
    use_custom = not use_server

    # 提取线索信息
    clue = req.clue or req.hint

    # TODO: 实际调用大模型/自定义服务的代码应在此分支实现
    if use_server:
        # 调用服务器配置的大模型
        result = guess_drawing(req.image, clue, None, req.target, "server")
        
        # 如果调用成功，扣除一点
        if result.get("success"):
            # 扣除用户点数
            user.calls_remaining -= 1
            db = SessionLocal()
            try:
                db.commit()
                print(f"🔹 用户 {user.username} 服务器调用成功，剩余点数: {user.calls_remaining}")
            except Exception as e:
                db.rollback()
                print(f"❌ 扣除点数失败: {e}")
            finally:
                db.close()
        
        return result
    else:
        # 调用自定义服务
        result = guess_drawing(req.image, clue, req.config.dict(exclude_none=True) if req.config else None, req.target, "custom")
        return result


# 随机绘制目标列表
DRAWING_TARGETS = [
    "苹果", "香蕉", "梨子", "房子", "窗户", "树木", "汽车", "自行车",
    "猫", "狗", "鸟", "鱼", "太阳", "月亮", "星星", "云朵",
    "花朵", "草地", "山脉", "河流", "海洋", "天空", "彩虹", "雨伞",
    "书本", "铅笔", "电脑", "手机", "椅子", "桌子", "门", "钥匙",
    "钟表", "眼镜", "帽子", "鞋子", "手套", "围巾", "杯子", "盘子",
    "面包", "蛋糕", "披萨", "汉堡", "冰激凌", "咖啡", "茶杯", "啤酒",
    "足球", "篮球", "网球", "棒球", "游泳池", "跑步", "跳跃", "舞蹈"
]


@router.get("/random-target")
async def get_random_target():
    """Get a random drawing target for single player testing."""
    target = random.choice(DRAWING_TARGETS)
    return {"target": target}


class TestConnectionRequest(BaseModel):
    url: str
    key: str
    model: str


@router.post("/test-connection")
async def test_ai_connection(req: TestConnectionRequest):
    """Test AI service connection with provided configuration."""
    try:
        
        # 创建 OpenAI 客户端
        client = openai.OpenAI(
            api_key=req.key,
            base_url=req.url
        )
        
        # 发送简单的测试消息
        response = client.chat.completions.create(
            model=req.model,
            messages=[
                {"role": "user", "content": "Hello!"}
            ],
            max_tokens=50,
            temperature=0.1
        )
        
        # 检查响应
        if response.choices and len(response.choices) > 0:
            reply = response.choices[0].message.content
            if reply and reply.strip():
                return {
                    "success": True,
                    "message": f"AI 服务连接正常！回复: \"{reply.strip()}\""
                }
            else:
                return {
                    "success": False,
                    "message": "连接成功但未收到有效回复"
                }
        else:
            return {
                "success": False,
                "message": "连接成功但响应格式异常"
            }
            
    except Exception as e:
        error_msg = str(e)
        
        # 提供更友好的错误信息
        if "401" in error_msg or "authentication" in error_msg.lower():
            friendly_msg = "API Key 无效或已过期"
        elif "404" in error_msg or "not found" in error_msg.lower():
            friendly_msg = "API 端点不存在，请检查 URL 配置"
        elif "timeout" in error_msg.lower():
            friendly_msg = "连接超时，请检查网络或 URL"
        elif "connection" in error_msg.lower():
            friendly_msg = "网络连接失败，请检查 URL 和网络状态"
        else:
            friendly_msg = f"连接失败: {error_msg}"
            
        return {
            "success": False,
            "message": friendly_msg
        }
