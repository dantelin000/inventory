# 📦 但丁进销存

[English](README.md) · **中文**

但丁进销存是一个网页版进销存系统：**单页 HTML 前端 + 零依赖 Node.js 后端**，数据存储在一个 JSON 文件中。不需要数据库，也不需要 `npm install`，拷到服务器上就能运行。界面可在中文和英文之间切换。

## 功能

- **物品管理**：名称、SKU、分类、单位、库位、成本价、默认售价、GST-free 标记、最低库存预警、产品图片（每个最多 10 张，浏览器端自动压缩）
- **销售发票（澳洲 Tax Invoice 格式）**
  - 抬头含 Logo、公司名、**ABN**、地址、电话邮箱；未注册 GST 时自动改为 “INVOICE”
  - 每行可改售价、折扣%，逐行选择是否收 **GST**（默认 10%），GST-free 商品标 “*”；支持价格含税 / 不含税两种模式
  - Invoice Number / Invoice Date / **Due Date** / Reference（客户 PO 号），日期格式 DD/MM/YYYY
  - 底部 **How to Pay**：银行、户名、**BSB**、账号、PayID，付款参考号为发票号
  - 开票自动扣库存（库存不足则整张不生效）；自动计算成本、毛利、毛利率（仅内部可见，不打印）
  - **打印 / 保存 PDF**（浏览器打印 → “另存为 PDF”，文件名自动为发票号）
  - 已付清加 PAID 章；作废加 VOID 章并退回库存
- **客户管理与应收款**
  - 客户资料：联系人、ABN、电话、邮箱、地址、单独账期（如 30 天，默认 14 天）
  - 登记收款（支持分期部分收款、多种付款方式），自动计算未收余额
  - 应收账龄：未到期 / 逾期 1-30 / 31-60 / 61-90 / 90+ 天
  - 每个客户可打印 **Statement 对账单**（未结发票明细 + 账龄 + 付款方式）
- **采购入库与供应商**
  - 供应商资料；采购入库单记录供应商、供应商发票号、每行进货价（不含 GST）、GST
  - 入库自动加库存，并按 **加权平均** / 最新进价 / 不更新 三种方式更新成本价
  - 采购中可直接新建物品；采购单可打印；作废会扣回库存
- **概览**：本月销售额、本月毛利、应收款与逾期金额、本月采购额、库存成本金额、低库存（可一键采购）、逾期发票
- **库存流水**：每次入库 / 出库 / 盘点都有记录，并可点击跳转到对应发票或采购单
- **识别单据（采购入库 / 销售发票）**：上传供应商发票、送货单或客户订货单的照片、扫描件、PDF、Excel（.xlsx / .xls）或 CSV，自动把商品行（货号、品名、数量、价格）填进采购入库单或销售发票，核对后再保存
  - 免费的本地识别（英文 OCR）在浏览器里完成，不占服务器资源；电子版 PDF 和表格直接读取，不需要 OCR
  - 表格格式不统一也没关系：按表头认列（Code / SKU、Description、Qty、Unit Price、Disc %、Amount 等，中英文都认），各家不同的格式都转成同样的商品行
  - 可选 AI 识别：在「设置」填写任意 OpenAI 兼容接口（DeepSeek、OpenAI、Gemini、通义千问、Ollama 等）
  - 按 ABN 或名称找供应商 / 客户、按 SKU 或名称匹配物品、含 / 不含 GST 价格自动换算、「数量 × 单价」与金额对不上的行标红提示，并记住每个供应商和客户的货号对照，下次自动匹配
- **eBay 订单 → 单日出货单**：直接从 eBay 账号拉取当天的订单，逐行对应物品，打印出货单（拣货汇总 + 收货地址），一键录入：自动扣库存，当天的销售合成一张已收款的发票
- **批量导入物品**：上传 CSV 或从 Excel 直接复制粘贴，导入前预览逐行校验结果；已存在的物品（按 SKU，无 SKU 按名称）可选择跳过或更新资料，并可按表格数量盘点库存
- **导出 CSV**（物品、发票汇总、发票明细、采购明细、库存流水）、**JSON 备份与恢复**
- **密码保护**：设置 `APP_PASSWORD` 后必须登录才能访问
- 支持手机浏览器，自动适配深色模式
- 顶部可切换中文 / English 界面；语言选择保存在当前浏览器中，英文界面下 CSV 表头也会使用英文

