'use strict';

// ---------- 工具 ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const addDays = (date, n) => { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + Number(n || 0)); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const fmtDate = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : ''); // 澳洲日期格式 DD/MM/YYYY
const fmtTime = (iso) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtNum = (n) => Math.abs(Number(n || 0)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n) => (Number(n) < -0.004 ? '-' : '') + (S().currency || '$') + fmtNum(n);
const sum = (list, f) => r2(list.reduce((a, x) => a + (Number(f(x)) || 0), 0));
const imgUrl = (id, thumb) => `/api/images/${id}${thumb ? '_t' : ''}.jpg`;
const isLow = (i) => i.minQty > 0 && i.qty <= i.minQty;
const TYPE = { in: '入库', out: '出库', adjust: '盘点' };
const MAX_IMAGES = 10;

let D = { items: [], movements: [], invoices: [], purchases: [], customers: [], suppliers: [], settings: {} };
const S = () => D.settings;
const taxRate = () => (S().gstRegistered ? Number(S().taxRate) / 100 : 0);
const itemById = (id) => D.items.find((i) => i.id === Number(id));
const custById = (id) => D.customers.find((c) => c.id === Number(id));
const supById = (id) => D.suppliers.find((c) => c.id === Number(id));

function toast(msg) {
  const t = $('#toast');
  t.textContent = tr(msg);
  try { t.hidePopover(); t.showPopover(); } catch {} // 置于弹窗之上
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}
const askConfirm = (message) => window.confirm(tr(message));
const askPrompt = (message) => window.prompt(tr(message));

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') { showLogin(); throw new Error(data.error || '请先登录'); }
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

// 发票状态：作废 / 已付清 / 逾期 / 部分付款 / 未付款
function invStatus(v) {
  if (v.status === 'void') return 'void';
  if (v.balance <= 0.004) return 'paid';
  if (v.dueDate < today()) return 'overdue';
  if (v.amountPaid > 0) return 'partial';
  return 'unpaid';
}
const INV_LABEL = { void: '已作废', paid: '已付清', overdue: '逾期', partial: '部分付款', unpaid: '未付款' };
const isOpen = (v) => v.status !== 'void' && v.balance > 0.004;

// 账龄：按到期日计算逾期天数
function aging(list) {
  const b = { current: 0, d30: 0, d60: 0, d90: 0, over: 0, total: 0 };
  const t = today();
  list.filter(isOpen).forEach((v) => {
    const late = daysBetween(v.dueDate, t);
    const k = late <= 0 ? 'current' : late <= 30 ? 'd30' : late <= 60 ? 'd60' : late <= 90 ? 'd90' : 'over';
    b[k] = r2(b[k] + v.balance);
    b.total = r2(b.total + v.balance);
  });
  return b;
}

// ---------- 登录 / 加载 ----------
function showLogin() { $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); }
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await api('/api/login', { method: 'POST', body: { password: e.target.password.value } }); e.target.reset(); start(); }
  catch (err) { toast(err.message); }
});
$('#logoutBtn').onclick = async () => { await api('/api/logout', { method: 'POST' }); showLogin(); };

async function start() {
  const s = await api('/api/session');
  if (!s.authed) return showLogin();
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#logoutBtn').classList.toggle('hidden', !s.passwordRequired);
  await reload();
}

async function reload() {
  D = await api('/api/all');
  render();
  // 编辑中的单据：刷新下拉选项（例如刚新增了客户 / 物品）
  if ($('#invDlg').open) { fillSelect($('#invCustomer'), D.customers, '（散客 / 不指定客户）', $('#invCustomer').value); renderInvLines(); }
  if ($('#poDlg').open) { fillSelect($('#poSupplier'), D.suppliers, '（不指定供应商）', $('#poSupplier').value); renderPoLines(); }
}

