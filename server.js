// 轻量库存管理 —— 零依赖 Node.js 服务端
// 数据保存在 DATA_DIR/db.json；设置 APP_PASSWORD 后需要登录才能访问。
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const IMG_DIR = path.join(DATA_DIR, 'images');
const MAX_IMAGES = 10;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('inv:' + PASSWORD).digest('hex');
const SESSION_TOKEN = crypto.createHmac('sha256', SECRET).update('session:' + PASSWORD).digest('hex');

// ---------- 存储 ----------
fs.mkdirSync(IMG_DIR, { recursive: true });
let db = { items: [], movements: [], seq: 1 };
if (fs.existsSync(DB_FILE)) {
  db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 50);
}
function flush() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    fs.writeFileSync(DB_FILE, JSON.stringify(db));
  }
}
process.on('SIGINT', () => { flush(); process.exit(0); });
process.on('SIGTERM', () => { flush(); process.exit(0); });

const nextId = () => db.seq++;
const now = () => new Date().toISOString();

// ---------- 工具 ----------
function send(res, status, body, headers = {}) {
  const isStr = typeof body === 'string' || Buffer.isBuffer(body);
  res.writeHead(status, Object.assign({
    'Content-Type': isStr ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  }, headers));
  res.end(isStr ? body : JSON.stringify(body));
}

