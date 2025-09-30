from fastapi import APIRouter
from pydantic import BaseModel
from ..services.ai import guess_drawing
import random

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


@router.post("/guess")
@router.post("/recognize")
async def guess(req: GuessRequest):
    """Call ERNIE vision-language model (or fallback heuristic) to guess drawing content."""
    clue = req.clue or req.hint
    config = req.config.dict(exclude_none=True) if req.config else None
    result = guess_drawing(req.image, clue, config, req.target)
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