// ---------- 导航 ----------
function go(tab) {
  if (!$(`section[data-view="${tab}"]`)) tab = 'dashboard';
  $$('nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('section[data-view]').forEach((v) => v.classList.toggle('hidden', v.dataset.view !== tab));
  history.replaceState(null, '', '#' + tab);
  window.scrollTo(0, 0);
}
$$('nav button').forEach((b) => (b.onclick = () => go(b.dataset.tab)));
if (location.hash) go(location.hash.slice(1));

function render() {
  renderDashboard(); renderItems(); renderCategories(); renderInvoices(); renderCustomers();
  renderPurchases(); renderSuppliers(); renderMovements(); renderSettings();
}

// ---------- 统一点击事件 ----------
document.addEventListener('click', (e) => {
  const close = e.target.closest('[data-close]');
  if (close) return close.closest('dialog').close();
  const goto = e.target.closest('[data-goto]');
  if (goto) return go(goto.dataset.goto);
  const a = e.target.closest('[data-act]');
  if (!a) return;
  e.preventDefault();
  const id = Number(a.dataset.id);
  const act = {
    mv: () => openMove(id, a.dataset.t),
    'edit-item': () => openItem(itemById(id)),
    hist: () => openHistory(id),
    gallery: () => { const it = itemById(id); openViewer(it.images.map((x) => imgUrl(x)), 0, it.name); },
    inv: () => openInvoiceView(id),
    po: () => openPurchaseView(id),
    stmt: () => openStatement(id),
    'edit-cust': () => openContact('customers', custById(id)),
    'edit-sup': () => openContact('suppliers', supById(id)),
    'new-inv': () => openInvoiceEditor({ customerId: id || '' }),
    'new-po': () => openPoEditor({ supplierId: id || '', itemId: Number(a.dataset.item) || '' }),
    'sup-pos': () => { $('#pq').value = supById(id).name; renderPurchases(); go('purchases'); },
    'cust-invs': () => { $('#iq').value = custById(id).name; $('#iStatus').value = ''; renderInvoices(); go('invoices'); },
  }[a.dataset.act];
  if (act) act();
});

// ---------- 概览 ----------
function renderDashboard() {
  const month = today().slice(0, 7);
  const inv = D.invoices.filter((v) => v.status !== 'void' && v.date.startsWith(month));
  $('#sSales').textContent = money(sum(inv, (v) => v.subtotalEx));
  const profit = sum(inv, (v) => v.profit);
  $('#sProfit').textContent = money(profit);
  $('#sProfit').className = 'value ' + (profit < 0 ? 'neg' : 'pos');
  const ag = aging(D.invoices);
  $('#sAR').textContent = money(ag.total);
  $('#sOverdue').textContent = money(ag.total - ag.current);
  $('#sPurch').textContent = money(sum(D.purchases.filter((p) => p.status !== 'void' && p.date.startsWith(month)), (p) => p.subtotal));
  $('#sValue').textContent = money(sum(D.items, (i) => i.qty * i.price));
  const low = D.items.filter(isLow).sort((a, b) => a.qty - b.qty);
  $('#sCount').textContent = D.items.length;
  $('#sLow').textContent = low.length;

  const overdue = D.invoices.filter((v) => invStatus(v) === 'overdue').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  $('#dueBody').innerHTML = overdue.length ? overdue.slice(0, 8).map((v) => `
    <tr><td><a href="#" data-act="inv" data-id="${v.id}">${esc(v.no)}</a><div class="muted small">${esc(v.customer.name) || '散客'}</div></td>
    <td><span class="tag overdue">逾期 ${daysBetween(v.dueDate, today())} 天</span></td><td class="num">${money(v.balance)}</td></tr>`).join('')
    : '<tr><td class="empty">没有逾期发票 👍</td></tr>';
  $('#lowBody').innerHTML = low.length ? low.slice(0, 8).map((i) => `
    <tr><td>${esc(i.name)}<div class="muted small">最低 ${i.minQty}${esc(i.unit)}</div></td><td class="num qty-low">${i.qty}</td>
    <td class="actions"><button class="btn sm in" data-act="new-po" data-item="${i.id}">采购</button></td></tr>`).join('')
    : '<tr><td class="empty">暂无低库存物品 👍</td></tr>';
  $('#recentBody').innerHTML = D.movements.length ? D.movements.slice(0, 8).map((m) => `
    <tr><td>${esc(m.itemName)}<div class="muted small">${fmtTime(m.at)}</div></td><td><span class="tag ${m.type}">${TYPE[m.type]}</span></td>
    <td class="num">${signed(m)}</td></tr>`).join('')
    : '<tr><td class="empty">暂无记录</td></tr>';
}
const signed = (m) => (m.type === 'out' ? '-' : m.qty > 0 ? '+' : '') + m.qty;

// ---------- 物品 ----------
let sort = { key: 'name', dir: 1 };
function renderCategories() {
  const cats = [...new Set(D.items.map((i) => i.category).filter(Boolean))].sort();
  const cur = $('#catFilter').value;
  $('#catFilter').innerHTML = '<option value="">全部分类</option>' + cats.map((c) => `<option ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('#catList').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');
}

function renderItems() {
  const q = $('#q').value.trim().toLowerCase();
  const cat = $('#catFilter').value;
  const lowOnly = $('#lowOnly').checked;
  const val = (i, k) => (k === 'value' ? i.qty * i.price : k === 'salePrice' ? i.salePrice || 0 : i[k]);
  const list = D.items
    .filter((i) => (!cat || i.category === cat) && (!lowOnly || isLow(i)) &&
      (!q || [i.name, i.sku, i.location, i.note, i.category].some((f) => String(f || '').toLowerCase().includes(q))))
    .sort((a, b) => {
      const x = val(a, sort.key), y = val(b, sort.key);
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'zh-CN')) * sort.dir;
    });
  $$('th[data-sort]').forEach((th) => {
    th.textContent = th.textContent.replace(/ [▲▼]$/, '') + (th.dataset.sort === sort.key ? (sort.dir > 0 ? ' ▲' : ' ▼') : '');
  });
  $('#itemsBody').innerHTML = list.length ? list.map((i) => `
    <tr>
      <td class="img">${i.images?.length ? `<img class="thumb" loading="lazy" src="${imgUrl(i.images[0], true)}" data-act="gallery" data-id="${i.id}" alt="">` : '<div class="thumb none">📷</div>'}</td>
      <td class="muted hide-sm">${esc(i.sku) || '—'}</td>
      <td><a href="#" data-act="hist" data-id="${i.id}">${esc(i.name)}</a> ${isLow(i) ? '<span class="tag low">低库存</span>' : ''}${i.gstFree ? ' <span class="tag unpaid">GST-free</span>' : ''}</td>
      <td class="hide-sm">${esc(i.category) || '<span class="muted">—</span>'}</td>
      <td class="hide-sm">${esc(i.location) || '<span class="muted">—</span>'}</td>
      <td class="num ${isLow(i) ? 'qty-low' : ''}">${i.qty} <span class="muted">${esc(i.unit)}</span></td>
      <td class="num hide-sm">${money(i.price)}</td>
      <td class="num hide-sm">${i.salePrice ? money(i.salePrice) : '<span class="muted">—</span>'}</td>
      <td class="num hide-sm">${money(i.qty * i.price)}</td>
      <td class="actions">
        <button class="btn sm" data-act="mv" data-id="${i.id}" data-t="in">出入库</button>
        <button class="btn sm" data-act="edit-item" data-id="${i.id}">编辑</button>
      </td>
    </tr>`).join('')
    : `<tr><td colspan="10" class="empty">${D.items.length ? '没有匹配的物品' : '还没有物品，点击右上角「新增物品」开始吧'}</td></tr>`;
}
['#q', '#catFilter', '#lowOnly'].forEach((s) => $(s).addEventListener('input', renderItems));
$$('th[data-sort]').forEach((th) => (th.onclick = () => {
  sort = { key: th.dataset.sort, dir: sort.key === th.dataset.sort ? -sort.dir : 1 };
  renderItems();
}));

// 物品编辑
let editingItem = null, onItemSaved = null, imgs = [];
$('#addItemBtn').onclick = () => openItem(null);
function openItem(item, opts = {}) {
  editingItem = item;
  onItemSaved = opts.onSaved || null;
  const f = $('#itemForm');
  f.reset();
  $('#itemDlgTitle').textContent = item ? '编辑物品' : '新增物品';
  $('#initQtyField').classList.toggle('hidden', !!item || !!opts.noInitQty);
  $('#delItemBtn').classList.toggle('hidden', !item);
  if (item) {
    ['name', 'sku', 'category', 'unit', 'location', 'minQty', 'price', 'salePrice', 'note'].forEach((k) => (f[k].value = item[k] ?? ''));
    f.gstFree.checked = !!item.gstFree;
  }
  // 图片在对话框内先暂存，点「保存」时才真正上传 / 删除
  imgs = (item?.images || []).map((id) => ({ id, src: imgUrl(id, true), full: imgUrl(id) }));
  renderImgs();
  $('#itemDlg').showModal();
}
$('#itemForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = Object.fromEntries(new FormData(f));
  body.gstFree = f.gstFree.checked;
  const btn = e.submitter || f.querySelector('button.primary');
  btn.disabled = true;
  try {
    const item = editingItem
      ? await api('/api/items/' + editingItem.id, { method: 'PUT', body })
      : await api('/api/items', { method: 'POST', body });
    editingItem = item; // 新建后若图片上传失败，再次保存不会重复创建
    const pending = imgs.filter((x) => !x.id);
    for (let n = 0; n < pending.length; n++) {
      btn.textContent = `上传图片 ${n + 1}/${pending.length}…`;
      const r = await api(`/api/items/${item.id}/images`, { method: 'POST', body: { full: pending[n].data, thumb: pending[n].thumb } });
      pending[n].id = r.id;
    }
    const order = imgs.map((x) => x.id);
    if (order.join() !== (item.images || []).join() || pending.length) {
      await api(`/api/items/${item.id}/images`, { method: 'PUT', body: { images: order } });
    }
    $('#itemDlg').close();
    toast('已保存');
    await reload();
    onItemSaved?.(itemById(item.id));
  } catch (err) { toast(err.message); }
  finally { btn.disabled = false; btn.textContent = '保存'; }
});
$('#delItemBtn').onclick = async () => {
  if (!editingItem || !askConfirm(`确定删除「${editingItem.name}」？历史单据和流水会保留。`)) return;
  try { await api('/api/items/' + editingItem.id, { method: 'DELETE' }); $('#itemDlg').close(); toast('已删除'); await reload(); }
  catch (err) { toast(err.message); }
};

// ---------- 批量导入物品 ----------
// 表头别名（小写、去空格和括号说明后匹配），兼容本系统导出的「物品清单」和常见英文表头
const IMPORT_COLS = {
  sku: ['sku', '编码', 'sku/编码', '货号', 'code', 'itemcode', 'productcode'],
  name: ['名称', '物品', '物品名称', '商品', '商品名称', '产品', '产品名称', 'name', 'itemname', 'productname', 'product', 'item'],
  category: ['分类', '类别', 'category'],
  unit: ['单位', 'unit', 'uom'],
  location: ['库位', '位置', 'location', 'bin'],
  qty: ['数量', '初始数量', '库存', '库存数量', 'qty', 'quantity', 'stock', 'onhand'],
  minQty: ['最低库存', '安全库存', 'minqty', 'min', 'reorderlevel', 'reorderpoint'],
  price: ['成本价', '成本', '进货价', '进价', 'cost', 'costprice', 'unitcost'],
  salePrice: ['默认售价', '售价', '销售价', '零售价', 'saleprice', 'sellprice', 'sellingprice', 'price'],
  gstFree: ['免gst', '免税', 'gstfree'],
  note: ['备注', '说明', 'note', 'notes', 'remark', 'remarks'],
};
const IMPORT_LABEL = { sku: 'SKU', name: '名称', category: '分类', unit: '单位', location: '库位', qty: '数量', minQty: '最低库存', price: '成本价', salePrice: '默认售价', gstFree: '免GST', note: '备注' };
const normHead = (s) => String(s).toLowerCase().replace(/[（(][^）)]*[）)]/g, '').replace(/[\s*_\-]/g, '');
const HEAD_MAP = new Map(Object.entries(IMPORT_COLS).flatMap(([k, list]) => list.map((a) => [a, k])));

// 解析 CSV / TSV（支持引号、单元格内换行、BOM；自动识别逗号、分号或 Tab 分隔）
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0];
  const delim = first.includes('\t') ? '\t' : first.split(';').length > first.split(',').length ? ';' : ',';
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// 表格文本 → 导入行；返回 { rows, cols } 或 { error }
function readImportTable(text) {
  const table = parseCsv(text);
  const headIdx = table.findIndex((r) => r.some((c) => c.trim()));
  if (headIdx < 0) return { error: '请先选择文件或粘贴表格内容' };
  const cols = {};
  table[headIdx].forEach((h, n) => { const k = HEAD_MAP.get(normHead(h)); if (k && !(k in cols)) cols[k] = n; });
  if (!('name' in cols)) return { error: '没有找到「名称」列，请确认第一行是表头（可下载模板参考）' };
  const rows = [];
  table.slice(headIdx + 1).forEach((r, n) => {
    if (!r.some((c) => c.trim())) return;
    const row = { line: headIdx + n + 2 };
    Object.entries(cols).forEach(([k, i]) => { row[k] = (r[i] ?? '').trim(); });
    rows.push(row);
  });
  if (!rows.length) return { error: '表格中没有数据行' };
  return { rows, cols };
}

let importRows = null;
$('#importItemsBtn').onclick = () => {
  $('#importForm').reset();
  $('#importFileName').textContent = '';
  resetImportPreview();
  updateImportOpts();
  $('#importDlg').showModal();
};
function resetImportPreview(html = '') {
  importRows = null;
  $('#importGo').disabled = true;
  $('#importPreview').innerHTML = html;
}
function updateImportOpts() {
  $('#importSetQtyWrap').classList.toggle('hidden', $('#importForm').mode.value !== 'update');
}
function importOpts() {
  const f = $('#importForm');
  return { mode: f.mode.value, setQty: f.mode.value === 'update' && f.setQty.checked };
}
$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (/\.xlsx?$/i.test(file.name)) return toast('请在 Excel 中「另存为 CSV（UTF-8）」后再导入，或直接复制表格粘贴');
  $('#importFileName').textContent = file.name;
  $('#importText').value = await file.text();
  previewImport();
});
$('#importText').addEventListener('input', () => resetImportPreview());
$('#importForm').addEventListener('change', (e) => {
  if (e.target.name === 'mode' || e.target.name === 'setQty') { updateImportOpts(); if ($('#importText').value.trim()) previewImport(); }
});
$('#importPreviewBtn').onclick = () => previewImport();

async function previewImport() {
  const t = readImportTable($('#importText').value);
  if (t.error) return resetImportPreview(`<p class="stock-warn">${esc(t.error)}</p>`);
  try {
    const r = await api('/api/items/import', { method: 'POST', body: { rows: t.rows, ...importOpts(), dryRun: true } });
    renderImportPreview(r, t);
    importRows = t.rows;
    $('#importGo').disabled = !(r.summary.create + r.summary.update);
  } catch (err) { resetImportPreview(`<p class="stock-warn">${esc(err.message)}</p>`); }
}

const IMPORT_ACT = { create: ['in', '新增'], update: ['adjust', '更新'], skip: ['void', '跳过'], error: ['low', '有误'] };
const MAX_PREVIEW = 500;
function renderImportPreview(r, { rows, cols }) {
  const s = r.summary;
  const src = new Map(rows.map((x) => [x.line, x]));
  const cell = (row, k) => esc(src.get(row.line)?.[k] ?? '') || '<span class="muted">—</span>';
  $('#importPreview').innerHTML = `
    <div class="muted small" style="margin-bottom:6px">识别到的列：${Object.keys(cols).map((k) => IMPORT_LABEL[k]).join('、')}</div>
    <div style="margin-bottom:8px">
      <span class="tag in">新增 ${s.create}</span> <span class="tag adjust">更新 ${s.update}</span>
      <span class="tag void">跳过 ${s.skip}</span> <span class="tag low">有误 ${s.error}</span>
      ${s.error ? '<span class="stock-warn">　有误的行不会导入</span>' : ''}
    </div>
    <div class="table-wrap" style="max-height:340px;overflow:auto;border:1px solid var(--line);border-radius:8px">
      <table>
        <thead><tr><th class="num">行</th><th>状态</th><th>SKU</th><th>名称</th><th class="hide-sm">分类</th><th class="num">数量</th><th class="num hide-sm">成本价</th><th class="num hide-sm">售价</th><th>说明</th></tr></thead>
        <tbody>${r.rows.slice(0, MAX_PREVIEW).map((x) => `
          <tr>
            <td class="num muted">${x.line}</td>
            <td><span class="tag ${IMPORT_ACT[x.action][0]}">${IMPORT_ACT[x.action][1]}</span></td>
            <td>${esc(x.sku) || '<span class="muted">—</span>'}</td>
            <td>${esc(x.name) || '<span class="muted">—</span>'}</td>
            <td class="hide-sm">${cell(x, 'category')}</td>
            <td class="num">${cell(x, 'qty')}</td>
            <td class="num hide-sm">${cell(x, 'price')}</td>
            <td class="num hide-sm">${cell(x, 'salePrice')}</td>
            <td class="wrap small">${x.error ? `<span class="stock-warn">${esc(x.error)}</span>`
              : x.action === 'skip' ? '<span class="muted">已存在</span>'
              : x.qtyBefore !== undefined ? `<span class="muted">库存 ${x.qtyBefore} → ${x.qty}</span>` : ''}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>
    ${r.rows.length > MAX_PREVIEW ? `<p class="hint">仅显示前 ${MAX_PREVIEW} 行，共 ${r.rows.length} 行</p>` : ''}`;
}
$('#importForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!importRows) return;
  const btn = $('#importGo');
  btn.disabled = true;
  try {
    const r = await api('/api/items/import', { method: 'POST', body: { rows: importRows, ...importOpts() } });
    const s = r.summary;
    $('#importDlg').close();
    toast(`导入完成：新增 ${s.create}，更新 ${s.update}，跳过 ${s.skip}` + (s.error ? `，${s.error} 行有误未导入` : ''));
    await reload();
  } catch (err) { toast(err.message); btn.disabled = false; }
});

// 图片编辑
function renderImgs() {
  $('#imgGrid').innerHTML = imgs.map((x, n) => `
    <div class="cell">
      <img src="${x.src}" data-idx="${n}" alt="">
      ${n === 0 ? '<span class="cover">封面</span>' : ''}
      <div class="ops">
        ${n > 0 ? `<button type="button" data-cover="${n}">设封面</button>` : ''}
        <button type="button" data-rm="${n}">删除</button>
      </div>
    </div>`).join('') +
    (imgs.length < MAX_IMAGES ? '<div class="add" id="imgAdd" role="button" tabindex="0">＋<br>添加图片</div>' : '');
}
$('#imgGrid').addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('#imgAdd')) return $('#imgInput').click();
  if (t.dataset.rm) { imgs.splice(Number(t.dataset.rm), 1); return renderImgs(); }
  if (t.dataset.cover) { imgs.unshift(...imgs.splice(Number(t.dataset.cover), 1)); return renderImgs(); }
  if (t.dataset.idx) openViewer(imgs.map((x) => x.full), Number(t.dataset.idx), $('#itemForm').name.value);
});
$('#imgGrid').addEventListener('keydown', (e) => { if (e.target.id === 'imgAdd' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('#imgInput').click(); } });
$('#imgInput').addEventListener('change', (e) => { addImageFiles(e.target.files); e.target.value = ''; });
$('#imgGrid').addEventListener('dragover', (e) => { e.preventDefault(); $('#imgGrid').classList.add('drag'); });
$('#imgGrid').addEventListener('dragleave', () => $('#imgGrid').classList.remove('drag'));
$('#imgGrid').addEventListener('drop', (e) => { e.preventDefault(); $('#imgGrid').classList.remove('drag'); addImageFiles(e.dataTransfer.files); });
$('#itemDlg').addEventListener('paste', (e) => {
  const files = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); addImageFiles(files); }
});

