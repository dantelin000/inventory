'use strict';

// UI language is local to this browser. Stored inventory data is never translated.
const UI_LANG = (() => {
  try { return localStorage.getItem('inventory-language') === 'en' ? 'en' : 'zh'; } catch { return 'zh'; }
})();
const EN = {
  '但丁进销存': '但丁进销存', '📦 但丁进销存': '📦 但丁进销存', '访问密码': 'Access password', '登录': 'Sign in',
  '概览': 'Dashboard', '物品': 'Items', '销售发票': 'Sales invoices', '客户/应收': 'Customers / receivables',
  '采购入库': 'Purchases', '供应商': 'Suppliers', '库存流水': 'Stock movements', '设置': 'Settings', '退出': 'Sign out',
  '本月销售额（不含 GST）': 'Sales this month (ex GST)', '本月毛利': 'Gross profit this month',
  '应收款': 'Receivables', '其中逾期': 'Overdue amount', '本月采购（不含 GST）': 'Purchases this month (ex GST)',
  '库存成本金额': 'Inventory cost value', '物品种类 / 低库存': 'Items / low stock',
  '⏰ 逾期未收发票': '⏰ Overdue invoices', '⚠️ 低库存物品': '⚠️ Low stock items',
  '最近库存变动': 'Recent stock movements', '全部': 'All', '全部分类': 'All categories',
  '仅低库存': 'Low stock only', '+ 新增物品': '+ Add item', '名称': 'Name', '分类': 'Category',
  '库位': 'Location', '数量': 'Quantity', '成本价': 'Cost price', '售价': 'Sale price',
  '库存成本': 'Inventory cost', '全部状态': 'All statuses', '未收清': 'Outstanding',
  '逾期': 'Overdue', '已付清': 'Paid', '已作废': 'Void', '+ 新建发票': '+ New invoice',
  '发票号': 'Invoice number', '日期': 'Date', '客户': 'Customer', '到期日': 'Due date',
  '总额': 'Total', '未收': 'Balance', '毛利': 'Gross profit', '状态': 'Status',
  '仅有欠款': 'Owing only', '+ 新增客户': '+ Add customer', '联系人': 'Contact',
  '电话': 'Phone', '账期': 'Payment terms', '发票数': 'Invoices', '未收款': 'Outstanding',
  '已入库': 'Received', '+ 采购入库': '+ New purchase', '采购单号': 'Purchase number',
  '供应商单号': 'Supplier reference', '商品数': 'Items', '不含 GST': 'Ex GST',
  '+ 新增供应商': '+ Add supplier', '邮箱': 'Email', '采购单数': 'Purchases',
  '采购总额（不含 GST）': 'Total purchases (ex GST)', '全部类型': 'All types',
  '入库': 'Stock in', '出库': 'Stock out', '盘点': 'Stocktake', '时间': 'Time',
  '类型': 'Type', '变动': 'Change', '变动前': 'Before', '变动后': 'After', '备注': 'Notes',
  '公司信息（显示在发票抬头）': 'Company details (shown on invoices)',
  '公司名称 Business Name': 'Business name', '电话 Phone': 'Phone', '邮箱 Email': 'Email',
  '地址 Address': 'Address', '网站 Website': 'Website', '上传 Logo': 'Upload logo',
  '删除': 'Delete', 'GST / 税务': 'GST / Tax',
  '已注册 GST（发票标题为 “TAX INVOICE” 并显示 GST）': 'GST registered (use TAX INVOICE and show GST)',
  '税名': 'Tax name', '税率 (%)': 'Tax rate (%)', '默认价格模式': 'Default price mode',
  '价格不含 GST（Tax Exclusive）': 'Prices exclude GST', '价格含 GST（Tax Inclusive）': 'Prices include GST',
  '货币符号': 'Currency symbol', '货币代码': 'Currency code', '发票 / 单号': 'Document numbers',
  '发票号前缀': 'Invoice prefix', '采购单号前缀': 'Purchase prefix',
  '默认账期（天）': 'Default payment terms (days)', '发票底部文字': 'Invoice footer',
  '收款银行信息（显示在发票 “How to Pay”）': 'Bank details (shown under How to Pay)',
  '银行 Bank': 'Bank', '户名 Account Name': 'Account name', '账号 Account Number': 'Account number',
  '保存设置': 'Save settings', '导出 Excel (CSV)': 'Export CSV', '物品清单': 'Item list',
  '发票汇总': 'Invoice summary', '发票明细': 'Invoice lines', '采购明细': 'Purchase lines',
  '备份与恢复': 'Backup and restore', 'JSON 备份包含全部数据（不含图片文件）。恢复会': 'The JSON backup contains all data except image files. Restoring will',
  '覆盖': 'overwrite', '当前全部数据。': 'all current data.', '下载备份': 'Download backup',
  '从备份恢复…': 'Restore from backup…', '新增物品': 'Add item', '编辑物品': 'Edit item',
  '名称 *': 'Name *', 'SKU / 编码': 'SKU / Code', '单位': 'Unit', '初始数量': 'Initial quantity',
  '最低库存（预警）': 'Minimum stock (alert)', '成本价（不含 GST）': 'Cost price (ex GST)',
  '默认售价': 'Default sale price', 'GST-free 免税商品（开发票时默认不收 GST）': 'GST-free item (do not charge GST by default)',
  '产品图片': 'Product images', '（最多 10 张，第一张为封面，可拖拽或粘贴图片）': '(Up to 10 images; first is the cover. Drag or paste images.)',
  '取消': 'Cancel', '保存': 'Save', '件': 'piece', '个': 'each', '箱': 'box',
  '包': 'pack', '套': 'set', '台': 'unit', '米': 'metre', '千克': 'kg',
  '出入库': 'Adjust stock', '确认': 'Confirm', '记录': 'History', '关闭': 'Close',
  '提示：销售请用「销售发票」，采购请用「采购入库」，这样会自动记录金额和往来单位。': 'Tip: Use sales invoices for sales and purchases for incoming stock so amounts and parties are recorded.',
  '新增客户': 'Add customer', '编辑客户': 'Edit customer', '新增供应商': 'Add supplier',
  '编辑供应商': 'Edit supplier', '地址': 'Address', '账期（天）': 'Payment terms (days)',
  '新建销售发票': 'New sales invoice', '发票日期': 'Invoice date',
  '到期日 Due Date': 'Due date', '客户订单号 Reference': 'Customer reference',
  '价格模式': 'Price mode', '价格不含 GST': 'Prices exclude GST', '价格含 GST': 'Prices include GST',
  '商品': 'Item', '单价': 'Unit price', '折扣%': 'Discount %', '金额': 'Amount',
  '+ 添加商品': '+ Add item', '发票备注（会打印）': 'Invoice notes (printed)',
  '开具发票并出库': 'Create invoice and deduct stock', '入库日期': 'Date received',
  '供应商发票/单号': 'Supplier invoice / reference', '成本价更新方式': 'Cost update method',
  '加权平均（推荐）': 'Weighted average (recommended)', '使用本次进货价': 'Use latest purchase cost',
  '不更新成本价': 'Keep current cost', '供应商收取 GST': 'Supplier charges GST',
  '进货单价（不含 GST）': 'Unit cost (ex GST)', '当前成本价': 'Current cost',
  '+ 新建物品': '+ New item', '确认入库': 'Receive stock', '全部分类': 'All categories',
  '未付款': 'Unpaid', '部分付款': 'Part paid', '散客': 'Cash sale',
  '没有逾期发票 👍': 'No overdue invoices 👍', '暂无低库存物品 👍': 'No low stock items 👍',
  '暂无记录': 'No records', '低库存': 'Low stock', '编辑': 'Edit',
  '没有匹配的物品': 'No matching items', '还没有物品，点击右上角「新增物品」开始吧': 'No items yet. Use Add item to get started.',
  '已保存': 'Saved', '已删除': 'Deleted', '封面': 'Cover', '设封面': 'Set as cover',
  '添加图片': 'Add images', '盘点后实际数量': 'Actual quantity after stocktake',
  '入库数量': 'Quantity in', '出库数量': 'Quantity out', '应收款合计': 'Total receivables',
  '未到期': 'Current', '对账单': 'Statement', '开发票': 'Create invoice',
  '没有匹配的客户': 'No matching customers', '还没有客户，点击「新增客户」添加': 'No customers yet. Use Add customer to get started.',
  '散客（未指定客户）': 'Cash sales (no customer)', '没有匹配的供应商': 'No matching suppliers',
  '还没有供应商，点击「新增供应商」添加': 'No suppliers yet. Use Add supplier to get started.',
  '查看/收款': 'View / record payment', '查看': 'View',
  '没有匹配的发票': 'No matching invoices', '还没有发票，点击「新建发票」开始销售': 'No invoices yet. Use New invoice to get started.',
  '请先添加物品': 'Add an item first', '（散客 / 不指定客户）': '(Cash sale / no customer)',
  '选择商品…': 'Select item…', '是否收取 GST': 'Charge GST', '总计': 'Total',
  '成本': 'Cost', '毛利率': 'Gross margin', '（仅内部可见，不会打印）': '(Internal only; not printed)',
  '没有匹配的采购单': 'No matching purchases', '还没有采购单，点击「采购入库」记录进货': 'No purchases yet. Use New purchase to record stock.',
  '（不指定供应商）': '(No supplier)', '（请在「设置」填写公司名称）': '(Enter your business name in Settings)',
  '（请在「设置」填写收款银行信息）': '(Enter bank details in Settings)',
  '打印 / 保存 PDF': 'Print / save PDF', '暂无收款': 'No payments yet',
  '收款日期': 'Payment date', '方式': 'Method', '可选': 'Optional',
  '登记收款': 'Record payment', '作废（退回库存）': 'Void (restore stock)',
  '收款已登记': 'Payment recorded', '已作废，库存已退回': 'Voided; stock restored',
  '加权平均': 'Weighted average', '未更新': 'Not updated',
  '作废（扣回库存）': 'Void (deduct stock)', '暂无发票': 'No invoices',
  '设置已保存': 'Settings saved', 'Logo 已更新': 'Logo updated', 'Logo 已删除': 'Logo deleted',
  '无法读取该图片': 'Could not read the image', '恢复备份将覆盖当前所有数据，确定继续？': 'Restoring the backup will overwrite all current data. Continue?',
  '恢复失败：': 'Restore failed: ', '请先登录': 'Please sign in', '请求失败': 'Request failed',
  '密码错误': 'Incorrect password', '接口不存在': 'API endpoint not found', '服务器内部错误': 'Internal server error',
  '备份文件格式不正确': 'Invalid backup format', '名称不能为空': 'Name is required',
  '收款金额必须大于 0': 'Payment amount must be greater than 0',
  '已作废的发票不能收款': 'Cannot record a payment on a void invoice',
  '该发票已有收款记录，请先删除收款再作废': 'Delete payments before voiding this invoice',
  '该发票已作废': 'This invoice is already void', '该采购单已作废': 'This purchase is already void',
  '商品行过多': 'Too many item lines', '发票至少需要一行商品': 'Add at least one invoice item',
  '采购单至少需要一行商品': 'Add at least one purchase item',
  '数量必须大于 0': 'Quantity must be greater than 0', '图片不存在': 'Image not found',
  '类型无效': 'Invalid type', '请求体过大': 'Request body too large', 'JSON 格式错误': 'Invalid JSON',
  'images 必须是数组': 'Images must be an array',
  '入库成功': 'Stock in successful', '出库成功': 'Stock out successful', '盘点成功': 'Stocktake saved',
  '搜索 名称 / SKU / 库位 / 备注…': 'Search name / SKU / location / notes…',
  '搜索 发票号 / 客户 / 商品 / Reference…': 'Search invoice / customer / item / reference…',
  '搜索 客户名称 / 联系人 / 电话 / ABN…': 'Search customer / contact / phone / ABN…',
  '搜索 采购单号 / 供应商 / 商品 / 供应商单号…': 'Search purchase / supplier / item / reference…',
  '搜索 供应商名称 / 联系人 / 电话 / ABN…': 'Search supplier / contact / phone / ABN…',
  '搜索 物品 / 备注 / 单号…': 'Search item / notes / document number…',
  '按月份筛选': 'Filter by month', '邮箱 / 手机 / ABN': 'Email / mobile / ABN',
  '如：领用、报损、样品…': 'For example: used, damaged, samples…',
  '公司或个人名称': 'Company or individual name', '留空使用默认': 'Leave blank to use default',
  '可选，如客户 PO 号': 'Optional, e.g. customer PO number',
  '交货说明、付款说明…': 'Delivery or payment instructions…',
  '上一张': 'Previous image', '下一张': 'Next image',
  '采购': 'Reorder', '初始库存': 'Opening stock', '账期天数': 'Payment terms (days)', '税率': 'Tax rate',
  '收款金额': 'Payment amount', '进货价': 'unit cost', '折扣': 'discount',
  '批量导入': 'Bulk import', '批量导入物品': 'Bulk import items', '选择 CSV 文件…': 'Choose CSV file…',
  '…或在此粘贴表格内容（第一行为表头）': '…or paste the table here (first row is the header)',
  'SKU（无 SKU 时按名称）已存在的物品': 'Items that already exist (matched by SKU, or by name without a SKU)',
  '跳过': 'Skip', '更新资料': 'Update details',
  '同时按表格「数量」更新已有物品库存（记为盘点）': 'Also update stock of existing items from the Quantity column (recorded as a stocktake)',
  '新物品的「数量」会记为入库；更新已有物品时，空白单元格保留原值。': 'Quantity for new items is recorded as stock in. When updating existing items, blank cells keep the current value.',
  '预览': 'Preview', '确认导入': 'Import', '新增': 'New', '更新': 'Update', '有误': 'Error', '已存在': 'Already exists',
  '行': 'Row', '说明': 'Details', '最低库存': 'Minimum stock', '免GST': 'GST-free',
  '有误的行不会导入': 'Rows with errors will not be imported',
  '请先选择文件或粘贴表格内容': 'Choose a file or paste a table first',
  '没有找到「名称」列，请确认第一行是表头（可下载模板参考）': 'No Name column found. Make sure the first row is the header (see the template).',
  '表格中没有数据行': 'The table has no data rows',
  '请在 Excel 中「另存为 CSV（UTF-8）」后再导入，或直接复制表格粘贴': 'In Excel, use Save As → CSV UTF-8 before importing, or copy and paste the table',
  '没有可导入的数据': 'Nothing to import', '批量导入盘点': 'Bulk import stocktake',
  '📷 识别入货单': '📷 Scan supplier invoice', '识别方式': 'Recognition method', 'AI 识别': 'AI recognition',
  '本地识别（免费）': 'On-device OCR (free)',
  '照片、扫描件、PDF、Excel 或 CSV 都可以，多页单据可一次选多张；识别结果会填到下面，核对后再入库': 'Photos, scans, PDFs, Excel or CSV files. Select several files for a multi-page invoice. The results are filled in below so you can check them before receiving stock.',
  '📷 识别订单开票': '📷 Scan order to invoice', '📷 识别单据': '📷 Scan document',
  '客户订货单、出货单的照片、扫描件、PDF、Excel 或 CSV 都可以；识别结果会填到下面，核对后再开票': 'Photos, scans, PDFs, Excel or CSV files of a customer order or delivery docket. The results are filled in below so you can check them before creating the invoice.',
  '正在读取表格…': 'Reading spreadsheet…', '+ 新增此客户': '+ Add this customer',
  '单据上没有价格的行已按当前成本价填写。': 'Lines without a price on the document use the current cost price.',
  '单据上没有价格的行已按物品默认售价填写。': 'Lines without a price on the document use the item’s default sale price.',
  '单据价格含 GST，已换算成不含 GST 的单价。': 'The document prices include GST; unit prices have been converted to ex GST.',
  '单据价格不含 GST，已按发票的「价格含 GST」模式换算。': 'The document prices exclude GST; they have been converted for this GST-inclusive invoice.',
  '数量 × 单价与单据金额对不上，请对照原图核对': 'Quantity × unit price does not match the line amount. Check it against the original.',
  '+ 新建为物品': '+ Create as new item', '正在读取文件…': 'Reading files…', '正在读取 PDF…': 'Reading PDF…',
  '正在加载识别组件（首次使用需下载约 5 MB）…': 'Loading the recognition engine (about 5 MB on first use)…',
  '正在等待 AI 返回结果…': 'Waiting for the AI response…',
  '识别组件下载失败，请检查网络后重试': 'Could not download the recognition engine. Check your connection and try again.',
  '请选择照片、扫描件、PDF、Excel 或 CSV 文件': 'Choose a photo, scan, PDF, Excel or CSV file',
  '没有识别到商品行。可以换一张更清晰、更正的照片再试，或展开「识别出的文字」手动录入。': 'No item lines were found. Try a sharper, straighter photo, or open “Recognised text” and enter the lines yourself.',
  '商品行合计与单据金额一致 ✓': 'Item lines add up to the invoice amount ✓',
  '单据价格含 GST，进货单价已换算成不含 GST。': 'The invoice prices include GST; unit costs have been converted to ex GST.',
  '+ 新增此供应商': '+ Add this supplier', '查看原图': 'View original', '识别出的文字': 'Recognised text',
  '下载 CSV': 'Download CSV', '单据原图': 'Original document', '货号': 'Code', '品名': 'Description',
  'AI 识别单据（可选）': 'AI document recognition (optional)', '接口地址': 'API base URL', '模型': 'Model',
  '模型能直接看图片（如 GPT-4o、Gemini、通义千问 VL）': 'The model can read images (e.g. GPT-4o, Gemini, Qwen-VL)',
  '支持任何 OpenAI 兼容接口，例如 DeepSeek（接口地址 https://api.deepseek.com，模型 deepseek-chat）、OpenAI、Google Gemini、通义千问、智谱、OpenRouter、本机 Ollama。': 'Works with any OpenAI-compatible API, such as DeepSeek (base URL https://api.deepseek.com, model deepseek-chat), OpenAI, Google Gemini, Qwen, Zhipu, OpenRouter or a local Ollama.',
  'DeepSeek 等纯文本模型：不要勾选「能直接看图片」，系统会先在浏览器里把照片识别成文字，再交给 AI 整理，费用很低。勾选后会直接把照片发给 AI，准确率更高，但需要支持图片的模型。': 'For text-only models such as DeepSeek, leave “can read images” unticked: photos are first turned into text in your browser and the AI organises the text, which costs very little. When ticked, photos are sent to the AI directly, which is more accurate but needs a model that accepts images.',
  '单据内容会发送给你填写的服务商。不填则只使用免费的本地识别；清空接口地址即可关闭 AI 识别。': 'Invoice contents are sent to the provider you enter. Leave this blank to use only the free on-device OCR; clear the base URL to turn AI recognition off.',
  '已保存（留空则不修改）': 'Saved (leave blank to keep it)',
  '请先在「设置」填写 AI 识别接口': 'Set up AI recognition in Settings first', '图片格式不正确': 'Invalid image format',
  '没有可识别的内容': 'Nothing to recognise', 'AI 返回的内容无法解析，请重试或换一个模型': 'Could not read the AI response. Try again or use another model.',
  '超时': 'timed out',
};

