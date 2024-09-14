* 项目启动方式：
  * 运行main.js，启动服务端
  * 运行client/index.html，进行大文件上传

# 大文件分片上传 

- 使用worker多线程计算文件哈希，对于大文件`由客户端决定，超过多少M进行切片处理`保证上传效率。
- 使用多并发上传切片文件，提高传输效率。
- 实现断点续传、秒传功能。
- 实现上传进度的监控。

## 接口示例

### 上传切片接口

`http://127.0.0.1:1122/upload` `POST` `"Content-Type": "multipart/form-data"`

| 键        | 值                              |
| --------- | ------------------------------- |
| hash      | 文件哈希                        |
| chunkName | 切片文件名【切片索引-切片哈希】 |
| chunk     | 切片文件                        |

### 检验文件是否存在

`"http://127.0.0.1:1122/verify?hash=" + hash + "&fileName=" + fileName` `GET`

| 键       | 值       |
| -------- | -------- |
| hash     | 文件哈希 |
| fileName | 文件名称 |

### 合并文件

`"http://127.0.0.1:1122/verify?merge=" + hash + "&fileName=" + fileName` `GET`

| 键       | 值       |
| -------- | -------- |
| hash     | 文件哈希 |
| fileName | 文件名称 |

### 上传小文件

`http://127.0.0.1:1122/upload/complete` `POST` `"Content-Type": "multipart/form-data"`

| 键   | 值       |
| ---- | -------- |
| hash | 文件哈希 |
| file | 文件     |
