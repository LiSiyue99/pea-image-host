#!/bin/bash

# 确保必要的目录存在
mkdir -p output
mkdir -p configs

# 检查是否在Render环境中
if [ -n "$RENDER" ]; then
    # 在Render环境中，确保RENDER_ARTIFACTS_DIR目录存在
    mkdir -p ${RENDER_ARTIFACTS_DIR:-/tmp}/output
fi

# 进入webapp目录并启动应用
cd webapp
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} 