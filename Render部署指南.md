# Render 部署指南（永久免费 + 数据持久）

> 适用：你已按《部署指南》第 1–2 步把 `attendance-app` 发布到了 GitHub。
> 本指南只讲「GitHub → Render」这一段。代码零改动，只是换个平台连仓库。
> 目标：拿到一个永久免费、数据不丢的考勤网址。

---

## 费用真相（先看这个，避免误解）

| 项目 | 费用 |
|---|---|
| Web 运行时（Free 计划） | **$0 / 月，永久免费** |
| 持久磁盘（1 GB） | **$0.25 / 月**（≈ ¥1.8，几乎可忽略） |
| **合计** | **约 ¥2 / 月** |

对比 Railway：Hobby $5/月 + 卷费 ≈ ¥40/月。Render 便宜一个数量级。

> ⚠️ 唯一缺点：Free 计划的 Web Service **空闲 15 分钟会休眠**，下次访问要等几秒唤醒（冷启动）。内部考勤工具完全可接受。若受不了休眠，就留在 Railway 或升级 Render 付费档。

---

## 第 1 步：注册 / 登录 Render

1. 打开 https://render.com
2. 右上角点 **Sign Up** → 选 **Continue with GitHub**（用你发代码的那个 GitHub 账号，这样 Render 才能看到 `attendance-app` 仓库）
3. 授权完成后进入 Render 控制台（Dashboard）

---

## 第 2 步：新建 Web Service

1. 控制台点 **New +** → 选 **Web Service**
2. 在 "Connect a repository" 里找到并选 **`attendance-app`**
   - 如果列表为空：点 **Connect account** / **Configure** 授权 Render 访问你的 GitHub 仓库，再刷新

---

## 第 3 步：基础配置

按下面填写（其余保持默认）：

| 字段 | 填什么 |
|---|---|
| **Name** | `attendance-app`（随意，字母数字） |
| **Region** | 选 **Singapore (ap-southeast-1)**（离国内最近，访问快） |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm install`（项目零依赖，秒过；也可留空） |
| **Start Command** | `node server.js` |
| **Instance Type** | **Free**（一定要选 Free，否则会扣费） |

---

## 第 4 步：挂载持久磁盘（数据不丢的关键）

> 不做这步，数据存在临时文件系统，重启/重部署会清空。必须做。

1. 在同一配置页往下找 **Disks**（或 "Advanced" → "Disks"）区域
2. 点 **Add Disk**
   - **Name**：`data`（随意）
   - **Mount Path**：`/data`（必须是这个路径，下一步要用）
   - **Size**：`1 GB`（考勤数据极小，1GB 绰绰有余）
3. 确认磁盘费用显示 `$0.25 / month`

---

## 第 5 步：设置环境变量（让程序把数据写进磁盘）

1. 往下找 **Environment** 区域
2. 点 **Add Environment Variable**
   - **Key**：`DATA_DIR`
   - **Value**：`/data`
3. 保存

> 后端 `server.js` 已支持 `DATA_DIR` 环境变量——设了它就往 `/data` 写数据，不设就写临时目录。这一步把两者接上。

---

## 第 6 步：部署

1. 拉到最底部点 **Create Web Service**
2. 等待构建（约 1–2 分钟），日志显示 `Listening on 0.0.0.0:3000` 或 `Server running` 即成功
3. 部署完成后，顶部出现网址，类似 `https://attendance-app-xxxx.onrender.com`
4. 点开网址即可使用

---

## 第 7 步：验证

打开网址后：
- 能看到考勤页面 = 前端 OK
- 点「加载示例数据」→ 录入几条 → 刷新页面数据还在 = 持久磁盘生效 ✅
- （若刷新后数据没了，说明没挂磁盘或 `DATA_DIR` 没设，回头查第 4、5 步）

---

## 从 Railway 迁过来，数据怎么办？

- 你目前 Railway 上是**空库**（0 条记录），直接迁，**无需搬数据**。
- 若以后 Railway 上已录入数据，先在 Railway 页面「导出 Excel」，再到 Render 页面「导入 Excel」即可。
- 两个平台可同时跑，互不干扰；确认 Render 正常后，可在 Railway 删掉项目停止计费。

---

## 常见问题

**Q：部署后白屏 / 打不开？**
A：看 Deploy 日志有没有报错。最常见是 Start Command 没填 `node server.js`，或没选 Free 导致卡在付费确认。

**Q：第一次打开很慢？**
A：Free 计划冷启动，等 10–30 秒正常。之后几分钟内有访问就快。

**Q：磁盘能换成更大吗？**
A：能，在 Render 项目 Settings → Disks 里调大小，费用随 GB 增加（$0.25/GB/月）。考勤用 1GB 足够。

**Q：和 Railway 比哪个好？**
A：要彻底免费选 Render（≈¥2/月，会休眠）；要 7×24 不休眠选 Railway（$5/月）。数据持久两家都要挂磁盘。
