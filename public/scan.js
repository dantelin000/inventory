'use strict';

// ---------- 识别入货单：照片 / 扫描件 / PDF → 商品行 ----------
// 本地识别全部在浏览器里完成（pdf.js 读 PDF，Tesseract.js 做英文 OCR，首次使用从 CDN 下载后由浏览器缓存），服务器不参与；
// AI 识别把照片（模型支持图片时）或识别出的文字交给「设置」里的 OpenAI 兼容接口。
// 两种方式得到同样格式的结果：{ supplier, ref, rows: [{ code, desc, qty, price, discount, amount }], totals, incGst }
const SCAN_LIBS = {
  tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js',
  pdf: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.min.mjs',
  pdfWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.worker.min.mjs',
};
const SCAN_MAX_PAGES = 10;
const OCR_SIZE = 2400; // 交给 OCR 的图片长边像素
const AI_IMG_SIZE = 2000; // 发给 AI 的图片长边像素
const LIB_ERROR = '识别组件下载失败，请检查网络后重试';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { s.remove(); reject(new Error(LIB_ERROR)); };
    document.head.appendChild(s);
  });
}

let pdfLib = null;
async function loadPdfLib() {
  if (!pdfLib) {
    const lib = await import(SCAN_LIBS.pdf).catch(() => { throw new Error(LIB_ERROR); });
    lib.GlobalWorkerOptions.workerSrc = SCAN_LIBS.pdfWorker;
    pdfLib = lib;
  }
  return pdfLib;
}

// 选中的文件 → 页面：{ canvas, lines }。电子版 PDF 直接读出文字行（textLayer），照片和扫描件 lines 留空等 OCR
async function readScanFiles(files, status) {
  const pages = [];
  for (const file of files) {
    if (pages.length >= SCAN_MAX_PAGES) break;
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      status('正在读取 PDF…');
      const lib = await loadPdfLib();
      const task = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const doc = await task.promise.catch(() => { throw new Error(`无法读取 PDF「${file.name}」，文件可能已损坏或设置了密码`); });
      for (let n = 1; n <= doc.numPages && pages.length < SCAN_MAX_PAGES; n++) {
        const page = await doc.getPage(n);
        const lines = pdfTextLines(await page.getTextContent());
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: OCR_SIZE / Math.max(base.width, base.height) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvas, viewport }).promise;
        const textLayer = lines.join('').replace(/\s/g, '').length >= 50; // 字太少视为扫描件
        pages.push({ canvas, lines: textLayer ? lines : null, textLayer });
      }
      await task.destroy();
    } else if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name)) {
      pages.push({ canvas: await imageCanvas(file), lines: null, textLayer: false });
    }
  }
  return pages;
}

// PDF 文字块按行合并（同一行 y 坐标相近），行内按 x 排序；字与字间距明显时补空格
function pdfTextLines(content) {
  const rows = [];
  content.items.filter((i) => i.str && i.str.trim()).forEach((i) => {
    const it = { s: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: Math.abs(i.transform[3]) || 10 };
    const row = rows.find((r) => Math.abs(r.y - it.y) < Math.max(r.h, it.h) * 0.5);
    if (row) row.items.push(it); else rows.push({ y: it.y, h: it.h, items: [it] });
  });
  return rows.sort((a, b) => b.y - a.y).map((r) => {
    let line = '', end = null;
    r.items.sort((a, b) => a.x - b.x).forEach((it) => {
      if (end !== null) line += it.x - end > it.h * 1.5 ? '    ' : it.x - end > it.h * 0.15 ? ' ' : '';
      line += it.s;
      end = it.x + it.w;
    });
    return line;
  });
}

// 照片 → canvas：大图缩小到 OCR_SIZE，小图放大到至少 1600 像素（太小的字 OCR 认不准）
function imageCanvas(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const long = Math.max(img.naturalWidth, img.naturalHeight);
      const scale = long > OCR_SIZE ? OCR_SIZE / long : long < 1600 ? Math.min(2, 1600 / long) : 1;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`无法读取图片「${file.name}」，请换成 JPG / PNG 格式`)); };
    img.src = url;
  });
}

function scaleCanvas(src, size) {
  const scale = Math.min(1, size / Math.max(src.width, src.height));
  if (scale === 1) return src;
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * scale);
  c.height = Math.round(src.height * scale);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// 去阴影：灰度 ÷ 周围一大片的平均亮度（积分图求均值），再把最暗的 1% 拉到纯黑。