async function addImageFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
  const room = MAX_IMAGES - imgs.length;
  if (files.length > room) toast(`每个物品最多 ${MAX_IMAGES} 张图片，已忽略多余的 ${files.length - room} 张`);
  for (const f of files.slice(0, Math.max(room, 0))) {
    try {
      const data = await compressImage(f, 1600, 0.85);
      const thumb = await compressImage(f, 240, 0.8);
      imgs.push({ id: null, src: thumb, full: data, data, thumb });
      renderImgs();
    } catch { toast(`无法读取图片「${f.name}」，请换成 JPG / PNG 格式`); }
  }
}

// 在浏览器里缩放并压缩成 JPEG，手机拍的大图也只有几百 KB
function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; // 透明背景填白
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

// 图片查看
let viewer = { list: [], i: 0, title: '' };
function openViewer(list, i, title) {
  viewer = { list, i, title };
  showViewer();
  if (!$('#viewer').open) $('#viewer').showModal();
}
function showViewer() {
  const { list, i, title } = viewer;
  $('#vImg').src = list[i];
  $('#vCap').textContent = `${title || ''}  ${i + 1} / ${list.length}`;
  $('#vPrev').classList.toggle('hidden', list.length < 2);
  $('#vNext').classList.toggle('hidden', list.length < 2);
}
const step = (d) => { viewer.i = (viewer.i + d + viewer.list.length) % viewer.list.length; showViewer(); };
$('#vPrev').onclick = () => step(-1);
$('#vNext').onclick = () => step(1);
$('#viewer').addEventListener('click', (e) => { if (e.target.id === 'viewer') $('#viewer').close(); });
$('#viewer').addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
let touchX = null;
$('#viewer').addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
$('#viewer').addEventListener('touchend', (e) => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); touchX = null; });

// ---------- 手动出入库 / 历史 ----------
let moving = null;
function openMove(id, type) {
  moving = itemById(id);
  const f = $('#movForm');
  f.reset();
  f.type.value = type || 'in';
  $('#movTitle').textContent = moving.name;
  $('#movInfo').textContent = `当前库存：${moving.qty} ${moving.unit}`;
  updateMoveLabel();
  $('#movDlg').showModal();
  f.qty.focus();
}
function updateMoveLabel() {
  const t = $('#movForm').type.value;
  $('#movQtyLabel').firstChild.textContent = t === 'adjust' ? '盘点后实际数量' : t === 'in' ? '入库数量' : '出库数量';
}
$$('#movForm input[name=type]').forEach((r) => r.addEventListener('change', updateMoveLabel));
$('#movForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target));
  try {
    await api('/api/movements', { method: 'POST', body: { ...body, itemId: moving.id } });
    $('#movDlg').close(); toast(TYPE[body.type] + '成功'); await reload();
  } catch (err) { toast(err.message); }
});

