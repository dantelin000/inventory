# 📦 但丁进销存

但丁进销存是一个网页版进销存系统：**单页 HTML 前端 + 零依赖 Node.js 后端**，数据存储在一个 JSON 文件中。不需要数据库，也不需要 `npm install`，拷到服务器上就能运行。

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
- **批量导入物品**：上传 CSV 或从 Excel 直接复制粘贴，导入前预览逐行校验结果；已存在的物品（按 SKU，无 SKU 按名称）可选择跳过或更新资料，并可按表格数量盘点库存
- **导出 CSV**（物品、发票汇总、发票明细、采购明细、库存流水）、**JSON 备份与恢复**
- **密码保护**：设置 `APP_PASSWORD` 后必须登录才能访问
- 支持手机浏览器，自动适配深色模式
- 顶部可切换中文 / English 界面；语言选择保存在当前浏览器中，英文界面下 CSV 表头也会使用英文

## 更新记录

版本号格式为 `主版本.功能版本.修复版本`：加新功能升第二位，只修 bug 升第三位。每次更新都要改 `package.json` 里的 `version`，并在下面加一段同版本号的说明；合并进 main 后会自动在 GitHub 发布同名版本（Releases 页面）。

### v1.1.0（2026-09-30）

- 增加中文 / English 可选界面：登录页与应用顶部可以切换语言，浏览器记住选择；通知、对话框、打印单据与 CSV 表头随语言切换。
- 软件统一命名为「但丁进销存」：登录页、应用顶部、浏览器标题、项目说明与启动日志使用同一名称。
- 修复英文界面遗漏的翻译：概览页补货按钮、单据中的单位、作废采购单说明、「初始库存」流水备注、服务端校验提示。
- 浏览器禁用本地存储时页面仍能正常打开（默认中文）。

### v1.0.0（2026-09-29）

- 首个版本：物品与产品图片、澳洲格式销售发票（GST）、客户与应收款、采购入库与供应商、库存流水、CSV 导出与 JSON 备份、密码保护。
- 部署方式：Docker、HTTPS（Caddy）、仅 WireGuard 访问。

> 首次使用请先到「设置」填写公司名称、ABN、地址和收款银行信息，这些会显示在发票上。
>
> 说明：本系统按 ATO 对 Tax Invoice 的常见要求设计（卖方身份与 ABN、开票日期、商品描述与数量价格、GST 金额、标明免税商品；金额 ≥ $1,000 时应填写买方名称或 ABN），但不构成税务建议，如有疑问请咨询会计师。

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

**3. 客户端配置**（以电脑为例，保存为 `laptop.conf`；手机同理，地址改为 `10.8.0.3`）

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
nano .env   # 填写 APP_PASSWORD（建议仍然设置），WG_BIND_IP 保持 10.8.0.1
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
