# 📦 Dante Inventory

**English** · [中文](README.zh-CN.md)

Dante Inventory is a web-based inventory and invoicing system: **a single-page HTML frontend + a zero-dependency Node.js backend**, with all data stored in one JSON file. No database and no `npm install` needed — copy it to a server and run. The UI can be switched between Chinese and English.

## Features

- **Items**: name, SKU, category, unit, location, cost price, default selling price, GST-free flag, low-stock alert, product photos (up to 10 per item, compressed in the browser)
- **Sales invoices (Australian Tax Invoice format)**
  - Header with logo, company name, **ABN**, address, phone and email; automatically becomes “INVOICE” when not registered for GST
  - Edit price and discount % per line, choose **GST** per line (10% by default), GST-free items marked with “*”; prices can be entered GST-inclusive or GST-exclusive
  - Invoice Number / Invoice Date / **Due Date** / Reference (customer PO number), dates in DD/MM/YYYY
  - **How to Pay** footer: bank, account name, **BSB**, account number, PayID; the invoice number is the payment reference
  - Stock is deducted when an invoice is issued (the whole invoice is rejected if stock is short); cost, gross profit and margin are calculated automatically (internal only, never printed)
  - **Print / save as PDF** (browser print → “Save as PDF”; the file name is the invoice number)
  - PAID stamp when fully paid; VOID stamp when voided, with stock returned
- **Customers and receivables**
  - Customer details: contact, ABN, phone, email, address, individual payment terms (e.g. 30 days, 14 days by default)
  - Record payments (partial payments and multiple payment methods supported); outstanding balance calculated automatically
  - Receivables ageing: not yet due / overdue 1-30 / 31-60 / 61-90 / 90+ days
  - Printable **Statement** for each customer (open invoices + ageing + payment details)
- **Purchases and suppliers**
  - Supplier details; purchase receipts record the supplier, supplier invoice number, unit cost per line (ex GST) and GST
  - Receiving adds stock and updates the cost price by **weighted average** / latest cost / no update
  - New items can be created while entering a purchase; purchases can be printed; voiding a purchase deducts the stock again
- **Dashboard**: sales and gross profit this month, receivables and overdue amount, purchases this month, stock value at cost, low stock (one-click reorder), overdue invoices
- **Stock movements**: every stock in / out / stocktake is logged and links to the related invoice or purchase
- **Scan documents into purchases and sales invoices**: upload a photo, scan, PDF, Excel (.xlsx / .xls) or CSV of a supplier invoice / delivery docket, or of a customer order, and the item lines (code, description, quantity, price) are filled into a new purchase or sales invoice for you to check before saving
  - Free on-device OCR (English) runs in the browser, so the server does no extra work; digital PDFs and spreadsheets are read directly without OCR
  - Spreadsheets in any layout: columns are recognised by their headers (Code / SKU, Description, Qty, Unit Price, Disc %, Amount… in English or Chinese), so every supplier's or customer's format becomes the same item lines
  - Optional AI recognition through any OpenAI-compatible API (DeepSeek, OpenAI, Gemini, Qwen, Ollama…), set up in Settings
  - Finds the supplier / customer by ABN or name, matches items by SKU or name, converts prices between GST-inclusive and ex GST, highlights lines where quantity × price doesn't match the amount, and remembers each supplier's and customer's codes for next time
- **eBay orders → daily dispatch list**: pull the day's eBay orders straight from your eBay account, match each line to an item, print a dispatch list (pick list + ship-to addresses) and record it in one step: stock is deducted and the day's sales go into one paid invoice
- **Bulk item import**: upload a CSV or paste straight from Excel and preview row-by-row validation before importing; existing items (matched by SKU, or by name when there is no SKU) can be skipped or updated, and stock can be set to the quantities in the sheet
- **CSV export** (items, invoice summary, invoice lines, purchase lines, stock movements), **JSON backup and restore**
- **Password protection**: login is required once `APP_PASSWORD` is set
- Works in mobile browsers and follows dark mode automatically
- Switch between Chinese / English at the top; the choice is saved in the browser, and CSV headers are in English when the English UI is used