async function openHistory(id) {
  const item = itemById(id);
  $('#histTitle').textContent = `${item.name} · 当前 ${item.qty} ${item.unit} · 成本价 ${money(item.price)}`;
  const list = await api('/api/movements?itemId=' + id);
  $('#histBody').innerHTML = list.length ? list.map((m) => `<tr><td class="muted">${fmtTime(m.at)}</td><td><span class="tag ${m.type}">${TYPE[m.type]}</span></td>
    <td class="num">${signed(m)}</td><td class="num">${m.after}</td><td class="wrap">${esc(m.note)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="empty">暂无记录</td></tr>';
  $('#histDlg').showModal();
}

function renderMovements() {
  const q = $('#mq').value.trim().toLowerCase();
  const t = $('#mType').value;
  const list = D.movements.filter((m) => (!t || m.type === t) && (!q || [m.itemName, m.sku, m.note].some((f) => String(f || '').toLowerCase().includes(q))));
  $('#movBody').innerHTML = list.length ? list.slice(0, 1000).map((m) => `<tr><td class="muted">${fmtTime(m.at)}</td><td><span class="tag ${m.type}">${TYPE[m.type]}</span></td>
    <td>${esc(m.itemName)}${m.sku ? ` <span class="muted">${esc(m.sku)}</span>` : ''}</td>
    <td class="num">${signed(m)}</td><td class="num hide-sm">${m.before}</td><td class="num">${m.after}</td>
    <td class="wrap">${m.invoiceId ? `<a href="#" data-act="inv" data-id="${m.invoiceId}">${esc(m.note)}</a>` : m.purchaseId ? `<a href="#" data-act="po" data-id="${m.purchaseId}">${esc(m.note)}</a>` : esc(m.note)}</td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">暂无记录</td></tr>';
}
['#mq', '#mType'].forEach((s) => $(s).addEventListener('input', renderMovements));

// ---------- 客户 / 供应商 ----------
let contactCtx = null;
$('#addCustBtn').onclick = () => openContact('customers', null);
$('#addSupBtn').onclick = () => openContact('suppliers', null);
function openContact(kind, c, onSaved) {
  contactCtx = { kind, c, onSaved };
  const label = kind === 'customers' ? '客户' : '供应商';
  const f = $('#contactForm');
  f.reset();
  $('#contactTitle').textContent = (c ? '编辑' : '新增') + label;
  $('#termsField').classList.toggle('hidden', kind !== 'customers');
  f.terms.placeholder = `留空使用默认 ${S().paymentTermsDays} 天`;
  $('#delContactBtn').classList.toggle('hidden', !c);
  if (c) ['name', 'contact', 'abn', 'phone', 'email', 'address', 'note', 'terms'].forEach((k) => (f[k].value = c[k] ?? ''));
  $('#contactDlg').showModal();
}
$('#contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { kind, c, onSaved } = contactCtx;
  const body = Object.fromEntries(new FormData(e.target));
  if (kind !== 'customers') delete body.terms;
  try {
    const saved = await api(`/api/${kind}` + (c ? '/' + c.id : ''), { method: c ? 'PUT' : 'POST', body });
    $('#contactDlg').close();
    toast('已保存');
    await reload();
    onSaved?.(saved);
  } catch (err) { toast(err.message); }
});
$('#delContactBtn').onclick = async () => {
  const { kind, c } = contactCtx;
  if (!askConfirm(`确定删除「${c.name}」？`)) return;
  try { await api(`/api/${kind}/${c.id}`, { method: 'DELETE' }); $('#contactDlg').close(); toast('已删除'); await reload(); }
  catch (err) { toast(err.message); }
};

function fillSelect(sel, list, emptyLabel, value) {
  sel.innerHTML = `<option value="">${emptyLabel}</option>` + list.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  sel.value = value ? String(value) : '';
}

function renderCustomers() {
  const ag = aging(D.invoices);
  $('#agingStats').innerHTML = [
    ['应收款合计', ag.total, ''], ['未到期', ag.current, ''], ['逾期 1-30 天', ag.d30, 'neg'],
    ['逾期 31-60 天', ag.d60, 'neg'], ['逾期 61-90 天', ag.d90, 'neg'], ['逾期 90 天以上', ag.over, 'neg'],
  ].map(([l, v, c]) => `<div class="panel stat"><div class="label">${l}</div><div class="value ${v > 0 ? c : ''}">${money(v)}</div></div>`).join('');

  const q = $('#cq').value.trim().toLowerCase();
  const owingOnly = $('#cOwing').checked;
  const t = today();
  const rows = D.customers.map((c) => {
    const invs = D.invoices.filter((v) => v.customer.id === c.id);
    const open = invs.filter(isOpen);
    return { c, count: invs.filter((v) => v.status !== 'void').length, owing: sum(open, (v) => v.balance), overdue: sum(open.filter((v) => v.dueDate < t), (v) => v.balance) };
  }).filter((r) => (!owingOnly || r.owing > 0) && (!q || [r.c.name, r.c.contact, r.c.phone, r.c.email, r.c.abn].some((f) => String(f || '').toLowerCase().includes(q))))
    .sort((a, b) => b.owing - a.owing || a.c.name.localeCompare(b.c.name, 'zh-CN'));
  const walkIn = D.invoices.filter((v) => !v.customer.id && isOpen(v));
  $('#custBody').innerHTML = (rows.length ? rows.map(({ c, count, owing, overdue }) => `
    <tr>
      <td><a href="#" data-act="stmt" data-id="${c.id}">${esc(c.name)}</a>${c.abn ? `<div class="muted small">ABN ${esc(c.abn)}</div>` : ''}</td>
      <td class="hide-sm">${esc(c.contact) || '<span class="muted">—</span>'}</td>
      <td class="hide-sm">${esc(c.phone) || '<span class="muted">—</span>'}</td>
      <td class="hide-sm">${c.terms ?? S().paymentTermsDays} 天</td>
      <td class="num hide-sm"><a href="#" data-act="cust-invs" data-id="${c.id}">${count}</a></td>
      <td class="num">${owing ? money(owing) : '<span class="muted">—</span>'}</td>
      <td class="num ${overdue ? 'neg' : ''}">${overdue ? money(overdue) : '<span class="muted">—</span>'}</td>
      <td class="actions">
        <button class="btn sm" data-act="stmt" data-id="${c.id}">对账单</button>
        <button class="btn sm in" data-act="new-inv" data-id="${c.id}">开发票</button>
        <button class="btn sm" data-act="edit-cust" data-id="${c.id}">编辑</button>
      </td>
    </tr>`).join('') : `<tr><td colspan="8" class="empty">${D.customers.length ? '没有匹配的客户' : '还没有客户，点击「新增客户」添加'}</td></tr>`) +
    (walkIn.length && !q ? `<tr><td class="muted">散客（未指定客户）</td><td class="hide-sm"></td><td class="hide-sm"></td><td class="hide-sm"></td><td class="num hide-sm">${walkIn.length}</td>
      <td class="num">${money(sum(walkIn, (v) => v.balance))}</td><td class="num">${money(sum(walkIn.filter((v) => v.dueDate < t), (v) => v.balance))}</td><td></td></tr>` : '');
}
['#cq', '#cOwing'].forEach((s) => $(s).addEventListener('input', renderCustomers));

function renderSuppliers() {
  const q = $('#sq').value.trim().toLowerCase();
  const rows = D.suppliers.filter((c) => !q || [c.name, c.contact, c.phone, c.email, c.abn].some((f) => String(f || '').toLowerCase().includes(q)))
    .map((c) => { const pos = D.purchases.filter((p) => p.supplier?.id === c.id && p.status !== 'void'); return { c, count: pos.length, total: sum(pos, (p) => p.subtotal) }; })
    .sort((a, b) => b.total - a.total || a.c.name.localeCompare(b.c.name, 'zh-CN'));
  $('#supBody').innerHTML = rows.length ? rows.map(({ c, count, total }) => `
    <tr>
      <td>${esc(c.name)}${c.abn ? `<div class="muted small">ABN ${esc(c.abn)}</div>` : ''}</td>
      <td class="hide-sm">${esc(c.contact) || '<span class="muted">—</span>'}</td>
      <td class="hide-sm">${esc(c.phone) || '<span class="muted">—</span>'}</td>
      <td class="hide-sm">${esc(c.email) || '<span class="muted">—</span>'}</td>
      <td class="num"><a href="#" data-act="sup-pos" data-id="${c.id}">${count}</a></td>
      <td class="num">${money(total)}</td>
      <td class="actions">
        <button class="btn sm in" data-act="new-po" data-id="${c.id}">采购入库</button>
        <button class="btn sm" data-act="edit-sup" data-id="${c.id}">编辑</button>
      </td>
    </tr>`).join('') : `<tr><td colspan="7" class="empty">${D.suppliers.length ? '没有匹配的供应商' : '还没有供应商，点击「新增供应商」添加'}</td></tr>`;
}
$('#sq').addEventListener('input', renderSuppliers);

// ---------- 商品下拉 ----------
function itemOptions() {
  return D.items.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    .map((i) => `<option value="${i.id}">${esc(i.name)}${i.sku ? ' · ' + esc(i.sku) : ''}（库存 ${i.qty}${esc(i.unit)}）</option>`).join('');
}