// 服务端报错里的字段名，如「第 2 行单价」
const trField = (f) => EN[f] || f.replace(/^第 (\d+) 行(.+)$/, (_, row, x) => `Row ${row} ${(EN[x] || x).toLowerCase()}`);

const DYNAMIC_EN = [
  [/^识别到的列：(.+)$/, (_, cols) => `Columns found: ${cols.split('、').map(tr).join(', ')}`],
  [/^(新增|更新|跳过|有误) (\d+)$/, (_, label, n) => `${EN[label]} ${n}`],
  [/^库存 (\d+) → (\d+)$/, (_, from, to) => `Stock ${from} → ${to}`],
  [/^仅显示前 (\d+) 行，共 (\d+) 行$/, (_, shown, total) => `Showing first ${shown} of ${total} rows`],
  [/^导入完成：新增 (\d+)，更新 (\d+)，跳过 (\d+)(?:，(\d+) 行有误未导入)?$/, (_, c, u, s, e) => `Import complete: ${c} new, ${u} updated, ${s} skipped${e ? `, ${e} rows with errors not imported` : ''}`],
  [/^一次最多导入 (\d+) 行$/, (_, n) => `Up to ${n} rows per import`],
  [/^与第 (\d+) 行重复$/, (_, n) => `Duplicate of row ${n}`],
  [/^与第 (\d+) 行是同一物品$/, (_, n) => `Same item as row ${n}`],
  [/^逾期 (\d+) 天$/, (_, n) => `Overdue ${n} days`],
  [/^最低 (\d+)(.*)$/, (_, n, unit) => `Minimum ${n}${unit ? ' ' + tr(unit) : ''}`],
  [/^当前库存：(\d+) (.*)$/, (_, n, unit) => `Current stock: ${n} ${tr(unit)}`],
  [/^(.+) · 当前 (\d+) (.+) · 成本价 (.+)$/, (_, name, qty, unit, cost) => `${name} · Current ${qty} ${tr(unit)} · Cost ${cost}`],
  [/^留空使用默认 (\d+) 天$/, (_, n) => `Leave blank to use default (${n} days)`],
  [/^(\d+) 天$/, (_, n) => `${n} days`],
  [/^(-?\d+(?:\.\d+)?) (\S+)$/, (_, n, unit) => `${n} ${tr(unit)}`], // 单据里的「1 箱」
  [/^账期 (\d+) 天(.*)$/, (_, n, rest) => `Terms: ${n} days${rest}`],
  [/^库存不足（当前 (\d+)(.*)）$/, (_, n, unit) => `Insufficient stock (available: ${n}${unit ? ' ' + tr(unit) : ''})`],
  [/^(.+)（库存 (\d+)(.*)）$/, (_, name, n, unit) => `${name} (stock: ${n} ${tr(unit)})`],
  [/^总计（含 (.+)）$/, (_, tax) => `Total (incl. ${tax})`],
  [/^其中 (.+)$/, (_, tax) => `Includes ${tax}`],
  [/^小计（不含 (.+)）$/, (_, tax) => `Subtotal (ex ${tax})`],
  [/^供应商收取 (.+)（(.+)）$/, (_, tax, rate) => `Supplier charges ${tax} (${rate})`],
  [/^有效发票 (\d+) 张合计$/, (_, n) => `${n} valid invoices in total`],
  [/^有效采购单 (\d+) 张合计$/, (_, n) => `${n} valid purchases in total`],
  [/^逾期 (\d+-\d+) 天$/, (_, n) => `Overdue ${n} days`],
  [/^逾期 (\d+) 天以上$/, (_, n) => `Overdue ${n}+ days`],
  [/^当前欠款 (.+)$/, (_, amount) => `Currently owing ${amount}`],
  [/^成本 (.+)$/, (_, amount) => `Cost ${amount}`],
  [/^毛利 (.+)$/, (_, amount) => `Gross profit ${amount}`],
  [/^毛利率 (.+)$/, (_, percent) => `Gross margin ${percent}`],
  [/^上传图片 (\d+)\/(\d+)…$/, (_, n, total) => `Uploading image ${n}/${total}…`],
  [/^全部发票（(\d+)）$/, (_, n) => `All invoices (${n})`],
  [/^收款记录（已收 (.+) · 未收 (.+)）$/, (_, paid, balance) => `Payments (paid ${paid} · balance ${balance})`],
  [/^已恢复：(\d+) 个物品，(\d+) 张发票，(\d+) 张采购单$/, (_, items, invoices, purchases) => `Restored: ${items} items, ${invoices} invoices, ${purchases} purchases`],
  [/^已开具 (.+)，库存已扣减$/, (_, no) => `Created ${no}; stock deducted`],
  [/^(.+) 已入库$/, (_, no) => `${no} received`],
  [/^作废于 (.+?)(?:：(.*))?（成本价不会自动恢复）$/, (_, when, reason) => `Voided at ${when}${reason ? ': ' + reason : ''} (cost prices are not restored automatically)`],
  [/^作废于 (.+)$/, (_, when) => `Voided at ${when}`],
  [/^成本价更新方式：$/, () => 'Cost update method:'],
  [/^确定删除「(.+)」？历史单据和流水会保留。$/, (_, name) => `Delete “${name}”? Historical documents and movements will remain.`],
  [/^确定删除「(.+)」？$/, (_, name) => `Delete “${name}”?`],
  [/^删除这条收款记录？$/, () => 'Delete this payment?'],
  [/^作废 (.+)？商品数量会退回库存。\n作废原因（可留空）：$/, (_, no) => `Void ${no}? Item quantities will return to stock.\nReason (optional):`],
  [/^作废 (.+)？将从库存中扣回本单数量。\n作废原因（可留空）：$/, (_, no) => `Void ${no}? This purchase's quantities will be deducted from stock.\nReason (optional):`],
  [/^每个物品最多 (\d+) 张图片，已忽略多余的 (\d+) 张$/, (_, max, extra) => `Maximum ${max} images per item; ${extra} extra images ignored`],
  [/^无法读取图片「(.+)」，请换成 JPG \/ PNG 格式$/, (_, name) => `Could not read “${name}”. Try JPG or PNG.`],
  [/^恢复失败：(.*)$/, (_, reason) => `Restore failed: ${tr(reason)}`],
  [/^(客户|供应商)名称不能为空$/, (_, label) => `${label === '客户' ? 'Customer' : 'Supplier'} name is required`],
  [/^(物品|客户|供应商|发票|采购单|图片)不存在$/, (_, label) => `${EN[label] || label} not found`],
  [/^该(客户|供应商)已有单据，不能删除$/, (_, label) => `Cannot delete this ${label === '客户' ? 'customer' : 'supplier'} because it has documents`],
  [/^(.+) 必须是 (.+) ~ (.+) 之间的数字$/, (_, field, min, max) => `${trField(field)} must be a number between ${min} and ${max}`],
  [/^编码 (.+) 已被「(.+)」使用$/, (_, sku, name) => `SKU ${sku} is already used by “${name}”`],
  [/^「(.+)」库存不足：当前 (.+)，无法出库 (.+)$/, (_, name, available, requested) => `Insufficient stock for “${name}”: ${available} available; cannot take out ${requested}`],
  [/^「(.+)」库存不足：当前 (.+)，(.+)需要 (.+)$/, (_, name, available, action, requested) => `Insufficient stock for “${name}”: ${available} available; ${action} needs ${requested}`],
  [/^第 (\d+) 行(.+)必须大于 0$/, (_, row, field) => `Row ${row}: ${trField(field)} must be greater than 0`],
  [/^收款金额超过未收余额 (.+)$/, (_, balance) => `Payment exceeds the outstanding balance of ${balance}`],
  [/^每个物品最多 (\d+) 张图片$/, (_, max) => `Maximum ${max} images per item`],
  [/^(.+) 必须是 JPEG \/ PNG \/ WebP 图片$/, (_, field) => `${EN[field] || field} must be a JPEG, PNG or WebP image`],
  [/^(.+) 不是有效的图片文件$/, (_, field) => `${EN[field] || field} is not a valid image file`],
  [/^销售 (.+)$/, (_, details) => `Sale ${details}`],
  [/^采购 (.+)$/, (_, details) => `Purchase ${details}`],
  [/^作废 (.+)$/, (_, details) => `Void ${details}`],
  [/^正在识别第 (\d+)\/(\d+) 页…(?: (\d+)%)?$/, (_, n, total, pct) => `Recognising page ${n} of ${total}…${pct ? ` ${pct}%` : ''}`],
  [/^已识别 (\d+) 行商品，其中 (\d+) 行已自动匹配物品。请逐行核对数量和单价，确认无误再(入库|开票)。$/, (_, n, m, verb) => `Found ${n} item lines; ${m} matched existing items automatically. Check each line's quantity and price before ${verb === '入库' ? 'receiving stock' : 'creating the invoice'}.`],
  [/^(\d+) 行的「数量 × 单价」与单据金额对不上（已标红），可能认错了数字。$/, (_, n) => `${n} lines have a quantity × unit price that does not match the amount (shown in red). Some digits may have been misread.`],
  [/^商品行合计 (.+)，单据(小计|总计) (.+)，两者不一致，可能有漏识别或认错的行。$/, (_, sum, label, target) => `Item lines total ${sum} but the invoice ${label === '小计' ? 'subtotal' : 'total'} is ${target}. A line may be missing or misread.`],
  [/^单据上的(供应商|客户)：(.+)$/, (_, kind, name) => `${kind === '供应商' ? 'Supplier' : 'Customer'} on the document: ${name}`],
  [/^无法读取表格「(.+)」$/, (_, name) => `Could not read the spreadsheet “${name}”`],
  [/^AI 接口返回错误（(\d+)）：([\s\S]*)$/, (_, status, msg) => `The AI service returned an error (${status}): ${msg}`],
  [/^无法连接 AI 接口：(.*)$/, (_, reason) => `Could not reach the AI service: ${tr(reason)}`],
  [/^无法读取 PDF「(.+)」，文件可能已损坏或设置了密码$/, (_, name) => `Could not read the PDF “${name}”. It may be damaged or password-protected.`],
];

