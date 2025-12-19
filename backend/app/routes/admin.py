from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
import time, os

router = APIRouter(prefix="/admin", tags=["admin"])

def _delayed_shutdown(wait: float = 1.0):
    """
    延迟退出函数，在后台执行优雅关闭
    """
    print(f"[Admin] 开始延迟退出，等待 {wait} 秒...")
    time.sleep(wait)
    # 这里可以添加更多清理逻辑，如保存状态、关闭连接等
    print("[Admin] 执行退出...")
    os._exit(0)  # 强制退出进程

@router.post("/shutdown")
async def shutdown(background_tasks: BackgroundTasks, wait_seconds: float = 1.0, request: Request = None):
    """
    优雅关闭服务器端点
    - 仅允许来自本地主机的请求
    - 立即返回 200，然后在后台延迟退出
    """
    # 安全检查：只允许本地请求
    client_host = request.client.host if request.client else None
    if client_host not in ("127.0.0.1", "::1"):
        print(f"[Admin] 拒绝来自 {client_host} 的 shutdown 请求")
        raise HTTPException(status_code=403, detail="Forbidden: only localhost allowed")

    print(f"[Admin] 收到 shutdown 请求，等待 {wait_seconds} 秒后退出")

    # 添加后台任务
    background_tasks.add_task(_delayed_shutdown, wait_seconds)

    return {"status": "shutting_down", "wait_seconds": wait_seconds}