> 首次使用请先到「设置」填写公司名称、ABN、地址和收款银行信息，这些会显示在发票上。
>
> 说明：本系统按 ATO 对 Tax Invoice 的常见要求设计（卖方身份与 ABN、开票日期、商品描述与数量价格、GST 金额、标明免税商品；金额 ≥ $1,000 时应填写买方名称或 ABN），但不构成税务建议，如有疑问请咨询会计师。

## 更新记录

版本号格式为 `主版本.功能版本.修复版本`：加新功能升第二位，只修 bug 升第三位。每次更新都要改 `package.json` 里的 `version`，并在 `README.md`（英文）和 `README.zh-CN.md`（中文）两个页面的更新记录里，按相同顺序加一段同版本号的说明；合并进 main 后会自动在 GitHub 发布同名版本（Releases 页面），发布说明同时包含英文和中文。

### v1.5.0（2026-10-10）

- 中英文说明拆分为两个页面：`README.md` 为英文页，`README.zh-CN.md` 为中文页，两页顶部互相链接，与应用内的语言切换一致。两页内容和更新记录相同。
- GitHub 上发布的 Release 说明现在先英文、后中文，两段都包含。

### v1.4.0（2026-10-07）

- eBay 订单 → 单日出货单：在「销售发票」页点「🛒 eBay 订单出货」，通过 eBay Sell Fulfillment API 拉取所选日期（默认今天）下单的 eBay 订单，显示订单号、时间、收货地址、买家留言、商品和金额，以及已发货 / 已取消 / 未付款 / 买家申请取消等状态。
- 每行商品自动对应物品：先按上次为这个刊登选过的物品，再按 SKU（eBay 的 Custom label），最后按名称完全相同。没对上的行可以手动选择（同一刊登的其他行一起填上），或一键新建为物品；选择会按刊登和多属性记住，下次自动匹配。
- 打印出货单：拣货汇总（多个订单里的同一物品合并，按库位排序）+ 每个订单的收货人、地址、电话、运送方式、商品和买家留言，带勾选框方便拣货打包。录入前就能打印，录入后保存在发票里，可随时「查看出货单」重印。
- 录入出货单并扣库存：选中的订单合成一张客户为「eBay」（自动创建）的销售发票，价格与 eBay 一样含 GST，促销折扣记为行折扣%，自动登记 eBay 收款并扣减库存；寄往海外的行按出口免 GST。录入时会从 eBay 重新读取订单，已录入、已取消或未付款的订单不能录入，库存不足会在录入前提示。
- 要撤销：删除该发票的 eBay 收款记录后作废发票，库存退回，订单可以重新录入。发票列表可以按 eBay 订单号搜索。
- 在「设置 → eBay 店铺」填写 developer.ebay.com 的 App ID、Cert ID 和 RuName，再点「连接 eBay 账号」（授权后跳转的页面打不开时，可把那个网址粘贴进来）。只申请读取订单的权限；access token 过期自动续期，Cert ID 和 token 只保存在服务器上，不会出现在下载的备份里。
- 运费显示在对话框和出货单上，但不计入发票；发票只记录会扣库存的商品行。

### v1.3.0（2026-10-07）

- 识别入货单：在「采购入库」页点「📷 识别入货单」（新建采购单里也有），选择照片、扫描件、PDF、Excel 或 CSV，识别出的商品行会填进采购单；点「确认入库」之前库存不会变化。
- 识别订单开票：在「销售发票」页点「📷 识别订单开票」（新建发票里是「📷 识别单据」），上传客户的订货单（PO）、订单表或出货单。按 ABN 或名称找客户，客户 PO 号填进「客户订单号 Reference」，单据价格按发票的含 / 不含 GST 模式换算，没有价格的行使用物品默认售价。
- 支持 Excel（.xlsx / .xls / .ods）和 CSV：按表头认列（中英文列名、任意列顺序），不同供应商和客户的格式都转成同样的商品行；含 GST 的价格列、百分比格式的折扣都能正确处理。认不出表头的表格按「数量 × 单价 = 金额」规则识别。Excel 用 SheetJS 读取，首次使用时从 cdn.sheetjs.com 下载。
- 免费的本地识别：照片和扫描版 PDF 在浏览器里做英文 OCR（Tesseract.js）；电子版 PDF 直接读取文字（pdf.js）。OCR 之前先拉平手机照片的阴影，并擦掉表格框线（紧贴框线的数字容易被认错）。识别组件约 5 MB，首次使用时从 jsDelivr CDN 下载，之后浏览器会缓存。
- 不需要按供应商写模板：每行检查「数量 × 单价（扣除折扣%）≈ 金额」来找出商品行。同一规则还能修正把「$」认成 5 或 8 的情况（如 50.75 → 0.75），只在修正后算得通时才采用；仍然对不上的行标红提示，合计也会与单据小计 / 总计核对。
- 按 ABN（或名称）自动选择供应商并填写供应商单号；含 GST 的价格自动换算成不含 GST；没匹配上的行可一键新建为物品，单据上的新供应商 / 客户也可一键新增。保存时会按每个供应商、客户的货号和品名记住对应的物品，他们的下一张单据自动匹配，其中一项认错也能对上。
- 可选 AI 识别（「设置」→「AI 识别单据」）：支持任何 OpenAI 兼容接口。DeepSeek 等纯文本模型收到的是 OCR 出的文字，费用很低；能看图片的模型直接收到照片。AI 同时返回卖方和买方，系统取对方（不会选成自己公司）。API Key 只保存在服务器上，不会出现在下载的备份里。
- 识别结果可以下载为 CSV。