function tr(value) {
  if (UI_LANG !== 'en' || typeof value !== 'string') return value;
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const body = match[2];
  if (Object.prototype.hasOwnProperty.call(EN, body)) return match[1] + EN[body] + match[3];
  for (const [pattern, replace] of DYNAMIC_EN) {
    if (pattern.test(body)) return match[1] + body.replace(pattern, replace) + match[3];
  }
  return value;
}

function translateNode(node) {
  if (UI_LANG !== 'en' || node.closest?.('datalist, script, style')) return;
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.parentElement?.closest('datalist, script, style')) return;
    if (node.parentElement?.dataset.en && /[\u4e00-\u9fff]/.test(node.nodeValue)) {
      node.nodeValue = node.nodeValue.replace(/^(\s*)[\s\S]*?(\s*)$/, (_, before, after) => before + node.parentElement.dataset.en + after);
      return;
    }
    const translated = tr(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return;
  const elements = node.nodeType === Node.ELEMENT_NODE ? [node, ...node.querySelectorAll('*')] : [...node.querySelectorAll('*')];
  for (const element of elements) {
    if (element.closest('datalist, script, style')) continue;
    for (const attr of ['placeholder', 'title', 'aria-label']) {
      if (element.hasAttribute(attr)) {
        const old = element.getAttribute(attr);
        const translated = tr(old);
        if (translated !== old) element.setAttribute(attr, translated);
      }
    }
    for (const child of element.childNodes) if (child.nodeType === Node.TEXT_NODE) translateNode(child);
  }
}

document.documentElement.lang = UI_LANG === 'en' ? 'en-AU' : 'zh-CN';
document.title = tr(document.title);
document.querySelectorAll('[data-lang]').forEach((el) => { el.hidden = el.dataset.lang !== UI_LANG; });
if (UI_LANG === 'en') document.querySelectorAll('a[href^="/api/export/"], a[href^="/api/import/"]').forEach((link) => { link.href += '?lang=en'; });
document.querySelectorAll('.lang-select').forEach((select) => {
  select.value = UI_LANG;
  select.addEventListener('change', () => {
    try { localStorage.setItem('inventory-language', select.value); } catch {}
    location.reload();
  });
});
translateNode(document);
if (UI_LANG === 'en') {
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateNode(mutation.target);
      else if (mutation.type === 'attributes') translateNode(mutation.target);
      else for (const added of mutation.addedNodes) translateNode(added);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
}
