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

  /* ---------- 首屏：圆点沿实际产出曲线走，所在那一段变深 ---------- */
  var PHASES = [ // 按 Draw.phaseOf 的顺序：0 过热 1 滞胀 2 衰退 3 复苏
    ['过热', '产出高于趋势、还在往上，通胀开始抬头。'],
    ['滞胀', '产出见顶回落，物价却还在涨。'],
    ['衰退', '产出跌破趋势，需求萎缩，通胀回落。'],
    ['复苏', '产出还低于趋势，但已经开始回升。']
  ];
  var heroSvg = $('#hero-svg'), nameBox = $('#hero-name'), here = $('#here'), note = $('#phase-note');
  var segs = $$('.seg', nameBox), phaseBar;
  var HOME_S = 0.88; // 默认停在复苏：还低于趋势，但在往上走
  var curS = HOME_S, goalS = HOME_S, raf = 0;
  function setPhase(s) {
    var idx = Draw.phaseOf(s);
    segs.forEach(function (l) { l.classList.toggle('on', +l.dataset.phase === idx); });
    var a = Math.floor(s * 4) / 4;
    phaseBar.setAttribute('x', Draw.hx(a)); phaseBar.setAttribute('width', Draw.hx(a + .25) - Draw.hx(a));
    if (note.dataset.idx !== String(idx)) {
      note.dataset.idx = idx;
      note.querySelector('b').textContent = PHASES[idx][0];
      note.querySelector('span').textContent = PHASES[idx][1];
    }
  }
  function vy(y) { return (y - Draw.HC.top) / Draw.HC.h * 100 + '%'; }
  function drawHere(s) { here.style.left = Draw.hx(s) / 10 + '%'; here.style.top = vy(Draw.hy(s)); }
  function tick() {
    curS += (goalS - curS) * 0.14;
    if (Math.abs(goalS - curS) < 0.0005) curS = goalS;
    drawHere(curS);
    raf = curS === goalS ? 0 : requestAnimationFrame(tick);
  }
  function placeHere(s) {
    goalS = s; setPhase(s);
    if (reduce) { curS = s; drawHere(s); return; }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function initHero() {
    phaseBar = Draw.heroCycle(heroSvg);
    segs.forEach(function (l) {
      var k = { 3: .75, 0: 1, 1: 1.25, 2: 1.5 }[l.dataset.phase];
      l.style.left = Draw.hx(k + .125) / 10 + '%'; l.style.top = vy(Draw.HC.axisY + 20);
    });
    $('.trend-label', nameBox).style.top = vy(Draw.HC.ty - 30);
    drawHere(HOME_S); setPhase(HOME_S);
    if (matchMedia('(pointer: coarse)').matches) note.querySelector('small').textContent = '周期四个阶段 · 手指在名字上左右滑';
    var hero = $('.hero');
    var follow = function (e) {
      var r = nameBox.getBoundingClientRect();
      var s = Draw.sOfX((e.clientX - r.left) / r.width * 1000);
      placeHere(Math.max(0.75, Math.min(1.749, s)));
    };
    hero.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons) follow(e); });
    nameBox.addEventListener('pointerdown', follow);
    hero.addEventListener('pointerleave', function () { placeHere(HOME_S); });
    requestAnimationFrame(function () { requestAnimationFrame(function () { nameBox.classList.add('drawn'); }); });
  }

  /* ---------- About：书桌 ---------- */
  function initDesk() {
    var svg = $('#desk');
    Draw.desk(svg);
    var lamp = $('.lamp', svg);
    lamp.addEventListener('click', toggleTheme);
    lamp.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); } });
    var map = { cycle: 'w-cycle', sql: 'w-sql', ai: 'w-ai' };
    $$('.book', svg).forEach(function (b) {
      var id = map[b.getAttribute('data-target')];
      if (!id) { b.classList.add('no-link'); return; }
      var go = function () { scrollToPlate(id); };
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
    initDrag();
  }
  function initDrag() {
    var down = false, moved = false, x0 = 0, s0 = 0;
    strip.addEventListener('dragstart', function (e) { e.preventDefault(); });
    strip.addEventListener('pointerdown', function (e) {
      if (!pinned || e.button !== 0) return;
      down = true; moved = false; x0 = e.clientX; s0 = scrollY;
    });
    addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 6) { moved = true; strip.classList.add('dragging'); }
      if (moved) scrollTo({ top: s0 - dx * 1.2, behavior: 'instant' });
    });
    addEventListener('pointerup', function () {
      if (!down) return;
      down = false; strip.classList.remove('dragging');
    });
    // 拖过之后松手，不要误点进作品
    strip.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
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
