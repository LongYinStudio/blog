#!/bin/bash
set -euo pipefail

# ==========================================
# 项目配置
# ==========================================
PROJECT_NAME="blog"                # 项目名称（用于显示）
REMOTE_HOST="jd"                   # 远程服务器（SSH别名或user@ip）
REMOTE_PATH="/var/www/html/blog"   # 远程部署路径
# ==========================================

# 记录开始时间
START_TIME=$(date +%s)

echo "========================================"
echo "开始部署项目: $PROJECT_NAME"
echo "目标服务器: $REMOTE_HOST"
echo "部署路径: $REMOTE_PATH"
echo "========================================"
echo ""

# 1. 检查是否在项目根目录（防止在错误目录执行）
if [ ! -f "package.json" ]; then
  echo "错误: 请在 Vue 项目根目录执行此脚本"
  exit 1
fi

# 2. 清理旧的构建产物
echo "清理旧的 .vitepress/dist 目录..."
rm -rf .vitepress/dist

# 3. 执行构建
echo "执行生产环境构建: pnpm run build..."
pnpm run build

# 4. 验证构建结果
if [ ! -d ".vitepress/dist" ] || [ ! -f ".vitepress/dist/index.html" ]; then
  echo "错误: 构建失败，未生成有效的 dist 目录或 index.html"
  exit 1
fi

# 5. 部署到服务器（使用rsync，增量传输+自动删除旧文件）
echo ""
echo "正在上传文件到服务器..."
rsync -avz --delete .vitepress/dist/ "$REMOTE_HOST:$REMOTE_PATH/"

# 计算耗时
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "========================================"
echo "项目 [$PROJECT_NAME] 部署成功!"
echo "总耗时: ${DURATION} 秒"
echo "========================================"
