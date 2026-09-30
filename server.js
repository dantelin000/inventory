// 但丁进销存 —— 零依赖 Node.js 服务端
// 数据保存在 DATA_DIR/db.json，图片保存在 DATA_DIR/images/；设置 APP_PASSWORD 后需要登录才能访问。
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const IMG_DIR = path.join(DATA_DIR, 'images');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('inv:' + PASSWORD).digest('hex');
const SESSION_TOKEN = crypto.createHmac('sha256', SECRET).update('session:' + PASSWORD).digest('hex');
const MAX_IMAGES = 10;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const round4 = (n) => Math.round((n + Number.EPSILON) * 10000) / 10000;

// ---------- 存储 ----------
// 默认值按澳洲习惯：澳元、GST 10%、价格不含 GST、14 天账期
const DEFAULT_SETTINGS = {
  companyName: '', abn: '', companyAddress: '', companyPhone: '', companyEmail: '', website: '', logo: '',
  currency: '$', currencyCode: 'AUD', gstRegistered: true, taxName: 'GST', taxRate: 10, pricesIncGst: false,
  invoicePrefix: 'INV-', poPrefix: 'PO-', paymentTermsDays: 14,
  bankName: '', accountName: '', bsb: '', accountNumber: '', payId: '',
  invoiceFooter: 'Thank you for your business!',
};

fs.mkdirSync(IMG_DIR, { recursive: true });
let db = emptyDb();
if (fs.existsSync(DB_FILE)) db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
migrate();

function emptyDb() {
  return { items: [], movements: [], invoices: [], purchases: [], customers: [], suppliers: [], settings: {}, counters: {}, seq: 1 };
}

