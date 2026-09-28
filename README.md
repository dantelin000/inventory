# 📦 轻量库存管理

一个网页版库存管理系统：**单页 HTML 前端 + 零依赖 Node.js 后端**，数据存储在一个 JSON 文件中。不需要数据库，也不需要 `npm install`，拷到服务器上就能运行。

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
- **导出 CSV**（物品、发票汇总、发票明细、采购明细、库存流水）、**JSON 备份与恢复**
- **密码保护**：设置 `APP_PASSWORD` 后必须登录才能访问
- 支持手机浏览器，自动适配深色模式

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

公网使用时强烈建议开启 HTTPS，避免密码被明文传输：

- 托管平台（Render / Railway / Fly.io）默认自带 HTTPS。
- 自己的服务器可以在前面加一层 [Caddy](https://caddyserver.com/)，自动申请证书：

  ```
  # /etc/caddy/Caddyfile
  inventory.你的域名.com {
      reverse_proxy localhost:3000
  }
  ```

  此时把 `docker-compose.yml` 中的端口改为 `"127.0.0.1:3000:3000"`。
- 注意：中国大陆的服务器绑定域名需要先完成 ICP 备案。

## 数据备份

在「数据」页面可以下载数据备份（JSON）。**JSON 备份不包含图片文件**，图片保存在 `DATA_DIR/images/` 目录中。完整备份请直接复制整个数据目录，例如 Docker 部署时：

```bash
docker compose cp inventory:/app/data ./backup-$(date +%F)
```

## 适用范围

本项目定位为小团队 / 个人使用的轻量工具：所有人共用一个密码，数据全部在内存中处理，适合几万条记录以内的规模。如需多用户权限、审批流程等功能，可在此基础上扩展。
