// 构建：把首页和静态文件复制到 dist/，把 posts/*.md 生成博客页和 posts.json。
// Vercel 每次部署都会跑 `npm run build`；本地预览用 `npm run dev`。
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const CATS = ['周期', '金融科技', 'AI'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(OUT, 'index.html'));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}：缺少开头的 --- 信息块`);
  const meta = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  for (const k of ['title', 'date', 'category']) if (!meta[k]) throw new Error(`${file}：缺少 ${k}`);
  if (!CATS.includes(meta.category)) throw new Error(`${file}：category 只能是 ${CATS.join(' / ')}`);
  const body = m[2];
  // 中文按每分钟约 400 字估算阅读时长
  const chars = body.replace(/[#>*`\[\]()!\-\s]/g, '').length;
  return { meta, body, minutes: Math.max(1, Math.round(chars / 400)) };
}

const postsDir = path.join(ROOT, 'posts');
const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter((f) => f.endsWith('.md') && !f.startsWith('_')) : [];
const posts = files.map((f) => {
  const { meta, body, minutes } = parse(path.join(postsDir, f));
  const slug = f.replace(/\.md$/, '');
  return {
    slug,
    title: meta.title,
    date: meta.date.replace(/-/g, '.'),
    sort: meta.date,
    category: meta.category,
    summary: meta.summary || '',
    cover: meta.cover ? `/blog/${slug}/${meta.cover.replace(/^images\//, 'images/')}` : '',
    minutes,
    url: `/blog/${slug}/`,
    html: marked.parse(body),
  };
}).sort((a, b) => (a.sort < b.sort ? 1 : -1));

const head = (title) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Noto+Serif+SC:wght@500&family=Noto+Sans+SC:wght@300;400;500&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="stylesheet" href="/assets/site.css"></head><body>
<nav class="nav"><div class="wide"><a href="/" class="logo">Reyne</a><ul><li><a href="/#work">作品</a></li><li><a href="/blog/">博客</a></li><li><a href="/#contact">联系</a></li></ul></div></nav>`;
const foot = `<footer><div class="wrap"><span>© 2026 Reyne · Built with AI, in public.</span><a class="top" href="#">回到顶部 <span>↑</span></a></div></footer></body></html>`;

// 文章页
for (const p of posts) {
  const dir = path.join(OUT, 'blog', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), `${head(p.title + ' · Reyne')}
<article class="article"><a class="back" href="/blog/">← 全部文章</a>
<div class="m"><span><b>${esc(p.category)}</b></span><span>${esc(p.date)}</span><span>约 ${p.minutes} 分钟</span></div>
<h1>${esc(p.title)}</h1><div class="prose">${p.html}</div></article>${foot}`);
}
// 文章里的图片
if (fs.existsSync(path.join(postsDir, 'images'))) {
  for (const p of posts) fs.cpSync(path.join(postsDir, 'images'), path.join(OUT, 'blog', p.slug, 'images'), { recursive: true });
}

// 博客列表页
const groups = CATS.map((c) => [c, posts.filter((p) => p.category === c)]).filter(([, l]) => l.length);
fs.mkdirSync(path.join(OUT, 'blog'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'blog', 'index.html'), `${head('博客 · Reyne')}
<section class="blog-head"><div class="wrap"><div class="eyebrow"><b>03</b><i></i>博客 / Writing</div><h2>Notes on <em>cycles</em></h2></div></section>
<section style="padding-bottom:120px"><div class="wrap">
${posts.length ? groups.map(([c, l]) => `<h3 style="font:500 13px Inter,sans-serif;letter-spacing:.2em;color:var(--accent);margin:48px 0 14px">${esc(c)} · ${l.length}</h3><div class="post-list">${l.map((p) => `<a class="post" href="${p.url}"><div><div class="m"><span>${esc(p.date)}</span></div><h4><span>${esc(p.title)}</span></h4></div><span class="rt">${p.minutes} min</span></a>`).join('')}</div>`).join('') : '<p class="empty" style="justify-content:flex-start">第一篇在写。写好一篇，这里就多一行。</p>'}
</div></section>${foot}`);

// 首页读取的列表（不含正文）
fs.writeFileSync(path.join(OUT, 'posts.json'), JSON.stringify(posts.map(({ html, sort, ...p }) => p), null, 1));
console.log(`built: ${posts.length} post(s) -> dist/`);
