# 考勤出勤记录系统（多人共享全栈版）

纯 Node.js 后端 + 原生前端，**零第三方依赖**，数据存于 JSON 文件。多人通过同一个网址访问**同一份数据**，实时共享。

## 项目结构
```
attendance-app/
├── server.js          # 后端服务（Node 内置 http 模块，零依赖）
├── package.json       # 启动脚本，无任何依赖
├── public/index.html  # 前端页面（API 驱动）
├── data/              # 运行时数据（attendance.json，已被 .gitignore 忽略）
├── test_api.js        # 可选：本地接口自测脚本
└── README.md
```

## 本地运行（先验证）
```bash
cd attendance-app
node server.js
# 浏览器打开 http://localhost:3000
```
零依赖，**无需 `npm install`**。

## 部署到 PaaS（免费额度，让同事通过网址访问）
以 **Railway** 为例（Render / Fly.io 步骤类似）：

1. 把 `attendance-app` 整个目录推送到你的 GitHub 仓库。
2. 登录 Railway → New Project → **Deploy from GitHub** → 选择该仓库。
3. 设置（关键三项）：
   - **Build Command**：留空（零依赖，不需要安装步骤）
   - **Start Command**：`node server.js`
   - **端口**：代码已读取 `PORT` 环境变量，平台自动注入，无需手动设。
4. 部署完成后获得 `https://xxx.up.railway.app` 网址，发给同事即可使用。

Render 同理：New Web Service → 连 GitHub → Start Command 填 `node server.js`，其余默认。

## ⚠️ 数据持久化（部署前必读）
PaaS 免费容器的文件系统通常是**临时**的，服务重启 / 重新部署可能清空 `data/` 里的数据。两种应对：

- **挂载持久卷（推荐）**：Railway / Render 都提供免费持久卷。把卷挂载到服务器能读到的目录，并设置环境变量
  `DATA_DIR=/你挂载的卷路径`（server 已支持该环境变量）。
- **定期备份**：在页面点「导出 Excel」把数据下载到本地，需要时「导入」恢复。内部小工具推荐**持久卷 + 定期导出**双保险。

## 备份与迁移
- **导出 Excel**：含「考勤明细 / 按员工统计 / 按公司统计」三个表。
- **导入 Excel/CSV**：支持你原有的 Excel，自动识别表头列（中/英文列名均可，列顺序随意）。
- 直接拷贝 `data/attendance.json` 也是一份完整备份。

## API 一览（供二次开发）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET    | `/api/records`        | 获取全量记录 |
| POST   | `/api/records`        | 单条新增 |
| POST   | `/api/records/bulk`   | 批量新增 `{ records: [...] }` |
| PUT    | `/api/records/:id`    | 编辑某条 |
| DELETE | `/api/records/:id`    | 删除某条 |
| POST   | `/api/seed`           | 加载示例数据（追加） |
| POST   | `/api/reset`          | 清空全部 |

## 可选：本地接口自测
```bash
node test_api.js   # 会自动启动服务并跑一遍增删改查/校验/seed/reset，结束后退出
```