// ---------- 销售发票：列表 ----------
function renderInvoices() {
  const q = $('#iq').value.trim().toLowerCase();
  const st = $('#iStatus').value;
  const mon = $('#iMonth').value;
  const list = D.invoices.slice().reverse().filter((v) => {
    const s = invStatus(v);
    if (st === 'open' ? !isOpen(v) : st && s !== st) return false;
    if (mon && !v.date.startsWith(mon)) return false;
    return !q || [v.no, v.reference, v.customer.name, v.customer.phone, v.note, ...v.lines.map((l) => l.name + ' ' + l.sku)].some((f) => String(f || '').toLowerCase().includes(q));
  });
  $('#invBody').innerHTML = list.length ? list.map((v) => {
    const s = invStatus(v);
    return `<tr class="${s === 'void' ? 'voided' : ''}">
      <td><a href="#" data-act="inv" data-id="${v.id}">${esc(v.no)}</a></td>
      <td>${fmtDate(v.date)}</td>
      <td>${esc(v.customer.name) || '<span class="muted">散客</span>'}</td>
      <td class="hide-sm">${fmtDate(v.dueDate)}</td>
      <td class="num">${money(v.total)}</td>
      <td class="num">${isOpen(v) ? money(v.balance) : '<span class="muted">—</span>'}</td>
      <td class="num hide-sm ${s === 'void' ? '' : v.profit < 0 ? 'neg' : 'pos'}">${money(v.profit)}</td>
      <td><span class="tag ${s}">${INV_LABEL[s]}</span></td>
      <td class="actions"><button class="btn sm" data-act="inv" data-id="${v.id}">${isOpen(v) ? '查看/收款' : '查看'}</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan="9" class="empty">${D.invoices.length ? '没有匹配的发票' : '还没有发票，点击「新建发票」开始销售'}</td></tr>`;
  const valid = list.filter((v) => v.status !== 'void');
  $('#invFoot').innerHTML = valid.length ? `<td colspan="4" class="muted">有效发票 ${valid.length} 张合计</td>
    <td class="num"><strong>${money(sum(valid, (v) => v.total))}</strong></td>
    <td class="num"><strong>${money(sum(valid, (v) => v.balance))}</strong></td>
    <td class="num hide-sm"><strong>${money(sum(valid, (v) => v.profit))}</strong></td><td colspan="2"></td>` : '';
}
['#iq', '#iStatus', '#iMonth'].forEach((s) => $(s).addEventListener('input', renderInvoices));

// ---------- 销售发票：新建 ----------
let invLines = [];
$('#newInvBtn').onclick = () => openInvoiceEditor();
function newInvLine(itemId) {
  const it = itemById(itemId);
  return { itemId: it ? it.id : '', qty: 1, unitPrice: it ? it.salePrice || 0 : 0, discountPct: 0, taxable: it ? !it.gstFree : true };
}
function openInvoiceEditor({ customerId = '', itemId = '' } = {}) {
  if (!D.items.length) return toast('请先添加物品');
  const f = $('#invForm');
  f.reset();
  fillSelect($('#invCustomer'), D.customers, '（散客 / 不指定客户）', customerId);
  f.date.value = today();
  f.pricesIncGst.value = String(!!S().pricesIncGst);
  updateInvCustomer();
  invLines = [newInvLine(itemId)];
  $$('#invDlg .gst-col').forEach((el) => el.classList.toggle('hidden', !S().gstRegistered));
  f.pricesIncGst.closest('label').classList.toggle('hidden', !S().gstRegistered);
  renderInvLines();
  $('#invDlg').showModal();
}
function updateInvCustomer() {
  const f = $('#invForm');
  const c = custById(f.customerId.value);
  f.dueDate.value = addDays(f.date.value || today(), c?.terms ?? S().paymentTermsDays);
  const owing = c ? sum(D.invoices.filter((v) => v.customer.id === c.id && isOpen(v)), (v) => v.balance) : 0;
  $('#invCustInfo').innerHTML = c ? `<div class="small" style="padding-top:22px">${c.abn ? 'ABN ' + esc(c.abn) + ' · ' : ''}账期 ${c.terms ?? S().paymentTermsDays} 天${owing ? ` · <span class="neg">当前欠款 ${money(owing)}</span>` : ''}</div>` : '';
}
$('#invCustomer').addEventListener('change', updateInvCustomer);
$('#invForm').date.addEventListener('change', updateInvCustomer);
$('#invNewCust').onclick = () => openContact('customers', null, (c) => { $('#invCustomer').value = c.id; updateInvCustomer(); });
$('#invAddLine').onclick = () => { invLines.push(newInvLine()); renderInvLines(); $('#invLines tr:last-child select').focus(); };

function renderInvLines() {
  const opts = itemOptions();
  const gstOn = S().gstRegistered;
  $('#invLines').innerHTML = invLines.map((l, n) => `
    <tr data-line="${n}">
      <td style="min-width:220px"><select data-f="itemId" required><option value="">选择商品…</option>${opts}</select><div class="stock-warn" data-warn></div></td>
      <td class="num"><input class="w-qty" data-f="qty" type="number" min="1" step="1" value="${esc(l.qty)}" required></td>
      <td class="num"><input class="w-price" data-f="unitPrice" type="number" min="0" step="0.01" value="${esc(l.unitPrice)}" required></td>
      <td class="num"><input class="w-disc" data-f="discountPct" type="number" min="0" max="100" step="0.01" value="${esc(l.discountPct)}"></td>
      <td class="gst-col ${gstOn ? '' : 'hidden'}" style="text-align:center;padding-top:12px"><input type="checkbox" data-f="taxable" ${l.taxable ? 'checked' : ''} title="是否收取 GST"></td>
      <td class="num hide-sm muted amt" data-cost></td>
      <td class="num amt" data-amt></td>
      <td><button type="button" class="btn sm danger" data-rmline="${n}" ${invLines.length < 2 ? 'disabled' : ''}>×</button></td>
    </tr>`).join('');
  $$('#invLines tr').forEach((tr, n) => { tr.querySelector('select').value = invLines[n].itemId; });
  calcInvoice();
}
$('#invLines').addEventListener('input', (e) => {
  const tr = e.target.closest('tr[data-line]');
  if (!tr) return;
  const l = invLines[Number(tr.dataset.line)];
  const f = e.target.dataset.f;
  l[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (f === 'itemId') { // 选择商品时带出默认售价和 GST 设置
    const nl = newInvLine(l.itemId);
    Object.assign(l, { unitPrice: nl.unitPrice, taxable: nl.taxable });
    tr.querySelector('[data-f=unitPrice]').value = l.unitPrice;
    tr.querySelector('[data-f=taxable]').checked = l.taxable;
  }
  calcInvoice();
});
$('#invLines').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rmline]');
  if (b) { invLines.splice(Number(b.dataset.rmline), 1); renderInvLines(); }
});
$('#invForm').pricesIncGst.addEventListener('change', calcInvoice);

// 与服务端相同的计算方式
function lineCalc(l, incGst, rate) {
  const gross = r2((Number(l.qty) || 0) * (Number(l.unitPrice) || 0) * (1 - (Number(l.discountPct) || 0) / 100));
  const gst = !(rate > 0 && l.taxable) ? 0 : incGst ? r2(gross - gross / (1 + rate)) : r2(gross * rate);
  return { gross, gst, ex: incGst ? r2(gross - gst) : gross };
}

function calcInvoice() {
  const incGst = $('#invForm').pricesIncGst.value === 'true';
  const rate = taxRate();
  const need = {};
  invLines.forEach((l) => { if (l.itemId) need[l.itemId] = (need[l.itemId] || 0) + (Number(l.qty) || 0); });
  let ex = 0, gst = 0, cost = 0;
  $$('#invLines tr').forEach((tr, n) => {
    const l = invLines[n];
    const it = itemById(l.itemId);
    const c = lineCalc(l, incGst, rate);
    ex += c.ex; gst += c.gst;
    if (it) cost += r2((Number(l.qty) || 0) * it.price);
    tr.querySelector('[data-amt]').textContent = money(c.gross);
    tr.querySelector('[data-cost]').textContent = it ? money(it.price) : '';
    tr.querySelector('[data-warn]').textContent = it && need[l.itemId] > it.qty ? `库存不足（当前 ${it.qty}${it.unit}）` : '';
  });
  ex = r2(ex); gst = r2(gst); cost = r2(cost);
  const total = r2(ex + gst);
  const tn = S().taxName || 'GST';
  $('#invSum').innerHTML = !S().gstRegistered
    ? `<div class="total">总计</div><div class="total">${money(total)}</div>`
    : incGst
      ? `<div class="total">总计（含 ${tn}）</div><div class="total">${money(total)}</div><div class="muted">其中 ${tn}</div><div class="muted">${money(gst)}</div>`
      : `<div>小计（不含 ${tn}）</div><div>${money(ex)}</div><div>${tn}</div><div>${money(gst)}</div><div class="total">总计</div><div class="total">${money(total)}</div>`;
  const profit = r2(ex - cost);
  $('#invInternal').innerHTML = `<span>成本 <strong>${money(cost)}</strong></span>
    <span>毛利 <strong class="${profit < 0 ? 'neg' : 'pos'}">${money(profit)}</strong></span>
    <span>毛利率 <strong>${ex ? (profit / ex * 100).toFixed(1) + '%' : '—'}</strong></span>
    <span class="muted">（仅内部可见，不会打印）</span>`;
}

