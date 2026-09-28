# 📦 轻量库存管理

一个网页版库存管理系统：**单页 HTML 前端 + 零依赖 Node.js 后端**，数据存储在一个 JSON 文件中。不需要数据库，也不需要 `npm install`，拷到服务器上就能运行。

## 功能

- **物品管理**：名称、编码/SKU、分类、单位、库位、单价、最低库存、备注
- **入库 / 出库 / 盘点**：每次变动自动记录流水（变动前、变动后、备注）；出库时不允许库存变为负数
- **概览**：物品种类、库存总数、库存总金额、低库存预警
- **产品图片**：每个物品最多 10 张，可点击选择、拖拽或粘贴上传，手机可直接拍照；上传前在浏览器端自动压缩；点击缩略图可全屏浏览
- **搜索、按分类筛选、排序**，点击物品名称可查看该物品的全部历史
- **导出 CSV**（Excel 可直接打开）、**JSON 备份与恢复**
- **密码保护**：设置 `APP_PASSWORD` 后必须登录才能访问
- 支持手机浏览器，自动适配深色模式

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
