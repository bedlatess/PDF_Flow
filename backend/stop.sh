#!/bin/bash

# PDF-Flow Backend Stop Script
# 停止所有后端服务

echo "🛑 Stopping PDF-Flow Backend Services..."

# 停止 FastAPI
if [ -f .fastapi.pid ]; then
    FASTAPI_PID=$(cat .fastapi.pid)
    echo "Stopping FastAPI (PID: $FASTAPI_PID)..."
    kill $FASTAPI_PID 2>/dev/null || echo "FastAPI already stopped"
    rm .fastapi.pid
fi

# 停止 Celery Worker
if [ -f .celery.pid ]; then
    CELERY_PID=$(cat .celery.pid)
    echo "Stopping Celery Worker (PID: $CELERY_PID)..."
    kill $CELERY_PID 2>/dev/null || echo "Celery Worker already stopped"
    rm .celery.pid
fi

# 停止 Celery Beat（如果有）
if [ -f .beat.pid ]; then
    BEAT_PID=$(cat .beat.pid)
    echo "Stopping Celery Beat (PID: $BEAT_PID)..."
    kill $BEAT_PID 2>/dev/null || echo "Celery Beat already stopped"
    rm .beat.pid
fi

# 停止 Docker 容器（可选）
if [ "$1" = "--docker" ]; then
    echo "Stopping Docker containers..."
    docker-compose down
fi

echo "✅ All services stopped"
