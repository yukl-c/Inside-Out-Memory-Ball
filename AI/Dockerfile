# 使用 slim 镜像
FROM python:3.13-slim

# 设置工作目录
WORKDIR /app

# 1. 先只拷贝依赖描述文件
COPY requirements.txt .

# 2. 安装依赖。--no-cache-dir 是好习惯，可以减小镜像体积
RUN pip install --no-cache-dir -r requirements.txt

# 3. 在安装完依赖后，再拷贝所有源代码
COPY . .

# 暴露端口
EXPOSE 5000

# 启动服务
CMD ["python", "app/app.py"]