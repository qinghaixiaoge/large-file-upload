FROM node:18-alpine
LABEL name="demo"
LABEL version="1.0"
COPY . /app
WORKDIR /app
# 设置国内镜像再安装依赖
RUN npm config set registry https://registry.npmjs.org && npm install
EXPOSE 3000
CMD npm run dev
