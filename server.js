"use strict";
// 考勤出勤记录系统 —— 后端服务（零第三方依赖，纯 Node 内置模块）
// 数据存于 data/attendance.json，启动命令：node server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "attendance.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- 存储（内存缓存 + 同步原子落盘）----------
function loadDB() {
  try {
    const obj = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (obj && Array.isArray(obj.records)) return obj;
  } catch (e) { /* 文件不存在或解析失败则重建 */ }
  return { records: [] };
}
function saveDB(obj) {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, DATA_FILE); // 原子替换，避免写入中途崩溃损坏
}
let db = loadDB();

function genId() { return Date.now().toString(36) + crypto.randomBytes(4).toString("hex"); }
function round1(n) { return Math.round((Number(n) || 0) * 10) / 10; }

// ---------- 校验与清洗 ----------
function cleanRecord(r) {
  const date = String(r.date || "").trim();
  const employee = String(r.employee || "").trim();
  const company = String(r.company || "").trim();
  const project = String(r.project || "").trim();
  const testType = String(r.testType || "").trim().toUpperCase();
  if (testType !== "SIT" && testType !== "UAT") return { error: "测试类型必填，且只能是 SIT 或 UAT" };
  const hoursRaw = parseFloat(r.hours);
  if (isNaN(hoursRaw) || hoursRaw < 0) return { error: "工时必须为不小于 0 的数字" };
  const otRaw = parseFloat(r.overtime);
  if (!isNaN(otRaw) && otRaw < 0) return { error: "加班工时必须为不小于 0 的数字" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "考勤日期格式应为 YYYY-MM-DD" };
  if (!employee || !company || !project) return { error: "员工名字 / 公司名 / 负责项目 不能为空" };
  return {
    record: {
      id: genId(), date, employee, company, project,
      hours: round1(hoursRaw),
      overtime: isNaN(otRaw) ? 0 : round1(otRaw),
      testType: testType || "",
      createdAt: new Date().toISOString()
    }
  };
}

// ---------- 响应工具 ----------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};
function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 5e6) reject(new Error("请求体过大")); });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(new Error("请求体不是合法 JSON")); } });
    req.on("error", reject);
  });
}
function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end("forbidden"); return; }
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("404 Not Found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(buf);
  });
}

const SAMPLES = [
  ["2026-07-03", "张三", "星辰科技", "官网改版", 8, 2, "SIT"],
  ["2026-07-10", "张三", "星辰科技", "官网改版", 7.5, 0, "UAT"],
  ["2026-07-15", "李四", "云图网络", "数据中台", 8, 3, "SIT"],
  ["2026-08-01", "张三", "星辰科技", "小程序", 8, 1, "UAT"],
  ["2026-08-05", "李四", "云图网络", "数据中台", 6, 0, "SIT"],
  ["2026-08-08", "王五", "星辰科技", "小程序", 8, 4, "UAT"],
  ["2026-08-12", "王五", "星辰科技", "小程序", 7, 2, "SIT"]
];

// ---------- 路由 ----------
async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;
  const method = req.method.toUpperCase();
  try {
    // 列表
    if (p === "/api/records" && method === "GET") {
      return sendJson(res, 200, { records: db.records });
    }
    // 单条新增
    if (p === "/api/records" && method === "POST") {
      const body = await readBody(req);
      const c = cleanRecord(body);
      if (c.error) return sendJson(res, 400, { error: c.error });
      db.records.push(c.record); saveDB(db);
      return sendJson(res, 201, { record: c.record });
    }
    // 批量新增
    if (p === "/api/records/bulk" && method === "POST") {
      const body = await readBody(req);
      const arr = Array.isArray(body.records) ? body.records : [];
      const added = []; const errors = [];
      arr.forEach((r, i) => {
        const c = cleanRecord(r || {});
        if (c.error) { errors.push({ index: i, error: c.error }); return; }
        db.records.push(c.record); added.push(c.record);
      });
      saveDB(db);
      return sendJson(res, 201, { added: added.length, skipped: arr.length - added.length, errors });
    }
    // 单条编辑 / 删除
    const m = p.match(/^\/api\/records\/([\w-]+)$/);
    if (m) {
      const id = m[1];
      if (method === "PUT") {
        const body = await readBody(req);
        const rec = db.records.find((x) => x.id === id);
        if (!rec) return sendJson(res, 404, { error: "记录不存在" });
        const merged = Object.assign({}, rec, body);
        const c = cleanRecord(merged);
        if (c.error) return sendJson(res, 400, { error: c.error });
        Object.assign(rec, c.record); rec.id = id; saveDB(db);
        return sendJson(res, 200, { record: rec });
      }
      if (method === "DELETE") {
        const idx = db.records.findIndex((x) => x.id === id);
        if (idx === -1) return sendJson(res, 404, { error: "记录不存在" });
        db.records.splice(idx, 1); saveDB(db);
        return sendJson(res, 200, { ok: true });
      }
    }
    // 加载示例数据（追加）
    if (p === "/api/seed" && method === "POST") {
      let n = 0;
      SAMPLES.forEach((s) => {
        const c = cleanRecord({ date: s[0], employee: s[1], company: s[2], project: s[3], hours: s[4], overtime: s[5], testType: s[6] });
        if (!c.error) { db.records.push(c.record); n++; }
      });
      saveDB(db);
      return sendJson(res, 201, { added: n });
    }
    // 清空全部
    if (p === "/api/reset" && method === "POST") {
      db.records = []; saveDB(db);
      return sendJson(res, 200, { ok: true });
    }
    // 静态资源
    if (method === "GET") return serveStatic(req, res, p);
    return sendJson(res, 404, { error: "Not Found" });
  } catch (e) {
    return sendJson(res, 500, { error: e.message });
  }
}

process.on("unhandledRejection", () => {}); // 防御式兜底，不影响可用性

const server = http.createServer((req, res) => { handle(req, res); });
server.listen(PORT, () => {
  console.log("考勤服务已启动: http://localhost:" + PORT);
});
