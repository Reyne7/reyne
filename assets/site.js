(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------- 主题：导航开关和台灯都能切 ---------- */
  var mq = matchMedia('(prefers-color-scheme: dark)');
  function isDark() { return root.dataset.theme ? root.dataset.theme === 'dark' : mq.matches; }
  function syncTheme() { root.classList.toggle('is-dark', isDark()); }
  function toggleTheme() {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    syncTheme();
  }
  syncTheme();
  if (mq.addEventListener) mq.addEventListener('change', syncTheme);
  $('.theme').addEventListener('click', toggleTheme);

  /* ---------- 首屏：周期线 + 你在这里 ---------- */
  var PHASES = [
    ['复苏', '经济回暖，通胀还低，企业盈利开始改善。'],
    ['过热', '增长很快，通胀开始抬头，央行准备加息。'],
    ['滞胀', '增长放缓，物价还在涨，是最难受的阶段。'],
    ['衰退', '需求萎缩，通胀回落，央行开始降息。']
  ];
  var heroSvg = $('#hero-svg'), nameBox = $('#hero-name'), here = $('#here'), note = $('#phase-note');
  var labels = $$('.phase', nameBox);
  var HOME_T = 0.12; // 默认停在复苏往上走的位置
  // 标签放在周期线旁边：上升段在左上，波峰在上，下降段在右上，波谷在下
  var OFF = [[-30, -26], [0, -34], [30, -26], [0, 26]];
  function pct(p) { return [p[0] / 10, p[1] / 3.9]; }
  function placeHere(t) {
    var u = Math.max(0, Math.min(1, Draw.phaseU(t)));
    var q = pct(Draw.cyclePoint(u));
    here.style.left = q[0] + '%'; here.style.top = q[1] + '%';
    var tt = 0.18 * -1 + (0.86 + 0.18) * u;
    var idx = ((Math.round(tt / 0.25) % 4) + 4) % 4;
    labels.forEach(function (l, i) { l.classList.toggle('on', i === idx); });
    if (note.dataset.idx !== String(idx)) {
      note.dataset.idx = idx;
      note.querySelector('b').textContent = PHASES[idx][0];
      note.querySelector('span').textContent = PHASES[idx][1];
    }
  }
  function initHero() {
    Draw.heroCycle(heroSvg);
    labels.forEach(function (l, i) {
      var p = Draw.cyclePoint(Draw.phaseU(i * 0.25)), q = pct([p[0] + OFF[i][0], p[1] + OFF[i][1]]);
      l.style.left = q[0] + '%'; l.style.top = q[1] + '%'; l.style.transform = 'translate(-50%,-50%)';
    });
    placeHere(HOME_T);
    var hero = $('.hero');
    var follow = function (e) {
      var r = nameBox.getBoundingClientRect();
      var u = (e.clientX - r.left) / r.width;
      placeHere(-0.18 + 1.04 * Math.max(0, Math.min(1, u)));
    };
    hero.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons) follow(e); });
    nameBox.addEventListener('pointerdown', follow);
    hero.addEventListener('pointerleave', function () { placeHere(HOME_T); });
    requestAnimationFrame(function () { requestAnimationFrame(function () { nameBox.classList.add('drawn'); }); });
  }

  /* ---------- About：书桌 ---------- */
  function initDesk() {
    var svg = $('#desk');
    Draw.desk(svg);
    var lamp = $('.lamp', svg);
    lamp.addEventListener('click', toggleTheme);
    lamp.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); } });
    var map = { cycle: 'w-cycle', sql: 'w-sql', ai: 'w-ai', en: 'w-en' };
    $$('.book', svg).forEach(function (b) {
      var go = function () { scrollToPlate(map[b.getAttribute('data-target')]); };
      b.addEventListener('click', go);
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }

  /* ---------- 作品：画板、数量、筛选、横向滚动 ---------- */
  var pin = $('#pin'), sticky = $('.sticky', pin), strip = $('#strip'), bar = $('#prog-bar');
  var plates = $$('.plate[data-cat]', strip), pinned = false, extra = 0;
  function initWork() {
    plates.forEach(function (p) {
      var svg = $('svg', p), art = p.getAttribute('data-art');
      svg.id = 'art-' + art;
      if (Draw.ART[art]) Draw.ART[art](Draw.Pen(svg));
      $('.art', p).setAttribute('data-art', art);
    });
    $('#count').textContent = pad(plates.length);
    var cats = [['all', '全部'], ['risk', 'AI × 风控'], ['video', '视频'], ['post', '图文'], ['anim', '动画']];
    var box = $('#filters'), hint = $('.hint', box);
    cats.forEach(function (c) {
      var n = c[0] === 'all' ? plates.length : plates.filter(function (p) { return p.dataset.cat === c[0]; }).length;
      if (!n) return;
      var b = document.createElement('button');
      b.type = 'button'; b.dataset.cat = c[0]; b.setAttribute('aria-pressed', c[0] === 'all');
      b.innerHTML = c[1] + '<sup>' + pad(n) + '</sup>';
      box.insertBefore(b, hint);
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      var cat = b.dataset.cat;
      plates.forEach(function (p) { p.hidden = cat !== 'all' && p.dataset.cat !== cat; });
      $('#next-plate').hidden = cat !== 'all';
      number(); layoutPin();
      var top = pin.getBoundingClientRect().top + scrollY - parseInt(getComputedStyle(root).getPropertyValue('--nav'));
      if (pinned && scrollY > top) scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
      sticky.scrollLeft = 0;
    });
    number();
    sticky.addEventListener('scroll', onScroll, { passive: true });
  }
  function number() {
    var vis = plates.filter(function (p) { return !p.hidden; });
    vis.forEach(function (p, i) { $('.no', p).textContent = pad(i + 1) + ' / ' + pad(vis.length); });
    $('#prog-end').textContent = pad(vis.length);
  }
  function navH() { return $('.nav').offsetHeight; }
  // 宽屏：这一段钉住，竖向滚动变成横向移动
  function layoutPin() {
    pinned = innerWidth > 900;
    if (!pinned) { pin.style.height = ''; sticky.style.cssText = ''; strip.style.transform = ''; return; }
    sticky.style.position = 'sticky';
    sticky.style.top = navH() + 'px';
    sticky.style.minHeight = 'calc(100vh - ' + navH() + 'px)';
    sticky.style.display = 'flex'; sticky.style.flexDirection = 'column'; sticky.style.justifyContent = 'center';
    extra = Math.max(0, strip.scrollWidth - innerWidth);
    pin.style.height = (sticky.offsetHeight + extra) + 'px';
    onScroll();
  }
  function scrollToPlate(id) {
    var p = document.getElementById(id); if (!p) return;
    if (p.hidden) $('#filters button[data-cat="all"]').click();
    if (pinned) {
      var off = Math.min(extra, p.offsetLeft - strip.offsetLeft - 28);
      var top = pin.getBoundingClientRect().top + scrollY - navH() + Math.max(0, off) + 2;
      scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    } else {
      $('#work').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      sticky.scrollTo({ left: p.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /* ---------- 博客：读取构建生成的 posts.json ---------- */
  var CATS = ['周期', '金融科技', 'AI'];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function initPosts() {
    Draw.ART.note(Draw.Pen($('#empty-art')));
    fetch('posts.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (posts) {
      if (!posts || !posts.length) return;
      var box = $('#posts'), filters = $('#post-filters');
      var render = function (cat) {
        var list = posts.filter(function (p) { return cat === 'all' || p.category === cat; });
        var f = list[0], rest = list.slice(1, 4);
        if (!f) { box.innerHTML = ''; return; }
        box.innerHTML = '<div class="posts-grid"><a class="feat" href="' + esc(f.url) + '">' +
          (f.cover ? '<div class="art"><img src="' + esc(f.cover) + '" alt="" style="width:100%;height:100%;object-fit:cover"></div>' : '') +
          '<div class="m"><span><b>' + esc(f.category) + '</b></span><span>' + esc(f.date) + '</span><span>约 ' + f.minutes + ' 分钟</span></div>' +
          '<h3>' + esc(f.title) + '</h3><p>' + esc(f.summary || '') + '</p><span class="go">读全文 →</span></a>' +
          '<div><div class="post-list">' + rest.map(function (p) {
            return '<a class="post" href="' + esc(p.url) + '"><div><div class="m"><span><b>' + esc(p.category) + '</b></span><span>' + esc(p.date) + '</span></div><h4><span>' + esc(p.title) + '</span></h4></div><span class="rt">' + p.minutes + ' min</span></a>';
          }).join('') + '</div><div class="more"><span>全部 ' + posts.length + ' 篇 · 按分类归档</span><a href="blog/">进入博客 →</a></div></div></div>';
      };
      ['all'].concat(CATS).forEach(function (c) {
        if (c !== 'all' && !posts.some(function (p) { return p.category === c; })) return;
        var b = document.createElement('button'); b.type = 'button'; b.textContent = c === 'all' ? '全部' : c;
        b.setAttribute('aria-pressed', c === 'all');
        b.addEventListener('click', function () { $$('button', filters).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); render(c); });
        filters.appendChild(b);
      });
      render('all');
    });
  }

  /* ---------- 联系：纸飞机 ---------- */
  var hi = $('#hi'), hiSvg = $('#hi-svg'), hiEnd = $('#hi-end');
  function drawPlane() {
    var box = hi.getBoundingClientRect(), e = hiEnd.getBoundingClientRect();
    var fs = parseFloat(getComputedStyle($('h2', hi)).fontSize);
    var left = -box.left;
    hiSvg.setAttribute('width', box.width - left);
    hiSvg.setAttribute('height', box.height);
    hiSvg.style.left = left + 'px';
    hiSvg.setAttribute('viewBox', '0 0 ' + (box.width - left) + ' ' + box.height);
    Draw.plane(hiSvg, box.width - left, e.left - box.left - left + fs * .1, fs * .5, fs * .08);
  }
  function initContact() {
    drawPlane();
    $$('#links a').forEach(function (a, i) {
      a.addEventListener('pointerenter', function () { var t = $('.plane-tilt', hiSvg); if (t) t.style.transform = 'rotate(' + (8 + i * 9) + 'deg) scale(1.4)'; });
      a.addEventListener('pointerleave', function () { var t = $('.plane-tilt', hiSvg); if (t) t.style.transform = ''; });
    });
  }

  /* ---------- 导航进度、当前板块、淡入 ---------- */
  var navLinks = $$('.nav ul a');
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    $('.nav').style.setProperty('--p', max > 0 ? scrollY / max : 0);
    var cur = null;
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = a; });
    navLinks.forEach(function (a) { a.classList.toggle('on', a === cur); });
    var w;
    if (pinned && extra > 0) {
      var p = Math.max(0, Math.min(1, (navH() - pin.getBoundingClientRect().top) / extra));
      strip.style.transform = 'translate3d(' + (-p * extra) + 'px,0,0)';
      w = p;
    } else {
      var m = sticky.scrollWidth - sticky.clientWidth; w = m > 0 ? sticky.scrollLeft / m : 1;
    }
    bar.style.setProperty('--w', Math.max(.12, w));
  }
  function initReveal() {
    var io = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target === hi ? 'drawn' : 'in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('#about .wrap, #writing .wrap, .contact-row').forEach(function (el) { el.classList.add('reveal'); io ? io.observe(el) : el.classList.add('in'); });
    io ? io.observe(hi) : hi.classList.add('drawn');
  }

  function start() {
    initHero(); initDesk(); initWork(); initPosts(); initContact(); initReveal();
    layoutPin(); onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { layoutPin(); drawPlane(); }, 150); });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
})();
