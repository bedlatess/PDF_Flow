"""
WebSocket endpoint for real-time task progress updates
为任务进度提供实时WebSocket推送，替代轮询机制
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# 管理活跃的WebSocket连接
class ConnectionManager:
    def __init__(self):
        # job_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> user_id (用于权限验证)
        self.connection_users: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, job_id: str, user_id: int):
        """连接WebSocket并订阅任务"""
        await websocket.accept()

        if job_id not in self.active_connections:
            self.active_connections[job_id] = set()

        self.active_connections[job_id].add(websocket)
        self.connection_users[websocket] = user_id

        logger.info(f"WebSocket connected: job_id={job_id}, user_id={user_id}")

    def disconnect(self, websocket: WebSocket, job_id: str):
        """断开WebSocket连接"""
        if job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)

            # 如果没有连接了，删除该job的记录
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

        if websocket in self.connection_users:
            del self.connection_users[websocket]

        logger.info(f"WebSocket disconnected: job_id={job_id}")

    async def broadcast_progress(self, job_id: str, message: dict):
        """向订阅该任务的所有连接广播进度"""
        if job_id not in self.active_connections:
            return

        dead_connections = set()

        for connection in self.active_connections[job_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message: {e}")
                dead_connections.add(connection)

        # 清理死连接
        for conn in dead_connections:
            self.disconnect(conn, job_id)

    def get_connection_count(self, job_id: str) -> int:
        """获取指定任务的连接数"""
        return len(self.active_connections.get(job_id, set()))


manager = ConnectionManager()


@router.websocket("/ws/jobs/{job_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    job_id: str,
    token: str = None
):
    """
    WebSocket端点，用于实时接收任务进度更新

    客户端连接示例：
    ws://localhost:8000/api/v1/ws/jobs/{job_id}?token={access_token}

    消息格式：
    {
        "type": "progress",
        "job_id": "xxx",
        "status": "processing",
        "progress": 50,
        "message": "Processing...",
        "timestamp": 1234567890
    }
    """
    # 验证用户身份（通过query参数传递token）
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return

    try:
        # 简化版本：不进行用户验证，生产环境应该验证token
        # user = await get_current_user_ws(token)
        user_id = 0  # 临时使用，生产环境需要从token解析

        await manager.connect(websocket, job_id, user_id)

        try:
            # 保持连接活跃，接收客户端心跳
            while True:
                data = await websocket.receive_text()

                # 处理心跳消息
                if data == "ping":
                    await websocket.send_text("pong")

        except WebSocketDisconnect:
            manager.disconnect(websocket, job_id)
            logger.info(f"Client disconnected from job {job_id}")

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1011, reason=str(e))


async def send_task_progress(job_id: str, progress_data: dict):
    """
    从Celery任务中调用此函数来推送进度更新

    Args:
        job_id: 任务ID
        progress_data: 进度数据字典，应包含：
            - status: 任务状态
            - progress: 进度百分比 (0-100)
            - message: 状态消息
    """
    message = {
        "type": "progress",
        "job_id": job_id,
        **progress_data,
        "timestamp": asyncio.get_event_loop().time()
    }

    await manager.broadcast_progress(job_id, message)


async def send_task_complete(job_id: str, result_data: dict):
    """
    任务完成时发送完成通知

    Args:
        job_id: 任务ID
        result_data: 结果数据
    """
    message = {
        "type": "complete",
        "job_id": job_id,
        "status": "completed",
        "progress": 100,
        **result_data,
        "timestamp": asyncio.get_event_loop().time()
    }

    await manager.broadcast_progress(job_id, message)


async def send_task_error(job_id: str, error_message: str):
    """
    任务失败时发送错误通知

    Args:
        job_id: 任务ID
        error_message: 错误消息
    """
    message = {
        "type": "error",
        "job_id": job_id,
        "status": "failed",
        "error": error_message,
        "timestamp": asyncio.get_event_loop().time()
    }

    await manager.broadcast_progress(job_id, message)


def get_connection_manager():
    """获取连接管理器实例（用于依赖注入）"""
    return manager