$('#invForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = e.submitter || f.querySelector('button.primary');
  btn.disabled = true;
  try {
    const inv = await api('/api/invoices', { method: 'POST', body: {
      customerId: Number(f.customerId.value) || null, date: f.date.value, dueDate: f.dueDate.value,
      reference: f.reference.value, pricesIncGst: f.pricesIncGst.value === 'true', note: f.note.value,
      lines: invLines.map((l) => ({ itemId: Number(l.itemId), qty: l.qty, unitPrice: l.unitPrice, discountPct: l.discountPct, taxable: l.taxable })),
    } });
    $('#invDlg').close();
    toast(`已开具 ${inv.no}，库存已扣减`);
    await reload();
    openInvoiceView(inv.id);
  } catch (err) { toast(err.message); }
  finally { btn.disabled = false; }
});

// ---------- 采购入库：列表 ----------
function renderPurchases() {
  const q = $('#pq').value.trim().toLowerCase();
  const st = $('#pStatus').value;
  const mon = $('#pMonth').value;
  const list = D.purchases.slice().reverse().filter((p) => (!st || p.status === st) && (!mon || p.date.startsWith(mon)) &&
    (!q || [p.no, p.supplierRef, p.supplier?.name, p.note, ...p.lines.map((l) => l.name + ' ' + l.sku)].some((f) => String(f || '').toLowerCase().includes(q))));
  $('#poBody').innerHTML = list.length ? list.map((p) => `
    <tr class="${p.status === 'void' ? 'voided' : ''}">
      <td><a href="#" data-act="po" data-id="${p.id}">${esc(p.no)}</a></td>
      <td>${fmtDate(p.date)}</td>
      <td>${esc(p.supplier?.name) || '<span class="muted">—</span>'}</td>
      <td class="hide-sm">${esc(p.supplierRef) || '<span class="muted">—</span>'}</td>
      <td class="num hide-sm">${p.lines.length}</td>
      <td class="num hide-sm">${money(p.subtotal)}</td>
      <td class="num">${money(p.total)}</td>
      <td><span class="tag ${p.status}">${p.status === 'void' ? '已作废' : '已入库'}</span></td>
      <td class="actions"><button class="btn sm" data-act="po" data-id="${p.id}">查看</button></td>
    </tr>`).join('') : `<tr><td colspan="9" class="empty">${D.purchases.length ? '没有匹配的采购单' : '还没有采购单，点击「采购入库」记录进货'}</td></tr>`;
  const valid = list.filter((p) => p.status !== 'void');
  $('#poFoot').innerHTML = valid.length ? `<td colspan="5" class="muted">有效采购单 ${valid.length} 张合计</td>
    <td class="num hide-sm"><strong>${money(sum(valid, (p) => p.subtotal))}</strong></td>
    <td class="num"><strong>${money(sum(valid, (p) => p.total))}</strong></td><td colspan="2"></td>` : '';
}
['#pq', '#pStatus', '#pMonth'].forEach((s) => $(s).addEventListener('input', renderPurchases));

// ---------- 采购入库：新建 ----------
let poLines = [];
$('#newPoBtn').onclick = () => openPoEditor();
const newPoLine = (itemId) => { const it = itemById(itemId); return { itemId: it ? it.id : '', qty: 1, unitCost: it ? it.price : 0 }; };
function openPoEditor({ supplierId = '', itemId = '' } = {}) {
  const f = $('#poForm');
  f.reset();
  fillSelect($('#poSupplier'), D.suppliers, '（不指定供应商）', supplierId);
  f.date.value = today();
  f.withGst.checked = !!S().gstRegistered;
  f.withGst.parentElement.lastChild.textContent = ` 供应商收取 ${S().taxName || 'GST'}（${S().taxRate}%）`;
  poLines = [newPoLine(itemId)];
  renderPoLines();
  $('#poDlg').showModal();
}
$('#poNewSup').onclick = () => openContact('suppliers', null, (c) => { $('#poSupplier').value = c.id; });
$('#poAddLine').onclick = () => { poLines.push(newPoLine()); renderPoLines(); $('#poLines tr:last-child select').focus(); };
$('#poNewItem').onclick = () => openItem(null, {
  noInitQty: true,
  onSaved: (it) => {
    const empty = poLines.find((l) => !l.itemId);
    if (empty) Object.assign(empty, newPoLine(it.id)); else poLines.push(newPoLine(it.id));
    renderPoLines();
  },
});
function renderPoLines() {
  const opts = itemOptions();
  $('#poLines').innerHTML = poLines.map((l, n) => `
    <tr data-line="${n}">
      <td style="min-width:220px"><select data-f="itemId" required><option value="">选择商品…</option>${opts}</select></td>
      <td class="num"><input class="w-qty" data-f="qty" type="number" min="1" step="1" value="${esc(l.qty)}" required></td>
      <td class="num"><input class="w-price" data-f="unitCost" type="number" min="0" step="0.0001" value="${esc(l.unitCost)}" required></td>
      <td class="num hide-sm muted amt" data-cost></td>
      <td class="num amt" data-amt></td>
      <td><button type="button" class="btn sm danger" data-rmline="${n}" ${poLines.length < 2 ? 'disabled' : ''}>×</button></td>
    </tr>`).join('');
  $$('#poLines tr').forEach((tr, n) => { tr.querySelector('select').value = poLines[n].itemId; });
  calcPo();
}
$('#poLines').addEventListener('input', (e) => {
  const tr = e.target.closest('tr[data-line]');
  if (!tr) return;
  const l = poLines[Number(tr.dataset.line)];
  l[e.target.dataset.f] = e.target.value;
  if (e.target.dataset.f === 'itemId') { l.unitCost = newPoLine(l.itemId).unitCost; tr.querySelector('[data-f=unitCost]').value = l.unitCost; }
  calcPo();
});
$('#poLines').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rmline]');
  if (b) { poLines.splice(Number(b.dataset.rmline), 1); renderPoLines(); }
});
$('#poForm').withGst.addEventListener('change', calcPo);
function calcPo() {
  let subtotal = 0;
  $$('#poLines tr').forEach((tr, n) => {
    const l = poLines[n];
    const it = itemById(l.itemId);
    const amt = r2((Number(l.qty) || 0) * (Number(l.unitCost) || 0));
    subtotal += amt;
    tr.querySelector('[data-amt]').textContent = money(amt);
    tr.querySelector('[data-cost]').textContent = it ? money(it.price) : '';
  });
  subtotal = r2(subtotal);
  const gst = $('#poForm').withGst.checked ? r2(subtotal * S().taxRate / 100) : 0;
  const tn = S().taxName || 'GST';
  $('#poSum').innerHTML = `<div>小计（不含 ${tn}）</div><div>${money(subtotal)}</div><div>${tn}</div><div>${money(gst)}</div>
    <div class="total">总计</div><div class="total">${money(subtotal + gst)}</div>`;
}
$('#poForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = e.submitter || f.querySelector('button.primary');
  btn.disabled = true;
  try {
    const po = await api('/api/purchases', { method: 'POST', body: {
      supplierId: Number(f.supplierId.value) || null, date: f.date.value, supplierRef: f.supplierRef.value,
      costMethod: f.costMethod.value, withGst: f.withGst.checked, note: f.note.value,
      lines: poLines.map((l) => ({ itemId: Number(l.itemId), qty: l.qty, unitCost: l.unitCost })),
    } });
    $('#poDlg').close();
    toast(`${po.no} 已入库`);
    await reload();
    openPurchaseView(po.id);
  } catch (err) { toast(err.message); }
  finally { btn.disabled = false; }
});

// ---------- 单据模板（澳洲常用格式） ----------
function docHeader(title) {
  const s = S();
  const contact = [s.companyPhone && 'Ph: ' + esc(s.companyPhone), s.companyEmail && esc(s.companyEmail), s.website && esc(s.website)].filter(Boolean).join(' · ');
  return `<div class="d-head">
    <div>
      ${s.logo ? `<img class="d-logo" src="${imgUrl(s.logo)}" alt="">` : ''}
      <div class="d-company">${esc(s.companyName) || '<span style="color:#dc2626">（请在「设置」填写公司名称）</span>'}</div>
      ${s.abn ? `<div><strong>ABN ${esc(s.abn)}</strong></div>` : ''}
      ${s.companyAddress ? `<div class="pre d-sub">${esc(s.companyAddress)}</div>` : ''}
      ${contact ? `<div class="d-sub">${contact}</div>` : ''}
    </div>
    <div class="d-title">${title}</div>
  </div>`;
}
function partyBlock(label, p) {
  if (!p || !p.name) return `<div><div class="d-lbl">${label}</div><strong>Cash Sale</strong></div>`;
  return `<div><div class="d-lbl">${label}</div>
    <strong>${esc(p.name)}</strong>
    ${p.contact ? `<div>Attn: ${esc(p.contact)}</div>` : ''}
    ${p.address ? `<div class="pre">${esc(p.address)}</div>` : ''}
    ${p.abn ? `<div>ABN ${esc(p.abn)}</div>` : ''}
    ${p.email ? `<div>${esc(p.email)}</div>` : ''}
    ${p.phone ? `<div>${esc(p.phone)}</div>` : ''}
  </div>`;
}
function howToPay(ref, amountDue, dueDate) {
  const s = S();
  const rows = [['Bank', s.bankName], ['Account Name', s.accountName], ['BSB', s.bsb], ['Account No', s.accountNumber], ['PayID', s.payId]].filter((r) => r[1]);
  return `<div class="d-pay">
    <div>
      <div class="d-lbl" style="margin-bottom:4px">How to Pay</div>
      ${rows.length ? `<div class="d-meta">${rows.map(([k, v]) => `<div>${k}</div><div>${esc(v)}</div>`).join('')}<div>Reference</div><div>${esc(ref)}</div></div>`
        : '<div style="color:#6b7280">（请在「设置」填写收款银行信息）</div>'}
    </div>
    ${amountDue !== undefined ? `<div style="text-align:right"><div class="d-lbl">Amount Due</div><div style="font-size:22px;font-weight:800">${money(amountDue)}</div>${dueDate ? `<div>Due ${fmtDate(dueDate)}</div>` : ''}</div>` : ''}
  </div>`;
}