// 兼容旧版本数据
function migrate() {
  const s = db.settings || {};
  if (s.companyTaxId && !s.abn) s.abn = s.companyTaxId;
  delete s.companyTaxId;
  db.settings = Object.assign({}, DEFAULT_SETTINGS, s);
  ['items', 'movements', 'invoices', 'purchases', 'customers', 'suppliers'].forEach((k) => { if (!Array.isArray(db[k])) db[k] = []; });
  db.counters = db.counters || {};
  db.invoices.forEach((v) => {
    if (v.payments) return;
    // v1 发票：整单折扣 + 整单税率
    v.payments = [];
    v.customer = Object.assign({ id: null }, v.customer);
    v.dueDate = v.dueDate || v.date;
    v.pricesIncGst = false;
    v.subtotalEx = round2((v.subtotal || 0) - (v.discount || 0));
    v.gst = v.tax || 0;
    v.lines.forEach((l) => { l.gross = l.amount; l.discountPct = 0; l.taxable = (v.taxRate || 0) > 0; });
    v.amountPaid = 0;
    v.balance = v.status === 'void' ? 0 : v.total;
  });
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
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
      if (size > maxBytes) { reject(new HttpError(413, '请求体过大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'JSON 格式错误')); }
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
const bool = (v) => v === true || v === 'true' || v === 'on' || v === 1 || v === '1';
function num(v, field, { int = false, min = 0, max = Infinity, digits = 2 } = {}) {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${field} 必须是 ${min} ~ ${max} 之间的数字`);
  return int ? Math.round(n) : Number(n.toFixed(digits));
}
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !Number.isNaN(Date.parse(d));
function addDays(date, days) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function localDate() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function byId(list, id, label) {
  const x = list.find((i) => i.id === Number(id));
  if (!x) throw new HttpError(404, `${label}不存在`);
  return x;
}
const findItem = (id) => byId(db.items, id, '物品');

// ---------- 物品 ----------
function cleanItem(input, existing) {
  const item = {
    sku: str(input.sku, 60),
    name: str(input.name, 120),
    category: str(input.category, 60),
    unit: str(input.unit, 20) || '件',
    location: str(input.location, 60),
    minQty: num(input.minQty, '最低库存', { int: true }),
    price: num(input.price, '成本价', { digits: 4 }),
    salePrice: num(input.salePrice, '售价'),
    gstFree: bool(input.gstFree),
    note: str(input.note, 500),
  };
  if (!item.name) throw new HttpError(400, '名称不能为空');
  if (item.sku) {
    const dup = db.items.find((i) => i.sku.toLowerCase() === item.sku.toLowerCase() && (!existing || i.id !== existing.id));
    if (dup) throw new HttpError(409, `编码 ${item.sku} 已被「${dup.name}」使用`);
  }
  return item;
}

// 批量导入：先逐行校验，dryRun 只返回预览；正式导入时跳过有误的行
// 按 SKU 匹配已有物品（无 SKU 时按名称）；mode=skip 跳过已有物品，mode=update 用表格中非空的单元格更新
const IMPORT_FIELDS = ['sku', 'name', 'category', 'unit', 'location', 'qty', 'minQty', 'price', 'salePrice', 'gstFree', 'note'];
const MAX_IMPORT_ROWS = 5000;
const YES = /^(y|yes|true|1|是|√|✓)$/i;
function importItems(body) {
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) throw new HttpError(400, '没有可导入的数据');
  if (rows.length > MAX_IMPORT_ROWS) throw new HttpError(400, `一次最多导入 ${MAX_IMPORT_ROWS} 行`);
  const mode = body.mode === 'update' ? 'update' : 'skip';
  const setQty = bool(body.setQty);
  const seen = new Map(); // 本次表格内的 SKU / 名称 → 行号
  const seenIds = new Map(); // 已有物品 id → 行号
  const results = rows.map((raw, n) => {
    const src = raw && typeof raw === 'object' ? raw : {};
    const line = Number(src.line) || n + 2;
    const r = { line, sku: str(src.sku, 60), name: str(src.name, 120) };
    try {
      const input = {};
      IMPORT_FIELDS.forEach((k) => { if (src[k] !== undefined && src[k] !== null) input[k] = typeof src[k] === 'string' ? src[k].trim() : src[k]; });
      ['qty', 'minQty', 'price', 'salePrice'].forEach((k) => { if (typeof input[k] === 'string') input[k] = input[k].replace(/[\s,$¥￥€£]/g, ''); });
      if (typeof input.gstFree === 'string') input.gstFree = YES.test(input.gstFree);
      if (!r.name && !r.sku) throw new HttpError(400, '名称不能为空');

      const key = r.sku ? 'sku:' + r.sku.toLowerCase() : 'name:' + r.name.toLowerCase();
      if (seen.has(key)) throw new HttpError(400, `与第 ${seen.get(key)} 行重复`);
      seen.set(key, line);
      const existing = r.sku
        ? db.items.find((i) => i.sku.toLowerCase() === r.sku.toLowerCase())
        : db.items.find((i) => i.name.toLowerCase() === r.name.toLowerCase());
      if (!existing) {
        r.item = cleanItem(input);
        r.qty = num(input.qty, '数量', { int: true });
        r.action = 'create';
        return r;
      }
      if (seenIds.has(existing.id)) throw new HttpError(400, `与第 ${seenIds.get(existing.id)} 行是同一物品`);
      seenIds.set(existing.id, line);
      r.id = existing.id;
      r.name = existing.name;
      if (mode === 'skip') { r.action = 'skip'; return r; }
      const merged = Object.assign({}, existing); // 空白单元格保留原值
      Object.entries(input).forEach(([k, v]) => { if (v !== '') merged[k] = v; });
      r.item = cleanItem(merged, existing);
      r.name = r.item.name;
      if (setQty && input.qty !== undefined && input.qty !== '') {
        const qty = num(input.qty, '数量', { int: true });
        if (qty !== existing.qty) { r.qty = qty; r.qtyBefore = existing.qty; }
      }
      r.action = 'update';
    } catch (err) {
      if (!(err instanceof HttpError)) throw err;
      r.action = 'error';
      r.error = err.message;
    }
    return r;
  });

  if (!body.dryRun) {
    const at = now();
    results.forEach((r) => {
      if (r.action === 'create') {
        const item = Object.assign({ id: nextId(), qty: 0, images: [], createdAt: at, updatedAt: at }, r.item);
        db.items.push(item);
        r.id = item.id;
        if (r.qty > 0) recordMovement(item, 'in', r.qty, '批量导入');
      } else if (r.action === 'update') {
        const item = db.items.find((i) => i.id === r.id);
        Object.assign(item, r.item, { updatedAt: at });
        if (r.qtyBefore !== undefined) recordMovement(item, 'adjust', r.qty, '批量导入盘点');
      }
    });
    if (results.some((r) => r.action === 'create' || r.action === 'update')) save();
  }
  const summary = { create: 0, update: 0, skip: 0, error: 0 };
  results.forEach((r) => summary[r.action]++);
  return { dryRun: !!body.dryRun, mode, summary, rows: results.map(({ item, ...r }) => r) };
}

function recordMovement(item, type, qty, note, extra) {
  const before = item.qty;
  let after;
  if (type === 'in') after = before + qty;
  else if (type === 'out') after = before - qty;
  else after = qty; // adjust：直接设为盘点数量
  if (after < 0) throw new HttpError(400, `「${item.name}」库存不足：当前 ${before}${item.unit}，无法出库 ${qty}${item.unit}`);
  item.qty = after;
  item.updatedAt = now();
  const m = {
    id: nextId(), itemId: item.id, itemName: item.name, sku: item.sku,
    type, qty: type === 'adjust' ? after - before : qty, before, after,
    note: str(note, 200), at: item.updatedAt, ...extra,
  };
  db.movements.push(m);
  return m;
}

// 检查多行合计后库存是否足够（同一物品可出现在多行）
function assertStock(lines, verb) {
  const need = new Map();
  lines.forEach((l) => {
    const item = db.items.find((i) => i.id === l.itemId);
    if (item) need.set(item, (need.get(item) || 0) + l.qty);
  });
  for (const [item, qty] of need) {
    if (qty > item.qty) throw new HttpError(400, `「${item.name}」库存不足：当前 ${item.qty}${item.unit}，${verb}需要 ${qty}${item.unit}`);
  }
}

// ---------- 客户 / 供应商 ----------
function cleanContact(b, label) {
  const c = {
    name: str(b.name, 120), contact: str(b.contact, 80), phone: str(b.phone, 60), email: str(b.email, 120),
    abn: str(b.abn, 30), address: str(b.address, 300), note: str(b.note, 500),
  };
  if (!c.name) throw new HttpError(400, `${label}名称不能为空`);
  if (b.terms !== undefined) c.terms = b.terms === '' || b.terms === null ? null : num(b.terms, '账期天数', { int: true, max: 365 });
  return c;
}
const snapshot = (c) => (c ? { id: c.id, name: c.name, contact: c.contact, phone: c.phone, email: c.email, abn: c.abn, address: c.address } : null);

// ---------- 编号 ----------
function nextNo(kind, prefix, list) {
  let n = (db.counters[kind] || 0) + 1;
  const used = new Set(list.map((x) => x.no));
  while (used.has(prefix + String(n).padStart(4, '0'))) n++;
  db.counters[kind] = n;
  return prefix + String(n).padStart(4, '0');
}

// ---------- 销售发票 ----------
function createInvoice(body) {
  const s = db.settings;
  const date = isDate(body.date) ? body.date : localDate();
  let customer;
  if (body.customerId) {
    customer = snapshot(byId(db.customers, body.customerId, '客户'));
  } else {
    customer = { id: null, name: str(body.customer?.name, 120), contact: '', phone: str(body.customer?.phone, 60), email: '', abn: '', address: str(body.customer?.address, 300) };
  }
  const terms = body.customerId ? db.customers.find((c) => c.id === customer.id).terms ?? s.paymentTermsDays : s.paymentTermsDays;
  const dueDate = isDate(body.dueDate) && body.dueDate >= date ? body.dueDate : addDays(date, terms);

  if (!Array.isArray(body.lines) || !body.lines.length) throw new HttpError(400, '发票至少需要一行商品');
  if (body.lines.length > 200) throw new HttpError(400, '商品行过多');

  const incGst = body.pricesIncGst === undefined ? s.pricesIncGst : bool(body.pricesIncGst);
  const rate = s.gstRegistered ? s.taxRate / 100 : 0;
  const lines = body.lines.map((l, n) => {
    const item = findItem(l.itemId);
    const qty = num(l.qty, `第 ${n + 1} 行数量`, { int: true });
    if (qty <= 0) throw new HttpError(400, `第 ${n + 1} 行数量必须大于 0`);
    const unitPrice = num(l.unitPrice, `第 ${n + 1} 行单价`);
    const discountPct = num(l.discountPct, `第 ${n + 1} 行折扣`, { max: 100 });
    const taxable = rate > 0 && (l.taxable === undefined ? !item.gstFree : bool(l.taxable));
    const gross = round2(qty * unitPrice * (1 - discountPct / 100)); // 按发票价格模式录入的金额
    const gst = !taxable ? 0 : incGst ? round2(gross - gross / (1 + rate)) : round2(gross * rate);
    const ex = incGst ? round2(gross - gst) : gross;
    return {
      itemId: item.id, sku: item.sku, name: item.name, description: str(l.description, 300), unit: item.unit,
      qty, unitPrice, discountPct, taxable, gross, gst, ex,
      unitCost: item.price, cost: round2(qty * item.price),
    };
  });
  assertStock(lines, '开票');

  const subtotalEx = round2(lines.reduce((a, l) => a + l.ex, 0));
  const gst = round2(lines.reduce((a, l) => a + l.gst, 0));
  const total = round2(subtotalEx + gst);
  const costTotal = round2(lines.reduce((a, l) => a + l.cost, 0));

  const inv = {
    id: nextId(), no: nextNo('invoice', s.invoicePrefix, db.invoices), date, dueDate,
    reference: str(body.reference, 60), customer, lines, pricesIncGst: incGst,
    taxName: s.taxName, taxRate: s.gstRegistered ? s.taxRate : 0, gstRegistered: s.gstRegistered,
    subtotalEx, gst, total, costTotal, profit: round2(subtotalEx - costTotal),
    payments: [], amountPaid: 0, balance: total,
    note: str(body.note, 1000), status: 'issued', createdAt: now(),
  };
  lines.forEach((l) => recordMovement(findItem(l.itemId), 'out', l.qty, `销售 ${inv.no}${customer.name ? ' · ' + customer.name : ''}`, { invoiceId: inv.id }));
  db.invoices.push(inv);
  return inv;
}

function refreshPaid(inv) {
  inv.amountPaid = round2(inv.payments.reduce((a, p) => a + p.amount, 0));
  inv.balance = inv.status === 'void' ? 0 : round2(inv.total - inv.amountPaid);
}

function voidInvoice(inv, reason) {
  if (inv.status === 'void') throw new HttpError(400, '该发票已作废');
  if (inv.payments.length) throw new HttpError(400, '该发票已有收款记录，请先删除收款再作废');
  inv.lines.forEach((l) => {
    const item = db.items.find((i) => i.id === l.itemId);
    if (item) recordMovement(item, 'in', l.qty, `作废 ${inv.no}`, { invoiceId: inv.id });
  });
  inv.status = 'void';
  inv.voidedAt = now();
  inv.voidReason = str(reason, 200);
  refreshPaid(inv);
}

// ---------- 采购入库 ----------
function createPurchase(body) {
  const s = db.settings;
  const supplier = body.supplierId ? snapshot(byId(db.suppliers, body.supplierId, '供应商')) : null;
  if (!Array.isArray(body.lines) || !body.lines.length) throw new HttpError(400, '采购单至少需要一行商品');
  if (body.lines.length > 200) throw new HttpError(400, '商品行过多');
  const costMethod = ['average', 'latest', 'none'].includes(body.costMethod) ? body.costMethod : 'average';

  const lines = body.lines.map((l, n) => {
    const item = findItem(l.itemId);
    const qty = num(l.qty, `第 ${n + 1} 行数量`, { int: true });
    if (qty <= 0) throw new HttpError(400, `第 ${n + 1} 行数量必须大于 0`);
    const unitCost = num(l.unitCost, `第 ${n + 1} 行进货价`, { digits: 4 });
    return { itemId: item.id, sku: item.sku, name: item.name, unit: item.unit, qty, unitCost, amount: round2(qty * unitCost) };
  });
  const subtotal = round2(lines.reduce((a, l) => a + l.amount, 0));
  const withGst = bool(body.withGst);
  const gst = withGst ? round2(subtotal * s.taxRate / 100) : 0;

  const po = {
    id: nextId(), no: nextNo('purchase', s.poPrefix, db.purchases),
    date: isDate(body.date) ? body.date : localDate(),
    supplier, supplierRef: str(body.supplierRef, 60), lines, costMethod,
    subtotal, withGst, taxName: s.taxName, taxRate: withGst ? s.taxRate : 0, gst, total: round2(subtotal + gst),
    note: str(body.note, 1000), status: 'received', createdAt: now(),
  };
  lines.forEach((l) => {
    const item = findItem(l.itemId);
    l.costBefore = item.price;
    if (costMethod === 'latest') item.price = l.unitCost;
    if (costMethod === 'average') {
      const oldQty = Math.max(item.qty, 0);
      item.price = round4((oldQty * item.price + l.qty * l.unitCost) / (oldQty + l.qty));
    }
    recordMovement(item, 'in', l.qty, `采购 ${po.no}${supplier ? ' · ' + supplier.name : ''}`, { purchaseId: po.id });
  });
  db.purchases.push(po);
  return po;
}

function voidPurchase(po, reason) {
  if (po.status === 'void') throw new HttpError(400, '该采购单已作废');
  const lines = po.lines.filter((l) => db.items.some((i) => i.id === l.itemId));
  assertStock(lines, '作废采购单');
  lines.forEach((l) => recordMovement(findItem(l.itemId), 'out', l.qty, `作废 ${po.no}`, { purchaseId: po.id }));
  po.status = 'void';
  po.voidedAt = now();
  po.voidReason = str(reason, 200);
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

const imgFile = (id, thumb) => path.join(IMG_DIR, id + (thumb ? '_t' : '') + '.jpg');

function removeImageFiles(ids) {
  ids.forEach((id) => [false, true].forEach((t) => fs.rm(imgFile(id, t), { force: true }, () => {})));
}

async function saveImage(full, thumb) {
  const id = crypto.randomBytes(8).toString('hex');
  await fs.promises.writeFile(imgFile(id, false), decodeImage(full, '图片'));
  if (thumb) await fs.promises.writeFile(imgFile(id, true), decodeImage(thumb, '缩略图'));
  return id;
}

function serveImage(res, name) {
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

// ---------- CSV ----------
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function sendCsv(res, name, rows) {
  send(res, 200, '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'), {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${name}-${localDate()}.csv"`,
  });
}

// ---------- API ----------
async function api(req, res, url) {
  const p = url.pathname;
  const m = req.method;
  let match;

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
  if (p === '/api/session') return send(res, 200, { authed: isAuthed(req), passwordRequired: !!PASSWORD });

  if (!isAuthed(req)) throw new HttpError(401, '请先登录');

  // 一次性读取全部数据（数据量小，前端本地筛选）
  if (p === '/api/all' && m === 'GET') {
    return send(res, 200, {
      items: db.items, movements: db.movements.slice(-3000).reverse(), invoices: db.invoices, purchases: db.purchases,
      customers: db.customers, suppliers: db.suppliers, settings: db.settings,
    });
  }

  // ----- 物品 -----
  if (p === '/api/items' && m === 'POST') {
    const body = await readBody(req);
    const item = Object.assign({ id: nextId(), qty: 0, images: [], createdAt: now(), updatedAt: now() }, cleanItem(body));
    db.items.push(item);
    const initQty = num(body.qty, '初始数量', { int: true });
    if (initQty > 0) recordMovement(item, 'in', initQty, '初始库存');
    save();
    return send(res, 201, item);
  }
  if (p === '/api/items/import' && m === 'POST') {
    return send(res, 200, importItems(await readBody(req, 20 * 1024 * 1024)));
  }
  if (p === '/api/import/items-template.csv' || p === '/api/import/items-sample.csv') {
    const rows = [['SKU', '名称', '分类', '单位', '库位', '数量', '最低库存', '成本价', '默认售价', '免GST', '备注']];
    if (p.endsWith('sample.csv')) {
      rows.push(
        ['HW-001', '不锈钢螺丝 M6x20', '五金', '盒', 'A1-01', 50, 10, 3.25, 6.5, '', '100 颗/盒'],
        ['HW-002', '六角螺母 M6', '五金', '盒', 'A1-02', 30, 10, 1.8, 3.9, '', ''],
        ['FD-001', '新鲜苹果', '食品', 'kg', '冷库', 20, 5, 2.5, 4.99, 'Y', '免 GST 商品'],
        ['', '包装纸箱（大）', '耗材', '个', '', 100, 20, 0.85, '', '', '无 SKU 的物品按名称识别'],
      );
    }
    return sendCsv(res, p.endsWith('sample.csv') ? 'items-sample' : 'items-template', rows);
  }
  if ((match = p.match(/^\/api\/items\/(\d+)$/))) {
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

  // ----- 图片 -----
  if (p.startsWith('/api/images/') && m === 'GET') return serveImage(res, p.slice('/api/images/'.length));
  if ((match = p.match(/^\/api\/items\/(\d+)\/images$/))) {
    const item = findItem(match[1]);
    item.images = item.images || [];
    if (m === 'POST') { // { full: dataURL, thumb: dataURL }
      if (item.images.length >= MAX_IMAGES) throw new HttpError(400, `每个物品最多 ${MAX_IMAGES} 张图片`);
      const body = await readBody(req, 12 * 1024 * 1024);
      const id = await saveImage(body.full, body.thumb);
      item.images.push(id);
      item.updatedAt = now();
      save();
      return send(res, 201, { id, item });
    }
    if (m === 'PUT') { // { images: [id...] } 调整顺序 / 删除，第一张为封面
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

  // ----- 手动出入库 / 盘点 -----
  if (p === '/api/movements' && m === 'GET') {
    const itemId = Number(url.searchParams.get('itemId'));
    return send(res, 200, db.movements.filter((x) => !itemId || x.itemId === itemId).slice(-5000).reverse());
  }
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

  // ----- 客户 / 供应商 -----
  for (const [coll, label, ref] of [['customers', '客户', 'invoices'], ['suppliers', '供应商', 'purchases']]) {
    if (p === `/api/${coll}` && m === 'POST') {
      const c = Object.assign({ id: nextId(), createdAt: now() }, cleanContact(await readBody(req), label));
      db[coll].push(c);
      save();
      return send(res, 201, c);
    }
    if ((match = p.match(new RegExp(`^/api/${coll}/(\\d+)$`)))) {
      const c = byId(db[coll], match[1], label);
      if (m === 'PUT') {
        Object.assign(c, cleanContact(await readBody(req), label));
        save();
        return send(res, 200, c);
      }
      if (m === 'DELETE') {
        const key = ref === 'invoices' ? 'customer' : 'supplier';
        if (db[ref].some((x) => x[key]?.id === c.id)) throw new HttpError(409, `该${label}已有单据，不能删除`);
        db[coll] = db[coll].filter((x) => x !== c);
        save();
        return send(res, 200, { ok: true });
      }
    }
  }

  // ----- 销售发票 -----
  if (p === '/api/invoices' && m === 'POST') {
    const inv = createInvoice(await readBody(req));
    save();
    return send(res, 201, inv);
  }
  if ((match = p.match(/^\/api\/invoices\/(\d+)\/void$/)) && m === 'POST') {
    const inv = byId(db.invoices, match[1], '发票');
    voidInvoice(inv, (await readBody(req)).reason);
    save();
    return send(res, 200, inv);
  }
  if ((match = p.match(/^\/api\/invoices\/(\d+)\/payments$/)) && m === 'POST') {
    const inv = byId(db.invoices, match[1], '发票');
    if (inv.status === 'void') throw new HttpError(400, '已作废的发票不能收款');
    const b = await readBody(req);
    const amount = num(b.amount, '收款金额');
    if (amount <= 0) throw new HttpError(400, '收款金额必须大于 0');
    if (amount > inv.balance + 0.001) throw new HttpError(400, `收款金额超过未收余额 ${inv.balance.toFixed(2)}`);
    inv.payments.push({
      id: nextId(), date: isDate(b.date) ? b.date : localDate(), amount,
      method: str(b.method, 40) || 'Bank Transfer', note: str(b.note, 200), at: now(),
    });
    refreshPaid(inv);
    save();
    return send(res, 201, inv);
  }
  if ((match = p.match(/^\/api\/invoices\/(\d+)\/payments\/(\d+)$/)) && m === 'DELETE') {
    const inv = byId(db.invoices, match[1], '发票');
    inv.payments = inv.payments.filter((x) => x.id !== Number(match[2]));
    refreshPaid(inv);
    save();
    return send(res, 200, inv);
  }

  // ----- 采购入库 -----
  if (p === '/api/purchases' && m === 'POST') {
    const po = createPurchase(await readBody(req));
    save();
    return send(res, 201, po);
  }
  if ((match = p.match(/^\/api\/purchases\/(\d+)\/void$/)) && m === 'POST') {
    const po = byId(db.purchases, match[1], '采购单');
    voidPurchase(po, (await readBody(req)).reason);
    save();
    return send(res, 200, po);
  }

  // ----- 设置 -----
  if (p === '/api/settings' && m === 'PUT') {
    const b = await readBody(req);
    const s = db.settings;
    for (const k of ['companyName', 'abn', 'companyPhone', 'companyEmail', 'website', 'currencyCode', 'taxName', 'invoicePrefix', 'poPrefix',
      'bankName', 'accountName', 'bsb', 'accountNumber', 'payId']) if (b[k] !== undefined) s[k] = str(b[k], 120);
    for (const k of ['companyAddress', 'invoiceFooter']) if (b[k] !== undefined) s[k] = str(b[k], 500);
    if (b.currency !== undefined) s.currency = str(b.currency, 5) || '$';
    if (b.taxRate !== undefined) s.taxRate = num(b.taxRate, '税率', { max: 100 });
    if (b.paymentTermsDays !== undefined) s.paymentTermsDays = num(b.paymentTermsDays, '账期天数', { int: true, max: 365 });
    if (b.gstRegistered !== undefined) s.gstRegistered = bool(b.gstRegistered);
    if (b.pricesIncGst !== undefined) s.pricesIncGst = bool(b.pricesIncGst);
    s.taxName = s.taxName || 'GST';
    s.invoicePrefix = s.invoicePrefix || 'INV-';
    s.poPrefix = s.poPrefix || 'PO-';
    save();
    return send(res, 200, s);
  }
  if (p === '/api/settings/logo' && m === 'POST') {
    const body = await readBody(req, 6 * 1024 * 1024);
    const id = await saveImage(body.data);
    if (db.settings.logo) removeImageFiles([db.settings.logo]);
    db.settings.logo = id;
    save();
    return send(res, 200, db.settings);
  }
  if (p === '/api/settings/logo' && m === 'DELETE') {
    if (db.settings.logo) removeImageFiles([db.settings.logo]);
    db.settings.logo = '';
    save();
    return send(res, 200, db.settings);
  }

  // ----- 导出 -----
  const englishCsv = url.searchParams.get('lang') === 'en';
  if (p === '/api/export/items.csv') {
    const rows = [englishCsv
      ? ['SKU', 'Name', 'Category', 'Unit', 'Location', 'Quantity', 'Minimum stock', 'Cost price', 'Default sale price', 'GST-free', 'Inventory cost value', 'Notes']
      : ['SKU', '名称', '分类', '单位', '库位', '数量', '最低库存', '成本价', '默认售价', '免GST', '库存成本金额', '备注']];
    db.items.forEach((i) => rows.push([i.sku, i.name, i.category, i.unit, i.location, i.qty, i.minQty, i.price, i.salePrice || 0, i.gstFree ? 'Y' : '', round2(i.qty * i.price), i.note]));
    return sendCsv(res, 'items', rows);
  }
  if (p === '/api/export/movements.csv') {
    const label = englishCsv ? { in: 'Stock in', out: 'Stock out', adjust: 'Stocktake' } : { in: '入库', out: '出库', adjust: '盘点' };
    const rows = [englishCsv
      ? ['Time', 'Type', 'SKU', 'Name', 'Change', 'Before', 'After', 'Notes']
      : ['时间', '类型', 'SKU', '名称', '变动', '变动前', '变动后', '备注']];
    db.movements.forEach((x) => rows.push([x.at, label[x.type], x.sku, x.itemName, x.qty, x.before, x.after, x.note]));
    return sendCsv(res, 'movements', rows);
  }
  if (p === '/api/export/invoices.csv') {
    const rows = [['Invoice No', 'Date', 'Due Date', 'Status', 'Customer', 'ABN', 'Reference', 'Subtotal (ex GST)', 'GST', 'Total', 'Paid', 'Balance', 'Cost', 'Gross Profit']];
    db.invoices.forEach((v) => rows.push([v.no, v.date, v.dueDate, v.status === 'void' ? 'VOID' : v.balance <= 0 ? 'PAID' : 'OPEN',
      v.customer.name, v.customer.abn, v.reference, v.subtotalEx, v.gst, v.total, v.amountPaid, v.balance, v.costTotal, v.profit]));
    return sendCsv(res, 'invoices', rows);
  }
  if (p === '/api/export/invoice-lines.csv') {
    const rows = [['Invoice No', 'Date', 'Status', 'Customer', 'SKU', 'Item', 'Qty', 'Unit Price', 'Disc %', 'GST', 'Amount (ex GST)', 'Unit Cost', 'Cost']];
    db.invoices.forEach((v) => v.lines.forEach((l) => rows.push([v.no, v.date, v.status, v.customer.name, l.sku, l.name, l.qty, l.unitPrice, l.discountPct, l.gst, l.ex, l.unitCost, l.cost])));
    return sendCsv(res, 'invoice-lines', rows);
  }
  if (p === '/api/export/purchases.csv') {
    const rows = [englishCsv
      ? ['Purchase number', 'Date', 'Status', 'Supplier', 'Supplier reference', 'SKU', 'Item', 'Quantity', 'Unit cost (ex GST)', 'Amount']
      : ['采购单号', '日期', '状态', '供应商', '供应商单号', 'SKU', '商品', '数量', '进货价(不含GST)', '金额']];
    db.purchases.forEach((po) => po.lines.forEach((l) => rows.push([po.no, po.date, po.status === 'void' ? (englishCsv ? 'Void' : '已作废') : (englishCsv ? 'Received' : '已入库'), po.supplier?.name || '', po.supplierRef, l.sku, l.name, l.qty, l.unitCost, l.amount])));
    return sendCsv(res, 'purchases', rows);
  }
  if (p === '/api/backup' && m === 'GET') {
    return send(res, 200, db, { 'Content-Disposition': `attachment; filename="inventory-backup-${localDate()}.json"` });
  }
  if (p === '/api/backup' && m === 'POST') {
    const body = await readBody(req, 50 * 1024 * 1024);
    if (!Array.isArray(body.items) || !Array.isArray(body.movements)) throw new HttpError(400, '备份文件格式不正确');
    const next = Object.assign(emptyDb(), body);
    next.items.forEach((i) => { i.images = (Array.isArray(i.images) ? i.images : []).filter((id) => IMG_ID.test(id) && fs.existsSync(imgFile(id))); });
    const all = ['items', 'movements', 'invoices', 'purchases', 'customers', 'suppliers'].flatMap((k) => (Array.isArray(next[k]) ? next[k] : []));
    next.seq = Math.max(Number(next.seq) || 1, Math.max(0, ...all.map((x) => x.id || 0)) + 1);
    db = next;
    migrate();
    save();
    return send(res, 200, { ok: true, items: db.items.length, invoices: db.invoices.length, purchases: db.purchases.length });
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
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
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
    const status = e.status || 500;
    if (status === 500) console.error(e);
    send(res, status, { error: status === 500 ? '服务器内部错误' : e.message });
  }
});

server.listen(PORT, () => {
  console.log(`但丁进销存已启动: http://localhost:${PORT}`);
  if (!PASSWORD) console.warn('⚠️  未设置 APP_PASSWORD，任何人都可访问。公网部署前请务必设置！');
});