### v1.2.1（2026-10-01）

- `package.json` 的项目描述和整份 README 改为中英双语，先英文、后中文。

### v1.2.0（2026-09-30）

- 批量导入物品：上传 CSV 或从 Excel 复制粘贴，导入前逐行预览校验结果；已有物品可选择跳过或更新资料，并可按表格数量盘点库存。
- 导入对话框提供空白模板和示例文件下载，并附格式说明。
- 批量导入支持英文界面：说明、预览、提示和模板 / 示例文件均有英文版；英文界面导出的「物品清单」可直接再导入。

### v1.1.0（2026-09-30）

- 增加中文 / English 可选界面：登录页与应用顶部可以切换语言，浏览器记住选择；通知、对话框、打印单据与 CSV 表头随语言切换。
- 软件统一命名为「但丁进销存」：登录页、应用顶部、浏览器标题、项目说明与启动日志使用同一名称。
- 修复英文界面遗漏的翻译：概览页补货按钮、单据中的单位、作废采购单说明、「初始库存」流水备注、服务端校验提示。
- 浏览器禁用本地存储时页面仍能正常打开（默认中文）。

### v1.0.0（2026-09-29）

- 首个版本：物品与产品图片、澳洲格式销售发票（GST）、客户与应收款、采购入库与供应商、库存流水、CSV 导出与 JSON 备份、密码保护。
- 部署方式：Docker、HTTPS（Caddy）、仅 WireGuard 访问。

## eBay 订单

**首次设置**

