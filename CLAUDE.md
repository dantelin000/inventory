# 但丁进销存

零依赖 Node.js 后端（`server.js`）+ 单页前端（`public/`）。界面文字写中文，英文翻译在 `public/i18n.js`（新增界面文字时要同时加英文）。

## 代码改动要写版本号

- 改代码（`server.js`、`public/`、Dockerfile 等）时，改 `package.json` 的 `version`：加新功能升第二位（1.1.0 → 1.2.0），只修 bug 升第三位（1.2.0 → 1.2.1）。
- 同时在 `README.md`（英文）和 `README.zh-CN.md`（中文）的「更新记录」最上面各加一段 `### vX.Y.Z（日期）`，写清楚这次改了什么，两个文件的版本顺序保持一致。
- PR 标题以版本号开头，如 `v1.2.0: Bulk item import / 批量导入商品`。
- 合并进 main 后 `.github/workflows/release.yml` 会自动打 tag 并发布 Release。
- 纯文档改动（`README*.md`、`doc/` 下的文件等）不升版本，也不加更新记录。

## 更新说明一律中英双语，英文在前

commit message、PR 标题和描述都要中英双语，先写英文、再写中文。README 不再混排：英文页 `README.md` 只写英文，中文页 `README.zh-CN.md` 只写中文，两页通过顶部链接互相切换，更新记录两页同步。

- README 更新记录：英文写进 `README.md`，中文写进 `README.zh-CN.md`，同一版本号、同样内容。
- commit 标题 / PR 标题：`vX.Y.Z: English summary / 中文摘要`。
- commit 正文 / PR 描述：先英文，`---` 分隔后写中文。