function invoiceDoc(v) {
  const s = S();
  const tn = v.taxName || s.taxName || 'GST';
  const showGst = v.gstRegistered !== false && v.taxRate > 0;
  const anyDisc = v.lines.some((l) => l.discountPct > 0);
  const anyFree = showGst && v.lines.some((l) => !l.taxable);
  const code = s.currencyCode ? ' ' + esc(s.currencyCode) : '';
  const st = invStatus(v);
  const totals = [];
  if (v.discount) totals.push(['Discount', '-' + money(v.discount)]); // 旧版发票的整单折扣
  if (showGst && !v.pricesIncGst) {
    totals.push([`Subtotal (ex ${tn})`, money(v.subtotalEx)], [`Total ${tn} ${v.taxRate}%`, money(v.gst)], [`<b>Total${code}</b>`, `<b>${money(v.total)}</b>`, 'strong']);
  } else {
    totals.push([`<b>Total${code}${showGst ? ` (inc ${tn})` : ''}</b>`, `<b>${money(v.total)}</b>`, 'strong']);
    if (showGst) totals.push([`Includes ${tn} of`, money(v.gst)]);
  }
  if (v.amountPaid > 0) totals.push(['Less Amount Paid', '-' + money(v.amountPaid)]);
  totals.push([`AMOUNT DUE${code}`, money(v.status === 'void' ? 0 : v.balance), 'due']);

  return `<div class="doc">
    ${st === 'paid' ? '<div class="stamp paid">PAID</div>' : st === 'void' ? '<div class="stamp void">VOID</div>' : ''}
    ${docHeader(showGst ? 'TAX INVOICE' : 'INVOICE')}
    <div class="d-parties">
      ${partyBlock('Bill To', v.customer)}
      <div class="d-meta">
        <div>Invoice Number</div><div>${esc(v.no)}</div>
        <div>Invoice Date</div><div>${fmtDate(v.date)}</div>
        <div>Due Date</div><div>${fmtDate(v.dueDate)}</div>
        ${v.reference ? `<div>Reference</div><div>${esc(v.reference)}</div>` : ''}
      </div>
    </div>
    <table>
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th>${anyDisc ? '<th class="num">Disc %</th>' : ''}${showGst ? `<th class="num">${tn}</th>` : ''}<th class="num">Amount${code}</th></tr></thead>
      <tbody>${v.lines.map((l) => `<tr>
        <td>${esc(l.name)}${anyFree && !l.taxable ? ' *' : ''}${l.sku ? `<div style="color:#6b7280;font-size:11px">${esc(l.sku)}</div>` : ''}${l.description ? `<div style="color:#4b5563">${esc(l.description)}</div>` : ''}</td>
        <td class="num">${l.qty}${l.unit && !/^(件|个)$/.test(l.unit) ? ' ' + esc(l.unit) : ''}</td>
        <td class="num">${money(l.unitPrice)}</td>
        ${anyDisc ? `<td class="num">${l.discountPct ? l.discountPct + '%' : ''}</td>` : ''}
        ${showGst ? `<td class="num">${l.gst === undefined ? '' : l.taxable ? money(l.gst) : 'GST-free'}</td>` : ''}
        <td class="num">${money(l.gross)}</td></tr>`).join('')}</tbody>
    </table>
    ${anyFree ? '<div style="color:#6b7280;font-size:11px;margin-top:4px">* GST-free item</div>' : ''}
    ${showGst && v.pricesIncGst ? `<div style="color:#6b7280;font-size:11px;margin-top:4px">All amounts are ${tn} inclusive.</div>` : ''}
    <div class="d-totals">${totals.map(([k, val, c]) => `<div class="${c || ''}">${k}</div><div class="${c || ''}">${val}</div>`).join('')}</div>
    ${v.note ? `<div class="d-note">${esc(v.note)}</div>` : ''}
    ${v.status !== 'void' && v.balance > 0.004 ? howToPay(v.no, v.balance, v.dueDate) : ''}
    ${v.payments?.length ? `<div style="margin-top:16px;color:#4b5563;font-size:12px">Payments received: ${v.payments.map((p) => `${fmtDate(p.date)} ${esc(p.method)} ${money(p.amount)}`).join('; ')}</div>` : ''}
    ${s.invoiceFooter ? `<div class="d-foot">${esc(s.invoiceFooter)}</div>` : ''}
  </div>`;
}

