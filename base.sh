echo "开始执行构建"

# 停止并删除旧容器
if [ "$(docker ps -aq -f name=upload-container)" ]; then
  echo "停止旧容器 upload-container"
  docker stop upload-container
  echo "删除旧容器 upload-container"
  docker rm upload-container
else
  echo "容器 upload-container 不存在，无需停止或删除"
fi

# 删除旧镜像
if [ "$(docker images -q upload:1.0)" ]; then
  echo "删除旧镜像 upload:1.0"
  docker rmi -f upload:1.0
else
  echo "镜像 upload:1.0 不存在，无需删除"
fi

# 构建新镜像
echo "开始构建镜像 upload:1.0"
docker build -t upload:1.0 . || { echo "docker build 失败"; exit 1; }

# 启动新容器
echo "启动新容器 upload-container"
docker run -p 8088:3000 --name upload-container -d upload:1.0 || { echo "容器启动失败"; exit 1; }

echo "构建并启动完成"