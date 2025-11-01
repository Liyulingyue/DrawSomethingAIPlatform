from fastapi import APIRouter
from pydantic import BaseModel
from ..services.ai import guess_drawing
from ..shared import get_user_by_session
from ..database import SessionLocal, User, UserSession
from ..config import config
import random
import openai
import os

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
    """Call AI vision-language model to guess drawing content."""
    
    # 新增：判断会话有效性和服务点
    user = None
    session_id = getattr(req, 'session_id', None)  # 如果前端传递了session_id
    if session_id:
        user = get_user_by_session(session_id)
    calls_remaining = getattr(user, "calls_remaining", 0) if user else 0
    session_valid = user is not None
    # 提取线索信息
    clue = req.clue or req.hint

    # 准备配置
    config_custom = req.config.dict(exclude_none=True) if req.config else {}
    config_server = {
        'key': config.MODEL_KEY,
        'model': config.MODEL_NAME,
        'url': config.MODEL_URL
    }

    # 根据调用偏好和条件选择配置
    call_preference = (req.call_preference or "server").lower()
    is_server_call = False
    
    if call_preference == "server" and session_valid and calls_remaining > 0:
        # 倾向服务器且条件满足，使用服务器配置
        config_to_use = config_server
        provider = "server"
        is_server_call = True
        print(f"🔍 使用服务器端AI配置")
    else:
        # 其他情况使用自定义配置
        config_to_use = config_custom
        provider = "custom"
        reason = []
        if call_preference != "server":
            reason.append(f"调用偏好为 '{call_preference}'")
        if not session_valid:
            reason.append("会话无效")
        if calls_remaining <= 0:
            reason.append(f"剩余调用次数为 {calls_remaining}")
        reason_str = ", ".join(reason)
        print(f"🔍 使用自定义AI配置 (原因: {reason_str})")

    # 统一调用AI服务
    result = guess_drawing(req.image, clue, config_to_use, req.target, provider)
    
    # 如果是服务器端调用且成功，扣除点数
    if is_server_call and result.get("success") and result.get("provider") == "server":
        # 扣除用户点数
        db = SessionLocal()
        try:
            # 在当前数据库会话中重新获取用户对象
            session_record = db.query(UserSession).filter(UserSession.session_id == session_id).first()
            if session_record:
                user_in_db = db.query(User).filter(User.id == session_record.user_id).first()
                if user_in_db:
                    user_in_db.calls_remaining -= 1
                    db.commit()
                    print(f"🔹 用户 {user_in_db.username} 服务器调用成功，剩余点数: {user_in_db.calls_remaining}")
                else:
                    print(f"❌ 无法找到用户记录")
            else:
                print(f"❌ 无法找到会话记录")
        except Exception as e:
            db.rollback()
            print(f"❌ 扣除点数失败: {e}")
        finally:
            db.close()
    elif is_server_call:
        print(f"ℹ️ 未扣费: success={result.get('success')}, provider={result.get('provider')}")
    else:
        print(f"ℹ️ 自定义AI调用完成，无需扣费")
    
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