> On first use, go to **Settings** and fill in your company name, ABN, address and bank details — they appear on your invoices.
>
> Note: this system follows the ATO's common requirements for tax invoices (seller identity and ABN, issue date, item description, quantity and price, GST amount, GST-free items marked; buyer name or ABN for invoices of $1,000 or more), but it is not tax advice. Please consult your accountant if in doubt.

## Changelog

Versions use the format `major.feature.fix`: bump the second number for new features and the third number for bug fixes only. Every update changes `version` in `package.json` and adds a section with the same version to both `README.md` (English) and `README.zh-CN.md` (Chinese), in the same order; after merging into main, a GitHub release with that version is published automatically (Releases page), with the English and Chinese notes.

### v1.5.0 (2026-10-10)

- The README is split into two pages: this English page (`README.md`) and the Chinese page (`README.zh-CN.md`). Each links to the other at the top, just like the language switch in the app. Both pages have the same content and changelog.
- GitHub release notes now include the English section followed by the Chinese section.

### v1.4.0 (2026-10-07)

- eBay orders → daily dispatch list: on the Sales invoices page, “🛒 eBay dispatch” pulls the eBay orders placed on a chosen day (today by default) through the eBay Sell Fulfillment API, showing order number, time, ship-to address, buyer note, items and amounts, plus shipped / cancelled / unpaid / cancellation-requested status.
- Each eBay line is matched to an item by the listing chosen last time, then by SKU (the eBay Custom label), then by an identical name. Unmatched lines can be matched by hand (other lines of the same listing follow) or created as a new item in one click; the choice is remembered per listing and variation.
- Print dispatch list: a pick list (the same item merged across orders, sorted by location) and every order's ship-to name, address, phone, postage service, items and buyer note, with tick boxes for picking and packing. It can be printed before recording, and is kept with the invoice afterwards (“View dispatch list”).
- Record dispatch and deduct stock: the selected orders become one sales invoice to the customer “eBay” (created automatically), GST-inclusive like eBay prices, with promotion discounts as a line discount %, the payment recorded as eBay, and stock deducted. Lines shipped overseas are GST-free exports. The orders are re-read from eBay when recording; orders already recorded, cancelled or unpaid are refused, and stock shortages are shown before recording.
- To undo, delete the eBay payment and void the invoice: stock returns and the orders can be recorded again. The invoices list can be searched by eBay order number.
- Setup in Settings → eBay store: App ID, Cert ID and RuName from developer.ebay.com, then “Connect eBay account” (if the redirect page can't be opened, paste its address instead). Only read access to orders is requested; the access token renews itself, and the Cert ID and tokens stay on the server and are left out of downloaded backups.
- Postage is shown in the dialog and on the dispatch list but not added to the invoice, which only records the item lines that move stock.

### v1.3.0 (2026-10-07)

- Scan supplier invoices: on the Purchases page, use “📷 Scan supplier invoice” (also inside a new purchase) to choose photos, scans, PDFs, Excel or CSV files. The recognised lines are filled into the purchase; nothing changes stock until you click Receive stock.
- Scan customer orders into sales invoices: on the Sales invoices page, use “📷 Scan order to invoice” (or “📷 Scan document” inside a new invoice) for a customer's purchase order, order list or delivery docket. The customer is found by ABN or name, the customer's PO number goes into Reference, document prices are converted to the invoice's GST mode, and lines without a price use the item's default sale price.
- Excel (.xlsx / .xls / .ods) and CSV files: columns are recognised by their headers in English or Chinese, whatever their order, so different suppliers' and customers' layouts become the same item lines; GST-inclusive price columns and percentage discounts are handled. Sheets without a recognisable header fall back to the quantity × price rule. Excel files are read with SheetJS, downloaded from cdn.sheetjs.com on first use.
- Free on-device recognition: photos and scanned PDFs are read with English OCR in the browser (Tesseract.js); digital PDFs are read directly (pdf.js). Before OCR, shadows in phone photos are evened out and table border lines are erased, since digits touching the lines are otherwise misread. The engine (about 5 MB) is downloaded from the jsDelivr CDN on first use and then cached by the browser.
- Item lines are found by checking quantity × unit price (less any discount %) against the line amount, so no per-supplier templates are needed. The same check repairs a “$” misread as 5 or 8 (e.g. 50.75 → 0.75) only when the corrected numbers add up; lines that still don't add up are highlighted in red, and the total is compared with the invoice subtotal / total.
- The supplier is found by ABN (or name), the supplier invoice number is filled in, GST-inclusive prices are converted to ex GST, and unmatched lines can be created as new items, or the supplier / customer added, in one click. Item choices are remembered by each supplier's and customer's code and description, so their next document matches automatically even if one of them is misread.
- Optional AI recognition (Settings → AI document recognition): works with any OpenAI-compatible API. Text-only models such as DeepSeek receive the OCR text, which costs very little; models that can read images receive the photos. The AI returns both seller and buyer, and the other party (never your own business) is used. The API key stays on the server and is not included in downloaded backups.
- The recognised lines can be downloaded as a CSV.

### v1.2.1 (2026-10-01)

- The project description in `package.json` and the whole README are now bilingual, English first and then Chinese.

### v1.2.0 (2026-09-30)

- Bulk item import: upload a CSV or paste from Excel, with a row-by-row validation preview before importing; existing items can be skipped or updated, and stock can be set to the quantities in the sheet.
- The import dialog offers a blank template and a sample file to download, with format notes.
- Bulk import supports the English UI: instructions, preview, messages and the template / sample files are all available in English; the item list exported from the English UI can be imported again directly.

### v1.1.0 (2026-09-30)

- Added a Chinese / English UI: switch language on the login page or at the top of the app, and the browser remembers the choice; notifications, dialogs, printed documents and CSV headers follow the language.
- The software is consistently named “但丁进销存” (Dante Inventory): login page, app header, browser title, project description and startup log all use the same name.
- Fixed missing translations in the English UI: the reorder button on the dashboard, units on documents, the void purchase explanation, the “Opening stock” movement note and server-side validation messages.
- The page still opens when the browser blocks local storage (defaults to Chinese).

### v1.0.0 (2026-09-29)

- First release: items and product photos, Australian-format sales invoices (GST), customers and receivables, purchases and suppliers, stock movements, CSV export and JSON backup, password protection.
- Deployment options: Docker, HTTPS (Caddy), WireGuard-only access.

## eBay orders

**One-time setup**

1. Sign in at [developer.ebay.com](https://developer.ebay.com) with the eBay account that sells, and create a **Production** keyset under **Application Keys**: note the **App ID (Client ID)** and **Cert ID (Client Secret)**.
2. Open **User Tokens** → **Get a Token from eBay via Your Application** → **Add eBay Redirect URL**. This creates a **RuName**. Set its **auth accepted URL** to `https://your-domain/api/ebay/callback` (the exact address is shown in Settings) and save.
3. In this system, open **Settings → eBay store**, fill in the App ID, Cert ID and RuName, click **Connect eBay account**, sign in to eBay and agree. You come back to Settings showing “Connected”.
   - If the page eBay sends you back to can't be opened (for example the system is only reachable on a private network), copy the full address from the browser's address bar and paste it under “Page won't load after authorising?”.

**Every day**

1. **Sales invoices → 🛒 eBay dispatch**: today's orders load automatically (pick another date to fetch that day).
2. Check that every line has an item, then **Print dispatch list** for picking and packing.
3. **Record dispatch and deduct stock**: one paid invoice to “eBay” is created and stock is deducted. Fetching again later in the day shows recorded orders greyed out, so only new orders are recorded.

> The connection only reads orders; it doesn't mark them shipped or change anything on eBay. The authorisation lasts about 18 months (the expiry date is shown in Settings); reconnect when it expires.

## Scanning documents

1. **Purchases**: click **📷 Scan supplier invoice**. **Sales invoices**: click **📷 Scan order to invoice**. Then take a photo or choose a photo / scan / PDF / Excel / CSV file (select several files for a multi-page document).
2. Check each line: red lines don't add up, and lines without an item can be matched to an existing item or created as a new item. Then click **Receive stock** or **Create invoice**.
3. Tips for photos: lay the document flat, fill the frame, avoid strong shadows and keep it upright. Spreadsheets need a header row (e.g. Code, Description, Qty, Unit Price, Amount) for the most reliable result.

**AI recognition (optional).** In **Settings → AI document recognition**, enter any OpenAI-compatible API. For example, DeepSeek: base URL `https://api.deepseek.com`, model `deepseek-chat`, plus your API key, with “can read images” unticked. The photo is turned into text in the browser first and only the text is sent to the AI. For models that accept images (GPT-4o, Gemini, Qwen-VL…), tick “can read images” to send the photos directly. Invoice contents are sent to the provider you choose; clear the base URL to turn AI recognition off.

> On-device recognition needs the browser to reach `cdn.jsdelivr.net` (and `cdn.sheetjs.com` for Excel files) the first time it is used.

## Run locally

Requires Node.js 18 or later.

```bash
APP_PASSWORD=your-password node server.js
# Open http://localhost:3000
```

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `APP_PASSWORD` | Access password. **Required for public deployments** | Empty (no password) |
| `PORT` | Listening port | `3000` |
| `DATA_DIR` | Data directory (stores `db.json`) | `./data` |
| `SESSION_SECRET` | Signing key for the login cookie, optional | Derived from the password |

## Deploying to the internet

> ⚠️ Data is stored in `DATA_DIR/db.json`. Your hosting platform must provide a **persistent disk**, or data will be lost on restart.

### Option 1: Cloud server + Docker (recommended, most stable)

Works on Alibaba Cloud / Tencent Cloud / Huawei Cloud lightweight servers, or any overseas VPS (a few dollars a month is enough).

```bash
# 1. Install Docker on the server (Ubuntu example)
curl -fsSL https://get.docker.com | sh

# 2. Get the code
git clone https://github.com/dantelin000/inventory.git
cd inventory

# 3. Change APP_PASSWORD in docker-compose.yml, then start
docker compose up -d --build
```

Then open port 80 in your cloud provider's **security group / firewall** and visit `http://<server public IP>` in a browser.

- Update code: `git pull && docker compose up -d --build`
- Data is kept in the Docker volume `inventory-data` and survives updates

**Without Docker**: install Node.js on the server and run `APP_PASSWORD=your-password PORT=80 node server.js`, keeping it running in the background with `pm2` or `systemd`.

### Option 2: Render / Railway / Fly.io and other hosting platforms

- **Render**: the repo already contains `render.yaml`. In the Render dashboard choose *New → Blueprint*, select this repo and fill in `APP_PASSWORD`. A persistent disk requires a paid instance (Starter).
- **Railway / Fly.io**: the `Dockerfile` is detected automatically. Add a volume mounted at `/app/data` and set the `APP_PASSWORD` environment variable.

### Custom domain and HTTPS (recommended)

HTTPS is strongly recommended for public use so the password is never sent in plain text. Hosting platforms (Render / Railway / Fly.io) provide HTTPS by default; on your own server use `docker-compose.https.yml` from the repo, which puts [Caddy](https://caddyserver.com/) in front and obtains and renews free certificates automatically.

1. Get a domain and add an **A record** at your DNS provider pointing to the server's public IP (e.g. `inventory.yourdomain.com.au`)
2. Open ports **80 and 443** in the server firewall / security group (80 is needed to obtain the certificate)
3. Create `.env` in the project directory:

   ```bash
   cp .env.example .env
   nano .env   # Fill in DOMAIN and APP_PASSWORD
   ```

4. Start (if you previously ran `docker-compose.yml`, run `docker compose down` first — the data volume is kept):

   ```bash
   docker compose -f docker-compose.https.yml up -d --build
   ```

After a few seconds visit `https://yourdomain`; HTTP redirects to HTTPS automatically. Under HTTPS the login cookie gets the `Secure` flag automatically.

- Update code: `git pull && docker compose -f docker-compose.https.yml up -d --build`
- Certificate logs: `docker compose -f docker-compose.https.yml logs caddy`
- Note: servers in mainland China need ICP filing before a domain can be bound; overseas servers such as in Australia do not.

### Option 3: WireGuard-only private access (optional, most secure)

The site is not exposed to the internet; only devices connected through [WireGuard](https://www.wireguard.com/) can reach it. Only one UDP port is open publicly, so scanners cannot see the site, and the WireGuard tunnel is already encrypted, so **no domain or HTTPS is needed**. The trade-off is that every device needs the WireGuard client installed. Best when only you and a few fixed devices use it.

The example below uses an Ubuntu server with these private addresses: server `10.8.0.1`, laptop `10.8.0.2`, phone `10.8.0.3`.

**1. Install WireGuard and generate keys (on the server)**

```bash
apt update && apt install -y wireguard qrencode
cd /etc/wireguard && umask 077
wg genkey | tee server.key | wg pubkey > server.pub
wg genkey | tee laptop.key | wg pubkey > laptop.pub   # One key pair per device
wg genkey | tee phone.key  | wg pubkey > phone.pub
```

**2. Server config `/etc/wireguard/wg0.conf`**

```ini
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <contents of server.key>

[Peer]  # Laptop
PublicKey = <contents of laptop.pub>
AllowedIPs = 10.8.0.2/32

[Peer]  # Phone
PublicKey = <contents of phone.pub>
AllowedIPs = 10.8.0.3/32
```

```bash
systemctl enable --now wg-quick@wg0
```

**3. Client config**

Using the laptop as an example, save as `laptop.conf`; the phone is the same with address `10.8.0.3`.

```ini
[Interface]
PrivateKey = <contents of laptop.key>
Address = 10.8.0.2/32

[Peer]
PublicKey = <contents of server.pub>
Endpoint = <server public IP>:51820
AllowedIPs = 10.8.0.1/32
PersistentKeepalive = 25
```

`AllowedIPs = 10.8.0.1/32` means only traffic to the server goes through the tunnel; the rest of your internet traffic is unaffected.

- Laptop: install the official WireGuard client and import `laptop.conf`
- Phone: install the WireGuard app, run `qrencode -t ansiutf8 < phone.conf` on the server and scan the QR code
- After importing, the client `.key` and `.conf` files can be deleted from the server

**4. Start Docker after WireGuard**

The app binds to `10.8.0.1`. If Docker starts before WireGuard when the server reboots, it fails because the address does not exist yet:

```bash
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/after-wireguard.conf <<'CONF'
[Unit]
Wants=wg-quick@wg0.service
After=wg-quick@wg0.service
CONF
systemctl daemon-reload
```

**5. Firewall: allow only SSH and WireGuard**

```bash
ufw allow 22/tcp
ufw allow 51820/udp
ufw enable
```

> ⚠️ Ports published by Docker bypass UFW. That is why `docker-compose.wireguard.yml` binds the port to `10.8.0.1` — **do not change it to `"80:3000"`**, or the site will still be exposed to the internet.

**6. Start**

```bash
cp .env.example .env
nano .env   # Fill in APP_PASSWORD (still recommended), keep WG_BIND_IP as 10.8.0.1
docker compose -f docker-compose.wireguard.yml up -d --build
```

Once a device is connected to WireGuard, visit `http://10.8.0.1` in the browser. With WireGuard disconnected the site should be unreachable — a good way to check the setup.

- Update: `git pull && docker compose -f docker-compose.wireguard.yml up -d --build`
- Add a device: generate a new key pair, add a `[Peer]` to `wg0.conf` (e.g. `10.8.0.4/32`), then `systemctl restart wg-quick@wg0`
- Switching from another option: run `down` on the old compose file first; the data volume is kept
- Further hardening: once WireGuard is stable, you can allow SSH only from `10.8.0.0/24` (make sure your provider's web console works first so you don't lock yourself out)
- To skip managing keys by hand, use [Tailscale](https://tailscale.com/), which is built on WireGuard; just bind the port to the server's Tailscale address instead

## Data backup

You can download a data backup (JSON) on the **Data** page. **The JSON backup does not include image files**; images are stored in `DATA_DIR/images/`. For a full backup, copy the whole data directory, e.g. with Docker:

```bash
docker compose cp inventory:/app/data ./backup-$(date +%F)
```

## Scope

This project is a lightweight tool for small teams or individuals: everyone shares one password and all data is processed in memory, which suits up to tens of thousands of records. Multi-user permissions, approval workflows and similar features can be built on top of it.

## License

[MIT](LICENSE): free to use, modify and distribute, as long as the copyright notice is kept.
