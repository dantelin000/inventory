# 但丁进销存

零依赖 Node.js 后端（`server.js`）+ 单页前端（`public/`）。界面文字写中文，英文翻译在 `public/i18n.js`（新增界面文字时要同时加英文）。

## 每次更新都要写版本号

- 改 `package.json` 的 `version`：加新功能升第二位（1.1.0 → 1.2.0），只修 bug 升第三位（1.2.0 → 1.2.1）。
- 在 README「更新记录」最上面加 `### vX.Y.Z（日期）` 段落，写清楚这次改了什么。
- PR 标题以版本号开头，如 `v1.2.0: 批量导入商品`。
- 合并进 main 后 `.github/workflows/release.yml` 会自动打 tag 并发布 Release。