// 手机照片的阴影、一边亮一边暗都能拉平，Tesseract 对这种图认数字准很多。
function flattenLight(src) {
  const w = src.width, h = src.height, W = w + 1;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8;
  const sum = new Uint32Array(W * (h + 1)); // 长边 ≤ 2400 时总和不会超过 Uint32 上限
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += gray[y * w + x]; sum[(y + 1) * W + x + 1] = sum[y * W + x + 1] + row; }
  }
  const r = Math.max(10, Math.round(Math.max(w, h) / 60));
  const out = new Uint8Array(w * h), hist = new Uint32Array(256);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const mean = (sum[y1 * W + x1] - sum[y0 * W + x1] - sum[y1 * W + x0] + sum[y0 * W + x0]) / ((y1 - y0) * (x1 - x0));
      const v = Math.min(255, (gray[y * w + x] * 255) / Math.max(mean, 1)) | 0;
      out[y * w + x] = v;
      hist[v]++;
    }
  }
  let lo = 0;
  for (let acc = hist[0]; lo < 250 && acc < w * h * 0.01; acc += hist[++lo]);
  for (let i = 0; i < w * h; i++) out[i] = Math.max(0, ((out[i] - lo) * 255) / (255 - lo));
  removeLines(out, w, h);
  for (let i = 0; i < w * h; i++) {
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = out[i];
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// 擦掉表格框线：连续很长的深色横线 / 竖线涂白（连同两侧 1 像素的虚边）。
// 带框线的单据里，紧贴竖线的数字和被横线夹住的整行很容易被 OCR 认成乱码；文字笔画都很短，不会被误擦。
function removeLines(px, w, h) {
  const mask = new Uint8Array(w * h);
  const minH = Math.round(w / 20), minV = Math.round(h / 25);
  const dark = (x, y) => x >= 0 && x < w && y >= 0 && y < h && px[y * w + x] < 160;
  // 线条常有轻微倾斜：上下（或左右）相邻 1 像素内有深色就算线没断
  for (let y = 0; y < h; y++) {
    for (let x = 0, run = 0; x <= w; x++) {
      if (x < w && (dark(x, y) || dark(x, y - 1) || dark(x, y + 1))) { run++; continue; }
      if (run >= minH) for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) mask.fill(1, yy * w + x - run, yy * w + x);
      run = 0;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0, run = 0; y <= h; y++) {
      if (y < h && (dark(x, y) || dark(x - 1, y) || dark(x + 1, y))) { run++; continue; }
      if (run >= minV) {
        for (let yy = y - run; yy < y; yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) mask[yy * w + xx] = 1;
      }
      run = 0;
    }
  }
  for (let i = 0; i < w * h; i++) if (mask[i]) px[i] = 255;
}

// 对还没有文字的页面做 OCR（英文）
async function ocrPages(pages, status) {
  const todo = pages.filter((p) => !p.lines);
  if (!todo.length) return;
  status('正在加载识别组件（首次使用需下载约 5 MB）…');
  if (!window.Tesseract) await loadScript(SCAN_LIBS.tesseract);
  let n = 0, fail;
  // 语言包下载失败时 createWorker 不会 reject，只会调用 errorHandler，所以自己接住，避免一直转圈
  const failed = new Promise((_, reject) => { fail = reject; });
  failed.catch(() => {});
  const worker = await Promise.race([failed, Tesseract.createWorker('eng', 1, {
    logger: (m) => { if (m.status === 'recognizing text' && n) status(`正在识别第 ${n}/${todo.length} 页… ${Math.round(m.progress * 100)}%`); },
    errorHandler: () => fail(),
  })]).catch(() => { throw new Error(LIB_ERROR); });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' }); // 6：整块文字，表格同一行不会被拆开
    for (const p of todo) {
      n++;
      status(`正在识别第 ${n}/${todo.length} 页…`);
      const { data } = await worker.recognize(flattenLight(p.canvas));
      p.lines = data.text.split('\n');
    }
  } finally {
    await worker.terminate();
  }
}

// ---------- 从文字中找出商品行 ----------
// 不按供应商写模板：表格里每行找「数量 × 单价（− 折扣%）≈ 金额」成立的几个数字，成立的就是商品行，
// 同时也能发现 OCR 认错的数字（对不上的行标红让人核对）。
const SCAN_UNIT = /^(ea|each|pc|pcs|pce|unit|units|bx|box|ctn|carton|pk|pack|pkt|roll|rl|kg|kgs|ltr|l|m|set|pr|pair|bag|btl|doz|dz|case|cs)\.?$/i;
const SCAN_TOTAL_START = /^[^a-z0-9]*(sub\s*-?\s*total|total|gst|tax|freight|delivery|shipping|postage|handling|balance|amount\s+(due|payable)|rounding)\b/i;