function purchaseDoc(p) {
  const s = S();
  const tn = p.taxName || s.taxName || 'GST';
  const code = s.currencyCode ? ' ' + esc(s.currencyCode) : '';
  return `<div class="doc">
    ${p.status === 'void' ? '<div class="stamp void">VOID</div>' : ''}
    ${docHeader('PURCHASE RECEIPT')}
    <div class="d-parties">
      ${p.supplier ? partyBlock('Supplier', p.supplier) : '<div><div class="d-lbl">Supplier</div>—</div>'}
      <div class="d-meta">
        <div>PO Number</div><div>${esc(p.no)}</div>
        <div>Date Received</div><div>${fmtDate(p.date)}</div>
        ${p.supplierRef ? `<div>Supplier Invoice</div><div>${esc(p.supplierRef)}</div>` : ''}
      </div>
    </div>
    <table>
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit Cost (ex ${tn})</th><th class="num">Amount${code}</th></tr></thead>
      <tbody>${p.lines.map((l) => `<tr><td>${esc(l.name)}${l.sku ? `<div style="color:#6b7280;font-size:11px">${esc(l.sku)}</div>` : ''}</td>
        <td class="num">${l.qty}${l.unit && !/^(件|个)$/.test(l.unit) ? ' ' + esc(l.unit) : ''}</td><td class="num">${money(l.unitCost)}</td><td class="num">${money(l.amount)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="d-totals">
      <div>Subtotal (ex ${tn})</div><div>${money(p.subtotal)}</div>
      <div>${tn}${p.taxRate ? ' ' + p.taxRate + '%' : ''}</div><div>${money(p.gst)}</div>
      <div class="strong">Total${code}</div><div class="strong">${money(p.total)}</div>
    </div>
    ${p.note ? `<div class="d-note">${esc(p.note)}</div>` : ''}
  </div>`;
}

function statementDoc(c) {
  const invs = D.invoices.filter((v) => v.customer.id === c.id && isOpen(v)).sort((a, b) => a.date.localeCompare(b.date));
  const ag = aging(invs);
  const code = S().currencyCode ? ' ' + esc(S().currencyCode) : '';
  return `<div class="doc">
    ${docHeader('STATEMENT')}
    <div class="d-parties">
      ${partyBlock('To', c)}
      <div class="d-meta">
        <div>Statement Date</div><div>${fmtDate(today())}</div>
        <div>Amount Due</div><div>${money(ag.total)}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Invoice #</th><th>Reference</th><th>Due Date</th><th class="num">Amount</th><th class="num">Paid</th><th class="num">Balance${code}</th></tr></thead>
      <tbody>${invs.length ? invs.map((v) => `<tr><td>${fmtDate(v.date)}</td><td>${esc(v.no)}</td><td>${esc(v.reference)}</td>
        <td>${fmtDate(v.dueDate)}${v.dueDate < today() ? ' <b style="color:#dc2626">OVERDUE</b>' : ''}</td>
        <td class="num">${money(v.total)}</td><td class="num">${money(v.amountPaid)}</td><td class="num">${money(v.balance)}</td></tr>`).join('')
        : '<tr><td colspan="7" style="text-align:center;color:#6b7280">No outstanding invoices.</td></tr>'}</tbody>
    </table>
    <table class="d-aging">
      <thead><tr><th>Current</th><th>1-30 Days</th><th>31-60 Days</th><th>61-90 Days</th><th>90+ Days</th><th>Total Due</th></tr></thead>
      <tbody><tr><td>${money(ag.current)}</td><td>${money(ag.d30)}</td><td>${money(ag.d60)}</td><td>${money(ag.d90)}</td><td>${money(ag.over)}</td><td><b>${money(ag.total)}</b></td></tr></tbody>
    </table>
    ${ag.total > 0 ? howToPay(c.name, ag.total) : ''}
    ${S().invoiceFooter ? `<div class="d-foot">${esc(S().invoiceFooter)}</div>` : ''}
  </div>`;
}

// ---------- 单据查看 / 打印 ----------
let printable = null;
function openDoc({ html, title, extra = '', actions = [] }) {
  printable = { html, title };
  $('#docBody').innerHTML = html;
  $('#docExtra').innerHTML = extra;
  $('#docActions').innerHTML = '';
  [...actions, { label: '关闭', onClick: () => $('#docDlg').close() }, { label: '打印 / 保存 PDF', cls: 'primary', onClick: printDoc }].forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (a.cls || '');
    b.textContent = a.label;
    b.onclick = a.onClick;
    $('#docActions').appendChild(b);
  });
  if (!$('#docDlg').open) $('#docDlg').showModal();
}
let printTitle = document.title;
function printDoc() {
  $('#printRoot').innerHTML = printable.html;
  translateNode($('#printRoot'));
  document.body.classList.add('printing');
  printTitle = document.title;
  document.title = printable.title; // 保存 PDF 时的默认文件名
  const imgsInDoc = $$('#printRoot img');
  Promise.all(imgsInDoc.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })))).then(() => window.print());
}
window.addEventListener('afterprint', () => { // iOS Safari 的 print() 不会阻塞，需在打印结束后再恢复
  document.title = printTitle;
  document.body.classList.remove('printing');
});

const PAY_METHODS = ['Bank Transfer', 'Cash', 'Card', 'PayID / Osko', 'Cheque', 'Other'];
function openInvoiceView(id) {
  const v = D.invoices.find((x) => x.id === id);
  if (!v) return;
  const margin = v.subtotalEx ? (v.profit / v.subtotalEx * 100).toFixed(1) + '%' : '—';
  let extra = `<div class="internal">
    <span>成本 <strong>${money(v.costTotal)}</strong></span>
    <span>毛利 <strong class="${v.profit < 0 ? 'neg' : 'pos'}">${money(v.profit)}</strong></span>
    <span>毛利率 <strong>${margin}</strong></span>
    ${v.status === 'void' ? `<span class="muted">作废于 ${fmtTime(v.voidedAt)}${v.voidReason ? '：' + esc(v.voidReason) : ''}</span>` : '<span class="muted">（仅内部可见，不会打印）</span>'}
  </div>`;
  if (v.status !== 'void') {
    extra += `<fieldset style="margin-top:16px"><legend>收款记录（已收 ${money(v.amountPaid)} · 未收 ${money(v.balance)}）</legend>
      ${v.payments.length ? `<div class="table-wrap"><table><tbody>${v.payments.map((p) => `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.method)}</td><td class="wrap">${esc(p.note)}</td>
        <td class="num">${money(p.amount)}</td><td class="actions"><button type="button" class="btn sm danger" data-delpay="${p.id}">删除</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0 0 8px">暂无收款</p>'}
      ${v.balance > 0.004 ? `<form id="payForm" class="fields" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-top:8px;align-items:end">
        <label class="f">收款日期<input name="date" type="date" value="${today()}" required></label>
        <label class="f">金额<input name="amount" type="number" min="0.01" step="0.01" max="${v.balance}" value="${v.balance}" required></label>
        <label class="f">方式<select name="method">${PAY_METHODS.map((m) => `<option>${m}</option>`).join('')}</select></label>
        <label class="f">备注<input name="note" maxlength="200" placeholder="可选"></label>
        <button class="btn primary">登记收款</button>
      </form>` : ''}
    </fieldset>`;
  }
  const actions = [];
  if (v.status !== 'void' && !v.payments.length) actions.push({ label: '作废（退回库存）', cls: 'danger left', onClick: () => voidInvoice(v) });
  openDoc({ html: invoiceDoc(v), title: `${v.no}${v.customer.name ? ' - ' + v.customer.name : ''}`, extra, actions });

  $('#payForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`/api/invoices/${v.id}/payments`, { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      toast('收款已登记'); await reload(); openInvoiceView(v.id);
    } catch (err) { toast(err.message); }
  });
  $$('#docExtra [data-delpay]').forEach((b) => (b.onclick = async () => {
    if (!askConfirm('删除这条收款记录？')) return;
    try { await api(`/api/invoices/${v.id}/payments/${b.dataset.delpay}`, { method: 'DELETE' }); toast('已删除'); await reload(); openInvoiceView(v.id); }
    catch (err) { toast(err.message); }
  }));
}
async function voidInvoice(v) {
  const reason = askPrompt(`作废 ${v.no}？商品数量会退回库存。\n作废原因（可留空）：`);
  if (reason === null) return;
  try { await api(`/api/invoices/${v.id}/void`, { method: 'POST', body: { reason } }); toast('已作废，库存已退回'); await reload(); openInvoiceView(v.id); }
  catch (err) { toast(err.message); }
}

function openPurchaseView(id) {
  const p = D.purchases.find((x) => x.id === id);
  if (!p) return;
  const methods = { average: '加权平均', latest: '使用本次进货价', none: '未更新' };
  const extra = `<div class="internal"><span>成本价更新方式：<strong>${methods[p.costMethod] || '—'}</strong></span>
    ${p.status === 'void' ? `<span class="muted">作废于 ${fmtTime(p.voidedAt)}${p.voidReason ? '：' + esc(p.voidReason) : ''}（成本价不会自动恢复）</span>` : ''}</div>`;
  const actions = p.status === 'void' ? [] : [{ label: '作废（扣回库存）', cls: 'danger left', onClick: async () => {
    const reason = askPrompt(`作废 ${p.no}？将从库存中扣回本单数量。\n作废原因（可留空）：`);
    if (reason === null) return;
    try { await api(`/api/purchases/${p.id}/void`, { method: 'POST', body: { reason } }); toast('已作废'); await reload(); openPurchaseView(p.id); }
    catch (err) { toast(err.message); }
  } }];
  openDoc({ html: purchaseDoc(p), title: `${p.no}${p.supplier ? ' - ' + p.supplier.name : ''}`, extra, actions });
}

function openStatement(id) {
  const c = custById(id);
  const all = D.invoices.filter((v) => v.customer.id === c.id).slice().reverse();
  const extra = `<fieldset style="margin-top:16px"><legend>全部发票（${all.length}）</legend>
    ${all.length ? `<div class="table-wrap" style="max-height:260px"><table><tbody>${all.map((v) => { const s = invStatus(v); return `<tr class="${s === 'void' ? 'voided' : ''}">
      <td><a href="#" data-act="inv" data-id="${v.id}">${esc(v.no)}</a></td><td>${fmtDate(v.date)}</td><td class="num">${money(v.total)}</td>
      <td class="num">${isOpen(v) ? money(v.balance) : ''}</td><td><span class="tag ${s}">${INV_LABEL[s]}</span></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">暂无发票</p>'}
  </fieldset>`;
  openDoc({ html: statementDoc(c), title: `Statement - ${c.name} - ${today()}`, extra, actions: [
    { label: '编辑客户', cls: 'left', onClick: () => openContact('customers', c) },
    { label: '开发票', onClick: () => { $('#docDlg').close(); openInvoiceEditor({ customerId: c.id }); } },
  ] });
}

// ---------- 设置 ----------
function renderSettings() {
  const f = $('#settingsForm');
  if (f.contains(document.activeElement) && document.activeElement !== f.querySelector('button')) return; // 正在编辑时不覆盖
  const s = S();
  ['companyName', 'abn', 'companyPhone', 'companyEmail', 'companyAddress', 'website', 'taxName', 'taxRate', 'currency', 'currencyCode',
    'invoicePrefix', 'poPrefix', 'paymentTermsDays', 'invoiceFooter', 'bankName', 'accountName', 'bsb', 'accountNumber', 'payId']
    .forEach((k) => { f[k].value = s[k] ?? ''; });
  f.gstRegistered.checked = !!s.gstRegistered;
  f.pricesIncGst.value = String(!!s.pricesIncGst);
  $('#logoImg').classList.toggle('hidden', !s.logo);
  $('#logoDel').classList.toggle('hidden', !s.logo);
  if (s.logo) $('#logoImg').src = imgUrl(s.logo);
}
$('#settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = Object.fromEntries(new FormData(f));
  body.gstRegistered = f.gstRegistered.checked;
  body.pricesIncGst = f.pricesIncGst.value === 'true';
  try {
    await api('/api/settings', { method: 'PUT', body });
    document.activeElement?.blur();
    toast('设置已保存');
    await reload();
  } catch (err) { toast(err.message); }
});
$('#logoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    await api('/api/settings/logo', { method: 'POST', body: { data: await compressImage(file, 800, 0.92) } });
    toast('Logo 已更新'); await reload();
  } catch (err) { toast(err.message === 'decode' ? '无法读取该图片' : err.message); }
});
$('#logoDel').onclick = async () => { await api('/api/settings/logo', { method: 'DELETE' }); toast('Logo 已删除'); await reload(); };

$('#restoreFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !askConfirm('恢复备份将覆盖当前所有数据，确定继续？')) return;
  try {
    const r = await api('/api/backup', { method: 'POST', body: JSON.parse(await file.text()) });
    toast(`已恢复：${r.items} 个物品，${r.invoices} 张发票，${r.purchases} 张采购单`); await reload();
  } catch (err) { toast('恢复失败：' + err.message); }
});

start().catch((e) => toast(e.message));