1. 用卖货的 eBay 账号登录 [developer.ebay.com](https://developer.ebay.com)，在 **Application Keys** 创建 **Production** 的 keyset，记下 **App ID（Client ID）** 和 **Cert ID（Client Secret）**。
2. 打开 **User Tokens** → **Get a Token from eBay via Your Application** → **Add eBay Redirect URL**，得到一个 **RuName**。把它的 **auth accepted URL** 设为 `https://你的域名/api/ebay/callback`（「设置」页会显示准确地址）并保存。
3. 在本系统的 **设置 → eBay 店铺** 填入 App ID、Cert ID 和 RuName，点 **连接 eBay 账号**，登录 eBay 并同意授权，回到设置页显示「已连接」即可。
   - 如果 eBay 跳回的页面打不开（例如系统只在内网使用），把浏览器地址栏里的完整网址复制下来，粘贴到「授权后页面打不开？」里提交。

**每天使用**

1. **销售发票 → 🛒 eBay 订单出货**：自动拉取今天的订单（改日期可以拉取其他日子的订单）。
2. 确认每一行都对应了物品，点 **打印出货单** 用来拣货打包。
3. 点 **录入出货单并扣库存**：生成一张客户为「eBay」、已收款的发票并扣减库存。当天晚些时候再拉取，已录入的订单会变灰，只录入新订单。

> 连接只读取订单，不会在 eBay 上标记发货或改动任何内容。授权约 18 个月有效（到期日显示在设置页），到期后重新连接即可。

## 识别单据

1. **采购**：在「采购入库」点「📷 识别入货单」；**销售**：在「销售发票」点「📷 识别订单开票」。然后拍照或选择照片 / 扫描件 / PDF / Excel / CSV（多页单据可一次选多张）。
2. 逐行核对：标红的行金额对不上；没有对应物品的行可以选已有物品，或点「+ 新建为物品」。核对无误后点「确认入库」或「开具发票并出库」。
3. 拍照建议：单据放平、尽量占满画面、避免强烈阴影、保持正向。表格最好有表头行（如 Code、Description、Qty、Unit Price、Amount），识别最准。

**AI 识别（可选）**：在「设置 → AI 识别单据」填写任意 OpenAI 兼容接口。以 DeepSeek 为例：接口地址 `https://api.deepseek.com`，模型 `deepseek-chat`，填入 API Key，**不要**勾选「能直接看图片」。系统会先在浏览器里把照片识别成文字，只把文字发给 AI。支持图片的模型（GPT-4o、Gemini、通义千问 VL 等）可以勾选「能直接看图片」，直接发送照片。单据内容会发送给你选择的服务商；清空接口地址即可关闭 AI 识别。

> 本地识别首次使用时，浏览器需要能访问 `cdn.jsdelivr.net`（读取 Excel 还需要 `cdn.sheetjs.com`）。

## 本地运行

需要 Node.js 18 及以上。

```bash
APP_PASSWORD=你的密码 node server.js
# 打开 http://localhost:3000
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `APP_PASSWORD` | 访问密码。**公网部署时必须设置** | 空（不需要密码） |
| `PORT` | 监听端口 | `3000` |
| `DATA_DIR` | 数据目录（保存 `db.json`） | `./data` |
| `SESSION_SECRET` | 登录 Cookie 签名密钥，可选 | 由密码派生 |

## 部署到公网

> ⚠️ 数据保存在 `DATA_DIR/db.json`，托管平台必须提供**持久化磁盘**，否则重启后数据会丢失。

### 方案一：云服务器 + Docker（推荐，最稳定）

适合阿里云 / 腾讯云 / 华为云轻量服务器，或任何海外 VPS（每月几十元即可）。

```bash
# 1. 在服务器上安装 Docker（Ubuntu 示例）
curl -fsSL https://get.docker.com | sh

# 2. 拉取代码
git clone https://github.com/dantelin000/inventory.git
cd inventory

# 3. 修改 docker-compose.yml 中的 APP_PASSWORD，然后启动
docker compose up -d --build
```

然后在云服务器控制台的**安全组 / 防火墙**中放行 80 端口，浏览器访问 `http://服务器公网IP` 即可。

- 更新代码：`git pull && docker compose up -d --build`
- 数据保存在 Docker 卷 `inventory-data` 中，更新不会丢失

**不用 Docker 也可以**：服务器装好 Node.js 后直接运行
`APP_PASSWORD=你的密码 PORT=80 node server.js`，并用 `pm2` 或 `systemd` 保持后台运行。

### 方案二：Render / Railway / Fly.io 等托管平台

- **Render**：仓库里已有 `render.yaml`，在 Render 控制台选择 *New → Blueprint* 并选中本仓库，填写 `APP_PASSWORD` 即可。持久化磁盘需要付费实例（Starter）。
- **Railway / Fly.io**：会自动识别 `Dockerfile`。添加一个 Volume 挂载到 `/app/data`，并设置 `APP_PASSWORD` 环境变量。

### 绑定域名与 HTTPS（建议）

公网使用时强烈建议开启 HTTPS，避免密码被明文传输。托管平台（Render / Railway / Fly.io）默认自带 HTTPS；自己的服务器可以用仓库里的 `docker-compose.https.yml`，它在前面加了一层 [Caddy](https://caddyserver.com/)，会自动申请并续期免费证书。

1. 准备一个域名，在域名服务商处添加 **A 记录**，指向服务器公网 IP（如 `inventory.你的域名.com.au`）
2. 服务器防火墙 / 安全组放行 **80 和 443** 端口（申请证书需要 80）
3. 在项目目录创建 `.env`：

   ```bash
   cp .env.example .env
   nano .env   # 填写 DOMAIN 和 APP_PASSWORD
   ```

4. 启动（如果之前用 `docker-compose.yml` 运行过，先 `docker compose down`，数据卷会保留）：

   ```bash
   docker compose -f docker-compose.https.yml up -d --build
   ```

几十秒后访问 `https://你的域名` 即可，HTTP 会自动跳转到 HTTPS。登录 Cookie 在 HTTPS 下会自动加上 `Secure`。

- 更新代码：`git pull && docker compose -f docker-compose.https.yml up -d --build`
- 查看证书申请日志：`docker compose -f docker-compose.https.yml logs caddy`
- 注意：中国大陆的服务器绑定域名需要先完成 ICP 备案；澳洲等海外服务器不需要。

### 方案三：仅 WireGuard 内网访问（可选，最安全）

网站不对公网开放，只有连上 [WireGuard](https://www.wireguard.com/) 的设备才能访问。公网上只开放一个 UDP 端口，扫描程序看不到网站；WireGuard 隧道本身已加密，因此**不需要域名和 HTTPS**。代价是每台要访问的设备都需要安装 WireGuard 客户端。适合只有自己和少数固定设备使用的情况。

下面以 Ubuntu 服务器为例，内网地址规划为：服务器 `10.8.0.1`，电脑 `10.8.0.2`，手机 `10.8.0.3`。

**1. 安装 WireGuard 并生成密钥（服务器上）**

```bash
apt update && apt install -y wireguard qrencode
cd /etc/wireguard && umask 077
wg genkey | tee server.key | wg pubkey > server.pub
wg genkey | tee laptop.key | wg pubkey > laptop.pub   # 每台设备一对
wg genkey | tee phone.key  | wg pubkey > phone.pub
```

**2. 服务器配置 `/etc/wireguard/wg0.conf`**

```ini
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <server.key 的内容>

[Peer]  # 电脑
PublicKey = <laptop.pub 的内容>
AllowedIPs = 10.8.0.2/32

[Peer]  # 手机
PublicKey = <phone.pub 的内容>
AllowedIPs = 10.8.0.3/32
```

```bash
systemctl enable --now wg-quick@wg0
```

**3. 客户端配置**

以电脑为例，保存为 `laptop.conf`；手机同理，地址改为 `10.8.0.3`。

```ini
[Interface]
PrivateKey = <laptop.key 的内容>
Address = 10.8.0.2/32

[Peer]
PublicKey = <server.pub 的内容>
Endpoint = <服务器公网 IP>:51820
AllowedIPs = 10.8.0.1/32
PersistentKeepalive = 25
```

`AllowedIPs = 10.8.0.1/32` 表示只有访问服务器的流量走隧道，其他上网流量不受影响。

- 电脑：安装官方 WireGuard 客户端，导入 `laptop.conf`
- 手机：安装 WireGuard App，在服务器上运行 `qrencode -t ansiutf8 < phone.conf` 后扫码导入
- 导入后，服务器上可删除客户端的 `.key` 文件和 `.conf` 文件

**4. 让 Docker 在 WireGuard 之后启动**

软件绑定在 `10.8.0.1` 上，如果服务器重启时 Docker 先于 WireGuard 启动，会因地址不存在而启动失败：

```bash
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/after-wireguard.conf <<'CONF'
[Unit]
Wants=wg-quick@wg0.service
After=wg-quick@wg0.service
CONF
systemctl daemon-reload
```

**5. 防火墙：只开放 SSH 和 WireGuard**

```bash
ufw allow 22/tcp
ufw allow 51820/udp
ufw enable
```

> ⚠️ Docker 发布的端口会绕过 UFW。因此 `docker-compose.wireguard.yml` 把端口绑定在 `10.8.0.1` 上，**不要改成 `"80:3000"`**，否则网站仍会暴露在公网。

**6. 启动**

```bash
cp .env.example .env
nano .env   # 填写 APP_PASSWORD（仍建议设置），WG_BIND_IP 保持 10.8.0.1
docker compose -f docker-compose.wireguard.yml up -d --build
```

设备连上 WireGuard 后，浏览器访问 `http://10.8.0.1`。断开 WireGuard 时应无法访问，可以用来验证配置正确。

- 更新代码：`git pull && docker compose -f docker-compose.wireguard.yml up -d --build`
- 添加新设备：生成新密钥，在 `wg0.conf` 中加一个 `[Peer]`（如 `10.8.0.4/32`），然后 `systemctl restart wg-quick@wg0`
- 从其他方案切换过来：先对原来的 compose 文件执行 `down`，数据卷会保留
- 进一步加固：确认 WireGuard 稳定可用后，可以让 SSH 也只允许从 `10.8.0.0/24` 连接（改之前确保服务商的网页控制台可用，以免把自己锁在外面）
- 想省去手动管理密钥，可以改用基于 WireGuard 的 [Tailscale](https://tailscale.com/)，同样只需把端口绑定到服务器的 Tailscale 地址

## 数据备份

在「数据」页面可以下载数据备份（JSON）。**JSON 备份不包含图片文件**，图片保存在 `DATA_DIR/images/` 目录中。完整备份请直接复制整个数据目录，例如 Docker 部署时：

```bash
docker compose cp inventory:/app/data ./backup-$(date +%F)
```

## 适用范围

本项目定位为小团队 / 个人使用的轻量工具：所有人共用一个密码，数据全部在内存中处理，适合几万条记录以内的规模。如需多用户权限、审批流程等功能，可在此基础上扩展。

## 许可证

[MIT](LICENSE)：可自由使用、修改和分发，保留版权声明即可。