function scanNumber(tok) {
  let t = tok.replace(/^[($£€¥]+|\)+$/g, '').replace(/^S(?=\d+\.\d\d$)/, ''); // OCR 常把 $ 认成 £ 或 S
  if (/\d/.test(t) && /^[\dOolI.,]+$/.test(t)) t = t.replace(/[Oo]/g, '0').replace(/[lI]/g, '1'); // OCR 常把 0/1 认成 O/l
  if (/^\d+,\d{2}$/.test(t)) t = t.replace(',', '.'); // 小数点认成逗号
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(t)) return null;
  return Number(t.replace(/,/g, ''));
}

function scanTokens(line) {
  return line.trim().split(/\s+/).map((t) => t.replace(/^["'`|:;~_]+|["'`|:;~_]+$/g, '')).filter((t) => /[a-z0-9]/i.test(t)).map((t, i) => {
    const pct = /%$/.test(t);
    const v = scanNumber(pct ? t.slice(0, -1) : t);
    // OCR 常把金额前的 $ 认成 5 或 8（$0.75 → 50.75），备用值留给 scanRow 用「数量 × 单价 = 金额」验证
    const alt = !pct && v !== null && /^[58]\d+\.\d\d$/.test(t) ? Number(t.slice(1)) : null;
    return { t, i, pct, v, alt };
  });
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;

// 一行文字 → 商品行；order = 'qp'（数量在单价前）或 'pq'
function scanRow(line, order, hasCode) {
  const toks = scanTokens(line);
  const nums = toks.filter((x) => x.v !== null);
  if (nums.length < 2) return null;
  let best = null;
  const values = (x, fix) => (fix && x.alt !== null ? [x.v, x.alt] : [x.v]);
  // 先按原样找；找不到再允许把 5 / 8 开头的数字当作 $ 认错（fix）
  for (const fix of [false, true]) {
    // 金额一般在最后一列，有时后面还跟一列 GST，所以也试倒数第二、三个数
    for (let a = nums.length - 1; a >= Math.max(1, nums.length - 3); a--) {
      const amt = nums[a];
      if (amt.pct) continue;
      const before = nums.slice(Math.max(0, a - 5), a);
      for (let i = 0; i < before.length; i++) {
        for (let j = i + 1; j < before.length; j++) {
          const [q, p] = order === 'pq' ? [before[j], before[i]] : [before[i], before[j]];
          if (q.pct || p.pct || q.v <= 0) continue;
          const discounts = [0, ...before.slice(j + 1).filter((x) => x.v <= 100).map((x) => x.v)]; // 单价和金额之间的折扣列
          for (const qv of values(q, fix)) for (const pv of values(p, fix)) for (const av of values(amt, fix)) {
            for (const disc of discounts) {
              if (!near(qv * pv * (1 - disc / 100), av, 0.011 + qv * 0.005)) continue;
              const score = (Number.isInteger(qv) ? 4 : 0) + (a === nums.length - 1 ? 2 : 0) + (j === i + 1 ? 1 : 0) + (disc ? 0 : 1);
              if (!best || score > best.score) best = { q, p, amt, disc, score, qv, pv, av };
            }
          }
        }
      }
    }
    if (best) break;
  }
  let r;
  if (best) {
    r = { qty: best.qv, price: best.pv, discount: best.disc, amount: best.av, ok: true };
  } else {
    // 对不上时按列的位置猜：最后一个数是金额，前面依次是单价、数量（标红让人核对）
    const vals = nums.filter((x) => !x.pct);
    if (vals.length < 2) return null;
    const amt = vals[vals.length - 1], p = vals[vals.length - 2], q = vals.length > 2 ? vals[vals.length - 3] : null;
    let [qq, pp] = order === 'pq' && q ? [p, q] : [q, p];
    if (qq && (!Number.isInteger(qq.v) || qq.v > 9999)) [qq, pp] = [null, order === 'pq' && q ? q : p]; // 不像数量（多半是货号）
    best = { q: qq || p, p: pp, amt };
    r = { qty: qq ? qq.v : 1, price: pp.v, discount: 0, amount: amt.v, ok: false };
  }
  // 品名：第一个用到的数字之前的文字，加上「数量 … 单价」之间的文字（数量在前的版式），去掉单位
  const first = Math.min(best.q.i, best.p.i);
  let words = toks.slice(0, first);
  if (best.q.i < best.p.i) words = words.concat(toks.slice(best.q.i + 1, best.p.i).filter((x, k) => !(k === 0 && SCAN_UNIT.test(x.t))));
  words = words.map((x) => x.t);
  while (words.length && /^[^0-9]$/.test(words[0])) words.shift(); // OCR 在页边认出的杂字
  while (words.length && /^[^0-9]$/.test(words[words.length - 1])) words.pop();
  if (words.length > 1 && (hasCode || (/\d/.test(words[0]) && words[0].length >= 3 && !/^\d+(\.\d+)?[a-z]+$/i.test(words[0])) || /^[a-z]+-\w+$/i.test(words[0]))) {
    r.code = words.shift();
  } else r.code = '';
  r.desc = words.join(' ');
  if (!r.desc && !r.code) return null;
  return r;
}

function parseScanText(lines) {
  lines = lines.map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim());
  const isHead = (l) => /\b(qty|qnty|quantity)\b/i.test(l) && /\b(price|rate|amount|total|cost|value)\b/i.test(l) && scanTokens(l).filter((x) => x.v !== null).length < 2;
  const headIdx = lines.findIndex(isHead);
  const head = headIdx >= 0 ? lines[headIdx] : '';
  const pricePos = head.search(/\b(price|rate|cost)\b/i);
  const order = pricePos >= 0 && pricePos < head.search(/\b(qty|qnty|quantity)\b/i) ? 'pq' : 'qp';
  const hasCode = /\b(code|sku|part\s*(no|#)|cat(alogue)?\s*(no|#)|item\s*(no|#|code))\b/i.test(head) ||
    (/\bitem\b(?!\s+desc)/i.test(head) && /\bdesc/i.test(head) && head.search(/\bitem\b/i) < head.search(/\bdesc/i));
  const rows = [];
  const totals = { subtotal: null, gst: null, total: null, extra: 0 };
  let afterTotals = false;
  lines.forEach((line, n) => {
    if (n === headIdx || (headIdx >= 0 && n < headIdx) || isHead(line)) return;
    const row = scanRow(line, order, hasCode);
    if (row && row.ok && !SCAN_TOTAL_START.test(line)) return rows.push(row);
    const amounts = scanTokens(line).filter((x) => x.v !== null && !x.pct);
    const v = amounts.length ? amounts[amounts.length - 1].v : null;
    if (v !== null && /\b(sub\s*-?\s*total|total\s*\(?(ex|excl|excluding|before)\b|net\s+(total|amount))/i.test(line)) totals.subtotal = v;
    else if (v !== null && /\btotal\b/i.test(line) && /\b(inc|incl|including)\.?\s*(of\s+)?gst\b/i.test(line)) totals.total = Math.max(totals.total || 0, v);
    else if (v !== null && /\b(gst|tax)\b/i.test(line)) totals.gst = v;
    else if (v !== null && /\btotal\b|amount\s+(due|payable)|balance\s+due/i.test(line)) totals.total = Math.max(totals.total || 0, v);
    else if (v !== null && /\b(freight|delivery|shipping|postage|handling|rounding)\b/i.test(line)) totals.extra += v;
    else if (row && !afterTotals && headIdx >= 0) return rows.push(row); // 表格内对不上的行也列出来，标红核对
    else return;
    afterTotals = true;
  });

  // 抬头：ABN（排除自己公司的）、发票号、供应商名称（第一行像公司名的文字）
  const text = lines.join('\n');
  const own = String(S().abn || '').replace(/\D/g, '');
  const abn = [...text.matchAll(/\bA\.?B\.?N\.?\s*[:#]?\s*((?:\d\s*){11})/gi)].map((m) => m[1].replace(/\D/g, '')).find((x) => x !== own) || '';
  const refTok = (s) => (s.match(/[A-Z0-9][A-Z0-9\-/]*\d[A-Z0-9\-/]*/gi) || []).filter((x) => x.length >= 4);
  const labelRe = /\b(?:invoice|inv|docket|document)\.?[ \t]*(?:no\b\.?|number|num|#)[ \t]*[:#.]?/i;
  const li = lines.findIndex((l) => labelRe.test(l));
  let ref = '';
  if (li >= 0) {
    const after = lines[li].slice(lines[li].search(labelRe)).replace(labelRe, '');
    const adjacent = [...refTok(lines[li - 1] || ''), ...refTok(lines[li + 1] || '')];
    const same = refTok(after)[0];
    ref = (same && adjacent.find((x) => x.length > same.length && x.endsWith(same))) || same || refTok(lines[li - 1] || '').pop() || refTok(lines[li + 1] || '')[0] || '';
  }
  if (!ref) ref = (text.match(/\b(?:invoice|inv|docket|document)\.?[ \t]*(?:no\.?|number|num|#)?[ \t]*[:#.]?[ \t]*([A-Z0-9][A-Z0-9\-/]*\d[A-Z0-9\-/]*)/i) || [])[1] || '';
  // 供应商名称：优先找带公司后缀（Pty Ltd 等）的行，否则取开头第一行像名称的文字（至少两个 3 个字母以上的词）
  const nameOf = (l) => l.replace(/\b(tax\s+)?invoice\b.*$|\bA\.?B\.?N\b.*$/i, '').split(/\s+/).filter((w) => w === '&' || (w.length > 1 && /[a-z]/i.test(w))).join(' ');
  const top = lines.slice(0, headIdx > 0 ? Math.min(headIdx, 10) : 10).map(nameOf); // 公司名在表格上方
  let name = top.find((n) => /\b(pty|ltd|limited|p\/l)\b/i.test(n)) || top.find((n) => n.split(' ').filter((w) => /^[a-z]{3,}$/i.test(w)).length >= 2) || '';
  name = name.replace(/^(.*?\b(pty\.?\s*ltd|limited|p\/l|ltd))\b.*$/i, '$1');
  return { supplier: { name, abn }, ref, rows, totals, incGst: null };
}

// 两种识别方式共用：核对每行、判断单据价格是否含 GST、计算进货单价（不含 GST）
function reviewScan(r, gstRate) {
  r.rows.forEach((x) => {
    x.discount = x.discount || 0;
    if (x.amount === null && x.qty && x.price !== null) x.amount = r2(x.qty * x.price * (1 - x.discount / 100));
    x.ok = x.qty > 0 && x.price !== null && x.amount !== null && near(x.qty * x.price * (1 - x.discount / 100), x.amount, 0.011 + x.qty * 0.005);
  });
  const t = Object.assign({ subtotal: null, gst: null, total: null, extra: 0 }, r.totals);
  r.sum = r2(r.rows.reduce((a, x) => a + (x.amount || 0), 0));
  const tol = Math.max(0.05, r.rows.length * 0.011);
  const goods = r.sum + (t.extra || 0);
  const hit = (v) => v !== null && near(goods, v, tol);
  if (hit(t.subtotal)) r.incGst = false;
  else if (t.gst > 0 && hit(t.total)) r.incGst = true;
  r.incGst = !!r.incGst;
  r.target = r.incGst ? t.total : t.subtotal ?? (t.gst ? null : t.total);
  r.matched = r.target !== null && hit(r.target);
  r.withGst = t.gst > 0 ? true : t.gst === 0 ? false : null;
  r.rows.forEach((x) => {
    const net = x.ok || x.price === null ? x.amount / x.qty : x.price * (1 - x.discount / 100);
    x.unitCost = Math.round(((Number.isFinite(net) ? net : 0) / (r.incGst ? 1 + gstRate : 1)) * 10000) / 10000;
  });
  return r;
}

// 匹配用的键：只留字母数字并统一 OCR 易混字符（O→0，I/L→1），货号 HW-00L 也能对上 HW-001
const scanKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '').replace(/o/g, '0').replace(/[il]/g, '1');

// 识别的完整流程；engine = 'ocr'（本地）或 'ai'
async function runScan(files, engine, status) {
  const pages = await readScanFiles(files, status);
  if (!pages.length) throw new Error('请选择照片、扫描件或 PDF 文件');
  let result;
  if (engine === 'ai') {
    const vision = !!S().aiVision;
    if (!vision) await ocrPages(pages, status); // 纯文本模型（如 DeepSeek）：先在本机 OCR 出文字
    status('正在等待 AI 返回结果…');
    const textPages = pages.filter((p) => p.lines && (!vision || p.textLayer));
    const text = textPages.map((p, n) => (textPages.length > 1 ? `--- Page ${n + 1} ---\n` : '') + p.lines.join('\n')).join('\n\n');
    const images = vision ? pages.filter((p) => !p.textLayer).map((p) => scaleCanvas(p.canvas, AI_IMG_SIZE).toDataURL('image/jpeg', 0.85)) : [];
    result = await api('/api/scan/ai', { method: 'POST', body: { images, text } });
  } else {
    await ocrPages(pages, status);
    result = parseScanText(pages.flatMap((p) => p.lines));
  }
  result.text = pages.filter((p) => p.lines).map((p) => p.lines.join('\n')).join('\n\n');
  result.pages = pages.map((p) => p.canvas);
  return result;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
