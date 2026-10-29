# Reyne

个人网站：AI × 金融科技 · build in public。和作品集 `reyne7.github.io` 分开维护。

## 目录

```
index.html        首页（首屏 / About / 作品 / 博客 / 联系）
assets/
  site.css        样式（浅色 / 深色）
  site.js         交互：周期线、台灯切换主题、作品横向滚动与筛选、博客列表、纸飞机
  draw.js         所有手绘插画（rough.js 画成 SVG）
  rough.js        第三方库 rough.js 4.6.6（MIT）
posts/            博客文章（Markdown）
build.js          构建：生成 dist/、博客页和 posts.json
vercel.json       Vercel 部署配置
```

## 常改的地方

- **Now building**：`index.html` 里搜 `Now building`，改日期和那一句话。
- **加作品**：`index.html` 里复制一个 `.plate`，填 `data-cat`（`risk` / `video` / `post` / `anim`）和 `data-art`（画哪张图，见 `assets/draw.js` 的 `ART`）。数量、编号、筛选会自动更新。
- **写文章**：复制 `posts/_template.md`，改文件名和开头的 `title / date / category / summary`，`category` 只能是 周期、金融科技、AI。推送后自动出现在首页和 `/blog/`。

## 本地预览

```bash
npm install
npm run dev
```

然后打开 <http://localhost:8000/>。

## 部署

**现在：GitHub Pages**（https://reyne7.github.io/reyne/）。推送到 `main` 后由 `.github/workflows/pages.yml` 自动构建部署（构建时 `BASE_PATH=/reyne`）。仓库 Settings → Pages 的 Source 需要选 **GitHub Actions**。

**以后：Vercel**


1. 用 GitHub 登录 <https://vercel.com>，Add New → Project，选 `Reyne7/reyne`；
2. 不用改任何设置（`vercel.json` 已写好构建命令和输出目录），点 Deploy；
3. 之后每次推送到 `main` 自动重新部署；其他分支会生成单独的预览地址。
