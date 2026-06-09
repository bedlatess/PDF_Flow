#!/bin/bash

# PDF-Flow Backend Startup Script
# 用于启动所有必需的服务

set -e

echo "🚀 Starting PDF-Flow Backend Services..."

# 检查环境变量
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# 加载环境变量
export $(cat .env | grep -v '^#' | xargs)

echo "✅ Environment variables loaded"

# 1. 启动数据库和 Redis（如果使用 Docker）
if [ "$USE_DOCKER_DB" = "true" ]; then
    echo "📦 Starting PostgreSQL and Redis..."
    docker-compose up -d db redis
    echo "⏳ Waiting for services to be ready..."
    sleep 5
fi

# 2. 运行数据库迁移
echo "🗄️  Running database migrations..."
alembic upgrade head

# 3. 启动 FastAPI 服务器（后台）
echo "🌐 Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
FASTAPI_PID=$!

# 4. 启动 Celery Worker（后台）
echo "⚙️  Starting Celery worker..."
celery -A app.celery_worker worker --loglevel=info --concurrency=4 &
CELERY_PID=$!

# 5. 启动 Celery Beat（定时任务，可选）
# echo "⏰ Starting Celery beat..."
# celery -A app.celery_worker beat --loglevel=info &
# BEAT_PID=$!

echo ""
echo "✨ All services started successfully!"
echo ""
echo "📊 Service Status:"
echo "  - FastAPI: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/api/docs"
echo "  - ReDoc: http://localhost:8000/api/redoc"
echo "  - Health Check: http://localhost:8000/health"
echo ""
echo "🔍 Process IDs:"
echo "  - FastAPI PID: $FASTAPI_PID"
echo "  - Celery Worker PID: $CELERY_PID"
echo ""
echo "To stop all services, run: ./stop.sh"
echo "Or press Ctrl+C to stop this script (services will continue running)"

# 保存 PID 到文件，方便停止
echo $FASTAPI_PID > .fastapi.pid
echo $CELERY_PID > .celery.pid

# 等待用户中断
wait