function readBody(req, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) { reject(new Error('请求体过大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('JSON 格式错误')); }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function isAuthed(req) {
  if (!PASSWORD) return true;
  return safeEqual(parseCookies(req).inv_session || '', SESSION_TOKEN);
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
function num(v, field, { int = false, min = 0 } = {}) {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) throw new HttpError(400, `${field} 必须是不小于 ${min} 的数字`);
  return int ? Math.round(n) : Math.round(n * 100) / 100;
}

function cleanItem(input, existing) {
  const item = {
    sku: str(input.sku, 60),
    name: str(input.name, 120),
    category: str(input.category, 60),
    unit: str(input.unit, 20) || '件',
    location: str(input.location, 60),
    minQty: num(input.minQty, '最低库存', { int: true }),
    price: num(input.price, '单价'),
    note: str(input.note, 500),
  };
  if (!item.name) throw new HttpError(400, '名称不能为空');
  if (item.sku) {
    const dup = db.items.find((i) => i.sku.toLowerCase() === item.sku.toLowerCase() && (!existing || i.id !== existing.id));
    if (dup) throw new HttpError(409, `编码 ${item.sku} 已被「${dup.name}」使用`);
  }
  return item;
}

function findItem(id) {
  const item = db.items.find((i) => i.id === Number(id));
  if (!item) throw new HttpError(404, '物品不存在');
  return item;
}

function recordMovement(item, type, qty, note) {
  const before = item.qty;
  let after;
  if (type === 'in') after = before + qty;
  else if (type === 'out') after = before - qty;
  else after = qty; // adjust：直接设为盘点数量
  if (after < 0) throw new HttpError(400, `库存不足：当前 ${before}${item.unit}，无法出库 ${qty}${item.unit}`);
  item.qty = after;
  item.updatedAt = now();
  const m = {
    id: nextId(), itemId: item.id, itemName: item.name, sku: item.sku,
    type, qty: type === 'adjust' ? after - before : qty, before, after,
    note: str(note, 200), at: item.updatedAt,
  };
  db.movements.push(m);
  return m;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCsv(rows) {
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

// ---------- 图片 ----------
// 每张图片保存两份：<id>.jpg（大图，≤1600px）和 <id>_t.jpg（缩略图），压缩在浏览器端完成。
const IMG_ID = /^[a-f0-9]{16}$/;

function decodeImage(dataUrl, field) {
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new HttpError(400, `${field} 必须是 JPEG / PNG / WebP 图片`);
  const buf = Buffer.from(m[2], 'base64');
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf.slice(0, 4).toString('hex') === '89504e47';
  const isWebp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) throw new HttpError(400, `${field} 不是有效的图片文件`);
  return buf;
}

function imgFile(id, thumb) {
  return path.join(IMG_DIR, id + (thumb ? '_t' : '') + '.jpg');
}

function removeImageFiles(ids) {
  ids.forEach((id) => [false, true].forEach((t) => fs.rm(imgFile(id, t), { force: true }, () => {})));
}

function serveImage(req, res, name) {
  const m = /^([a-f0-9]{16})(_t)?\.jpg$/.exec(name);
  if (!m) throw new HttpError(404, '图片不存在');
  fs.readFile(imgFile(m[1], !!m[2]), (err, data) => {
    if (err) return send(res, 404, { error: '图片不存在' });
    let type = 'image/jpeg';
    if (data[0] === 0x89) type = 'image/png';
    else if (data.slice(0, 4).toString() === 'RIFF') type = 'image/webp';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'private, max-age=31536000, immutable' });
    res.end(data);
  });
}

// ---------- API ----------
async function api(req, res, url) {
  const p = url.pathname;
  const m = req.method;

  if (p === '/api/login' && m === 'POST') {
    const body = await readBody(req);
    if (!PASSWORD || safeEqual(body.password || '', PASSWORD)) {
      const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
      return send(res, 200, { ok: true }, {
        'Set-Cookie': `inv_session=${SESSION_TOKEN}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`,
      });
    }
    await new Promise((r) => setTimeout(r, 500)); // 减缓暴力尝试
    throw new HttpError(401, '密码错误');
  }
  if (p === '/api/logout' && m === 'POST') {
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'inv_session=; HttpOnly; Path=/; Max-Age=0' });
  }
  if (p === '/api/session') {
    return send(res, 200, { authed: isAuthed(req), passwordRequired: !!PASSWORD });
  }

  if (!isAuthed(req)) throw new HttpError(401, '请先登录');

  // 物品
  if (p === '/api/items' && m === 'GET') return send(res, 200, db.items);
  if (p === '/api/items' && m === 'POST') {
    const body = await readBody(req);
    const item = Object.assign({ id: nextId(), qty: 0, images: [], createdAt: now(), updatedAt: now() }, cleanItem(body));
    db.items.push(item);
    const initQty = num(body.qty, '初始数量', { int: true });
    if (initQty > 0) recordMovement(item, 'in', initQty, '初始库存');
    save();
    return send(res, 201, item);
  }
  let match = p.match(/^\/api\/items\/(\d+)$/);
  if (match) {
    const item = findItem(match[1]);
    if (m === 'PUT') {
      Object.assign(item, cleanItem(await readBody(req), item), { updatedAt: now() });
      save();
      return send(res, 200, item);
    }
    if (m === 'DELETE') {
      db.items = db.items.filter((i) => i !== item);
      removeImageFiles(item.images || []);
      save();
      return send(res, 200, { ok: true });
    }
  }

  // 物品图片
  if (p.startsWith('/api/images/') && m === 'GET') return serveImage(req, res, p.slice('/api/images/'.length));
  match = p.match(/^\/api\/items\/(\d+)\/images$/);
  if (match) {
    const item = findItem(match[1]);
    item.images = item.images || [];
    if (m === 'POST') {
      // 上传：{ full: dataURL, thumb: dataURL }
      if (item.images.length >= MAX_IMAGES) throw new HttpError(400, `每个物品最多 ${MAX_IMAGES} 张图片`);
      const body = await readBody(req, 12 * 1024 * 1024);
      const full = decodeImage(body.full, '图片');
      const thumb = decodeImage(body.thumb, '缩略图');
      const id = crypto.randomBytes(8).toString('hex');
      await fs.promises.writeFile(imgFile(id, false), full);
      await fs.promises.writeFile(imgFile(id, true), thumb);
      item.images.push(id);
      item.updatedAt = now();
      save();
      return send(res, 201, { id, item });
    }
    if (m === 'PUT') {
      // 调整顺序 / 删除：{ images: [id...] }，第一张为封面，未列出的图片会被删除
      const body = await readBody(req);
      if (!Array.isArray(body.images)) throw new HttpError(400, 'images 必须是数组');
      const next = [...new Set(body.images.map(String))].filter((id) => item.images.includes(id));
      removeImageFiles(item.images.filter((id) => !next.includes(id)));
      item.images = next;
      item.updatedAt = now();
      save();
      return send(res, 200, item);
    }
  }

  // 出入库 / 盘点
  if (p === '/api/movements' && m === 'POST') {
    const body = await readBody(req);
    const item = findItem(body.itemId);
    if (!['in', 'out', 'adjust'].includes(body.type)) throw new HttpError(400, '类型无效');
    const qty = num(body.qty, '数量', { int: true });
    if (body.type !== 'adjust' && qty <= 0) throw new HttpError(400, '数量必须大于 0');
    const mv = recordMovement(item, body.type, qty, body.note);
    save();
    return send(res, 201, { movement: mv, item });
  }
  if (p === '/api/movements' && m === 'GET') {
    const itemId = url.searchParams.get('itemId');
    const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 5000);
    let list = db.movements;
    if (itemId) list = list.filter((x) => x.itemId === Number(itemId));
    return send(res, 200, list.slice(-limit).reverse());
  }

  // 导出 / 备份
  if (p === '/api/export/items.csv') {
    const rows = [['编码', '名称', '分类', '单位', '库位', '数量', '最低库存', '单价', '库存金额', '图片数', '备注', '更新时间']];
    db.items.forEach((i) => rows.push([i.sku, i.name, i.category, i.unit, i.location, i.qty, i.minQty, i.price, (i.qty * i.price).toFixed(2), (i.images || []).length, i.note, i.updatedAt]));
    return send(res, 200, toCsv(rows), {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="items-${Date.now()}.csv"`,
    });
  }
  if (p === '/api/export/movements.csv') {
    const label = { in: '入库', out: '出库', adjust: '盘点' };
    const rows = [['时间', '类型', '编码', '名称', '变动', '变动前', '变动后', '备注']];
    db.movements.forEach((x) => rows.push([x.at, label[x.type], x.sku, x.itemName, x.qty, x.before, x.after, x.note]));
    return send(res, 200, toCsv(rows), {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="movements-${Date.now()}.csv"`,
    });
  }
  if (p === '/api/backup' && m === 'GET') {
    return send(res, 200, db, { 'Content-Disposition': `attachment; filename="inventory-backup-${Date.now()}.json"` });
  }
  if (p === '/api/backup' && m === 'POST') {
    const body = await readBody(req);
    if (!Array.isArray(body.items) || !Array.isArray(body.movements)) throw new HttpError(400, '备份文件格式不正确');
    const maxId = Math.max(0, ...body.items.map((i) => i.id || 0), ...body.movements.map((x) => x.id || 0));
    body.items.forEach((i) => { i.images = (Array.isArray(i.images) ? i.images : []).filter((id) => IMG_ID.test(id) && fs.existsSync(imgFile(id))); });
    db = { items: body.items, movements: body.movements, seq: Math.max(Number(body.seq) || 1, maxId + 1) };
    save();
    return send(res, 200, { ok: true, items: db.items.length, movements: db.movements.length });
  }

  throw new HttpError(404, '接口不存在');
}

// ---------- 静态文件 ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png' };
function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    if (url.pathname === '/healthz') return send(res, 200, 'ok');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return serveStatic(res, url.pathname);
  } catch (e) {
    const status = e.status || (e.message.includes('JSON') || e.message.includes('过大') ? 400 : 500);
    if (status === 500) console.error(e);
    send(res, status, { error: status === 500 ? '服务器内部错误' : e.message });
  }
});

server.listen(PORT, () => {
  console.log(`库存管理已启动: http://localhost:${PORT}`);
  if (!PASSWORD) console.warn('⚠️  未设置 APP_PASSWORD，任何人都可访问。公网部署前请务必设置！');
});
