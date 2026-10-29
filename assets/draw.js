/* 手绘插画：全部用 rough.js 在浏览器里画成 SVG，固定 seed，每次打开都一样。 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var INK = 'var(--ink)', ACC = 'var(--accent)', MUTED = 'var(--muted)', PAPER = 'var(--paper)', PLATE = 'var(--plate)', BG = 'var(--bg)';

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // rough.js 把颜色写成属性；CSS 变量放进 style 更稳（深色模式会跟着变）
  function fixVars(node) {
    [node].concat([].slice.call(node.querySelectorAll('*'))).forEach(function (n) {
      ['stroke', 'fill'].forEach(function (a) {
        var v = n.getAttribute && n.getAttribute(a);
        if (v && v.indexOf('var(') === 0) { n.style[a] = v; n.removeAttribute(a); }
      });
    });
    return node;
  }
  function ink(o) {
    var base = { stroke: INK, strokeWidth: 1.5, roughness: 1.1, bowing: 1.2, seed: 7 };
    for (var k in o) base[k] = o[k];
    return base;
  }
  function solid(fill, o) { var b = { fill: fill, fillStyle: 'solid' }; for (var k in o) b[k] = o[k]; return b; }

  function Pen(svg) {
    var r = rough.svg(svg);
    var api = {
      svg: svg,
      add: function (node, parent) { (parent || svg).appendChild(fixVars(node)); return node; },
      line: function (x1, y1, x2, y2, o, p) { return api.add(r.line(x1, y1, x2, y2, ink(o)), p); },
      rect: function (x, y, w, h, o, p) { return api.add(r.rectangle(x, y, w, h, ink(o)), p); },
      circle: function (x, y, d, o, p) { return api.add(r.circle(x, y, d, ink(o)), p); },
      ellipse: function (x, y, w, h, o, p) { return api.add(r.ellipse(x, y, w, h, ink(o)), p); },
      poly: function (pts, o, p) { return api.add(r.polygon(pts, ink(o)), p); },
      path: function (d, o, p) { return api.add(r.path(d, ink(o)), p); },
      lin: function (pts, o, p) { return api.add(r.linearPath(pts, ink(o)), p); },
      curve: function (pts, o, p) { return api.add(r.curve(pts, ink(o)), p); },
      group: function (cls, p) { return el('g', cls ? { 'class': cls } : {}, p || svg); },
      text: function (x, y, t, cls, extra, p) {
        var a = { x: x, y: y, 'class': cls || 'hand' };
        for (var k in extra) a[k] = extra[k];
        var e = el('text', a, p || svg); e.textContent = t; return e;
      },
      wash: function (d, opacity, p) {
        return el('path', { d: d, 'class': 'wash', style: 'fill:' + ACC + ';opacity:' + (opacity == null ? .55 : opacity), filter: 'url(#wash-' + svg.id + ')' }, p || svg);
      }
    };
    var defs = el('defs', {}, svg);
    defs.innerHTML = '<filter id="wash-' + svg.id + '" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>';
    return api;
  }

  // 坐着读书的小人（首屏不用；书桌上用），(x,y) 是坐的点
  function sitter(P, x, y, s, parent) {
    var g = el('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + s + ')', 'class': 'fig' }, parent || P.svg);
    var sw = 1.5 / s;
    var o = function (extra) { var b = { strokeWidth: sw, roughness: .5, bowing: .5, seed: 5, fill: BG, fillStyle: 'solid' }; for (var k in extra) b[k] = extra[k]; return b; };
    P.path('M-14 -2 C0 -11 22 -11 36 -9 C41 -5 41 2 36 4 C20 6 0 6 -14 4 Z', o(), g);
    P.path('M29 1 C30 15 31 27 32 40 L41 40 C40 27 40 14 40 -1 Z', o(), g);
    P.path('M30 40 C36 37 47 38 51 42 C47 46 34 46 30 43 Z', o({ fill: INK }), g);
    P.path('M-17 -1 C-21 -24 -19 -48 -5 -58 C3 -62 12 -58 16 -48 C20 -34 18 -16 14 -4 Z', o(), g);
    P.path('M-12 -10 C-4 -8 6 -8 14 -10', o({ fill: 'none' }), g);
    P.wash('M20 -52 L33 -56 L46 -51 L46 -33 L33 -37 L20 -33 Z', .75, g);
    P.path('M20 -52 L33 -56 L33 -37 L20 -33 Z', o({ fill: 'none' }), g);
    P.path('M33 -56 L46 -51 L46 -33 L33 -37', o({ fill: 'none' }), g);
    P.path('M6 -50 C14 -42 19 -38 24 -38', o({ fill: 'none' }), g);
    P.path('M-5 -60 L-4 -64 L4 -64 L4 -60', o({ fill: 'none' }), g);
    P.circle(0, -75, 25, o({ seed: 9 }), g);
    P.path('M-13 -73 C-15 -91 12 -94 13 -77 C9 -83 0 -85 -7 -81 C-9 -76 -9 -70 -12 -64 Z', o({ fill: INK }), g);
    return g;
  }

  /* ---------- 首屏：长期趋势 + 实际产出 ---------- */
  // s 是周期相位，sin(2πs) 是产出缺口：0.75 波谷 → 1 上穿趋势 → 1.25 波峰 → 1.5 下穿趋势 → 1.75 波谷
  // 四段：[0.75,1) 复苏  [1,1.25) 过热  [1.25,1.5) 滞胀  [1.5,1.75) 衰退
  var HC = { x0: -20, x1: 1020, s0: 0.62, s1: 1.9, ty: 262, amp: 96, axisY: 448, top: 50, h: 440 };
  function hx(s) { return HC.x0 + (s - HC.s0) / (HC.s1 - HC.s0) * (HC.x1 - HC.x0); }
  function hy(s) { return HC.ty - HC.amp * Math.sin(2 * Math.PI * s); }
  function sOfX(x) { return HC.s0 + (x - HC.x0) / (HC.x1 - HC.x0) * (HC.s1 - HC.s0); }
  function phaseOf(s) { return Math.floor((((s % 1) + 1) % 1) * 4) % 4; } // 0 过热 1 滞胀 2 衰退 3 复苏
  function heroCycle(svg) {
    var P = Pen(svg);
    [0.75, 1, 1.25, 1.5, 1.75].forEach(function (c, i) {
      P.line(hx(c), 60, hx(c), HC.axisY, { stroke: 'var(--line)', strokeWidth: 1, roughness: .3, seed: 40 + i, strokeLineDash: [3, 6] });
      P.line(hx(c), HC.axisY - 9, hx(c), HC.axisY + 9, { strokeWidth: 1.3, roughness: .5, seed: 50 + i });
    });
    P.line(20, HC.axisY, 980, HC.axisY, { strokeWidth: 1.3, roughness: .6, seed: 3 });
    var bar = el('rect', { 'class': 'phase-bar', x: hx(.75), y: HC.axisY - 4, width: hx(1) - hx(.75), height: 8 }, svg);
    var g = P.group('draw-in'), pts = [];
    for (var i = 0; i <= 90; i++) { var s = HC.s0 + (HC.s1 - HC.s0) * i / 90; pts.push([hx(s), hy(s)]); }
    P.curve(pts, { stroke: ACC, strokeWidth: 2, roughness: 1.1, bowing: 1.4, seed: 11 }, g);
    return bar;
  }

  /* ---------- About：书桌 ---------- */
  function desk(svg) {
    var P = Pen(svg);
    var light = P.wash('M392 176 L436 166 L520 432 L330 432 Z', .16); light.classList.add('lamp-light');
    P.rect(30, 430, 540, 12, solid(BG, { seed: 2 }));
    P.line(52, 442, 46, 556, { seed: 3 }); P.line(548, 442, 554, 556, { seed: 4 });
    var books = [
      [70, 388, 150, 42, '周期 · 投资', 'cycle', '我在学周期 · 抖音 Mizu'],
      [82, 350, 130, 38, 'SQL', 'sql', '用外卖订单表学的'],
      [64, 316, 160, 34, 'AI 工具', 'ai', '给普通人的 AI 课'],
      [90, 286, 118, 30, 'English', 'en', '每天一点']
    ];
    books.forEach(function (b, i) {
      var g = P.group('book'); g.setAttribute('data-target', b[5]); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'link'); g.setAttribute('aria-label', b[4] + '：' + b[6]);
      P.rect(b[0], b[1], b[2], b[3], solid(BG, { seed: 20 + i }), g);
      P.line(b[0] + 14, b[1] + 4, b[0] + 14, b[1] + b[3] - 4, { seed: 30 + i, strokeWidth: 1 }, g);
      P.text(b[0] + 26, b[1] + b[3] / 2 + 7, b[4], 'hand zh', { style: 'font-size:22px' }, g);
      P.text(b[0] + b[2] + 14, b[1] + b[3] / 2 + 6, b[6], 'hand zh book-note', { style: 'font-size:19px' }, g);
    });
    // 笔记本电脑，屏幕上是周期线的回声
    P.poly([[262, 430], [402, 430], [390, 418], [274, 418]], solid(BG, { seed: 40 }));
    P.poly([[276, 418], [286, 322], [398, 322], [388, 418]], solid(BG, { seed: 41 }));
    var wp = []; for (var i = 0; i <= 24; i++) { var u = i / 24; wp.push([298 + 82 * u, 372 - 22 * Math.sin(2 * Math.PI * (-0.18 + 1.04 * u))]); }
    P.curve(wp, { stroke: ACC, strokeWidth: 1.3, roughness: .8, seed: 42 });
    // 咖啡
    P.path('M430 384 L434 428 L466 428 L470 384 Z', solid(BG, { seed: 50 }));
    P.path('M470 394 C484 394 484 414 468 414', { seed: 51 });
    var steam = P.group('steam');
    P.path('M442 372 C436 362 448 356 442 344', { seed: 52, strokeWidth: 1.1, stroke: MUTED }, steam);
    P.path('M456 372 C450 360 462 354 456 340', { seed: 53, strokeWidth: 1.1, stroke: MUTED }, steam);
    // 台灯（点它切换深色模式）
    var lamp = P.group('lamp'); lamp.setAttribute('role', 'button'); lamp.setAttribute('tabindex', '0'); lamp.setAttribute('aria-label', '点台灯切换浅色 / 深色');
    el('rect', { x: 370, y: 150, width: 150, height: 290, fill: 'transparent' }, lamp);
    P.ellipse(470, 428, 64, 12, solid(BG, { seed: 60 }), lamp);
    P.line(470, 424, 500, 300, { seed: 61 }, lamp); P.line(500, 300, 430, 206, { seed: 62 }, lamp);
    P.circle(500, 300, 8, solid(BG, { seed: 63 }), lamp);
    P.poly([[388, 184], [432, 160], [452, 190], [402, 206]], solid(BG, { seed: 64 }), lamp);
    sitter(P, 150, 284, 1.25);
    P.text(470, 120, '点一下灯 → 深色模式', 'hand zh hint', { 'text-anchor': 'middle', style: 'font-size:24px' });
    P.path('M470 132 C468 146 456 156 446 162', { stroke: MUTED, strokeWidth: 1.2, roughness: .6, seed: 70 });
  }

  /* ---------- 作品画板 ---------- */
  var ART = {
    // 质检看板：真实 8 周差错率（取自 /qc-dashboard/ 团队总览，模拟数据）
    qc: function (P) {
      P.poly([[70, 30], [560, 22], [566, 312], [64, 318]], solid(PAPER, { seed: 1 }));
      P.text(96, 78, '差错率 · 近 8 周', 'hand zh', { style: 'font-size:24px' });
      var v = [16.1, 13.6, 16.4, 12.6, 7.0, 4.3, 6.5, 5.3], X = function (i) { return 112 + i * 56; }, Y = function (t) { return 110 + (17 - t) * 11; };
      P.line(100, 282, 520, 282, { seed: 3, strokeWidth: 1 }); P.line(100, 282, 100, 96, { seed: 4, strokeWidth: 1 });
      var g = P.group('anim');
      P.lin(v.map(function (t, i) { return [X(i), Y(t)]; }), { seed: 5, strokeWidth: 1.8 }, g);
      v.forEach(function (t, i) { P.circle(X(i), Y(t), 6, solid(INK, { seed: 10 + i }), g); });
      P.line(X(3), 100, X(3), 282, { stroke: ACC, strokeWidth: 1.4, roughness: 1, seed: 20, strokeLineDash: [6, 6] });
      P.text(X(3) + 8, 118, 'W4 宣导', 'hand zh acc', { style: 'font-size:22px' });
      P.text(X(0) - 6, Y(16.1) - 14, '16.1%', 'hand', { style: 'font-size:22px' });
      P.text(X(7) - 16, Y(5.3) - 16, '5.3%', 'hand', { style: 'font-size:22px' });
      P.text(350, 96, '7.1 天才反馈', 'hand zh', { style: 'font-size:26px' });
      P.ellipse(424, 88, 196, 50, { stroke: ACC, strokeWidth: 1.5, roughness: 1.6, seed: 21 });
      ['W1', 'W4', 'W8'].forEach(function (t, i) { P.text(X([0, 3, 7][i]) - 10, 306, t, 'hand muted', { style: 'font-size:18px' }); });
      var pen = P.group('pencil');
      P.poly([[470, 330], [600, 250], [608, 262], [480, 340]], solid(PLATE, { seed: 30 }), pen);
      P.poly([[470, 330], [480, 340], [462, 346]], solid(INK, { seed: 31 }), pen);
    },
    // 合规方案：一摞带编号书签的文件 + 放大镜
    solution: function (P) {
      for (var i = 7; i >= 0; i--) {
        var dx = i * 7, dy = -i * 6;
        P.rect(80 + dx, 90 + dy, 200, 220, solid(PAPER, { seed: 40 + i, strokeWidth: 1.1 }));
        P.rect(280 + dx, 100 + dy + i * 16, 22, 18, solid(PAPER, { seed: 50 + i, strokeWidth: 1 }));
        P.text(285 + dx, 114 + dy + i * 16, String(i + 1), 'hand', { style: 'font-size:15px' });
      }
      P.text(100, 128, '§ 评分点', 'hand zh', { style: 'font-size:24px' });
      [150, 176, 202, 228].forEach(function (y, i) { P.line(124, y, 240 - i * 14, y, { seed: 60 + i, strokeWidth: 1 }); P.path('M100 ' + (y - 2) + ' l5 6 l10 -12', { seed: 70 + i, strokeWidth: 1.3 }); });
      P.text(104, 276, '→ 法规条款', 'hand zh muted', { style: 'font-size:20px' });
      var g = P.group('anim');
      P.circle(250, 236, 74, { seed: 80, strokeWidth: 2 }, g);
      P.wash('M222 236 a28 28 0 1 0 56 0 a28 28 0 1 0 -56 0', .18, g);
      P.line(276, 262, 326, 312, { seed: 81, strokeWidth: 5 }, g);
    },
    // SQL：外卖小票
    sql: function (P) {
      var zz = 'M120 40 L280 40 L280 300';
      for (var x = 280; x > 120; x -= 10) zz += ' L' + (x - 5) + ' ' + (x % 20 ? 306 : 300);
      P.path(zz + ' L120 300 Z', solid(PAPER, { seed: 90 }));
      P.text(200, 76, '外卖订单', 'hand zh', { 'text-anchor': 'middle', style: 'font-size:26px' });
      P.line(136, 90, 264, 90, { seed: 91, strokeWidth: 1, strokeLineDash: [4, 5] });
      [['阿婆面馆', '32'], ['轻食沙拉', '45'], ['阿婆面馆', '28'], ['轻食沙拉', '39']].forEach(function (r, i) {
        P.text(140, 124 + i * 32, r[0], 'hand zh', { style: 'font-size:22px' });
        P.text(256, 124 + i * 32, r[1], 'hand', { 'text-anchor': 'end', style: 'font-size:22px' });
      });
      P.line(136, 240, 264, 240, { seed: 92, strokeWidth: 1, strokeLineDash: [4, 5] });
      P.text(140, 276, 'SUM(金额)', 'hand zh', { style: 'font-size:20px' });
      P.text(262, 276, '= 144', 'hand', { 'text-anchor': 'end', style: 'font-size:22px' });
      var g = P.group('anim'); P.ellipse(182, 268, 108, 38, { stroke: ACC, strokeWidth: 1.6, roughness: 1.6, seed: 93 }, g);
      P.text(300, 150, 'GROUP BY', 'hand muted', { style: 'font-size:20px' });
      P.text(300, 172, '店铺?', 'hand zh muted', { style: 'font-size:20px' });
    },
    // 周期：美林时钟（纵轴增长、横轴通胀，顺时针：衰退→复苏→过热→滞胀）
    cycle: function (P) {
      var cx = 200, cy = 176, R = 118;
      P.circle(cx, cy, R * 2, solid(PAPER, { seed: 100, strokeWidth: 1.8 }));
      P.line(cx - R, cy, cx + R, cy, { seed: 101, strokeWidth: 1 }); P.line(cx, cy - R, cx, cy + R, { seed: 102, strokeWidth: 1 });
      [['复苏', -62, -50], ['过热', 62, -50], ['滞胀', 62, 70], ['衰退', -62, 70]].forEach(function (q) {
        P.text(cx + q[1], cy + q[2], q[0], 'hand zh', { 'text-anchor': 'middle', style: 'font-size:28px' });
      });
      P.text(cx, cy - R - 14, '增长 ↑', 'hand zh muted', { 'text-anchor': 'middle', style: 'font-size:18px' });
      P.text(cx + R + 12, cy + 6, '通胀 →', 'hand zh muted', { style: 'font-size:18px' });
      var g = P.group('anim hand-clock'); P.line(cx, cy, cx + 58, cy - 66, { stroke: ACC, strokeWidth: 3, roughness: .8, seed: 103 }, g);
      P.circle(cx, cy, 10, solid(INK, { seed: 104 }));
    },
    // AI 课：钥匙 + 六张课程卡
    course: function (P) {
      for (var i = 5; i >= 0; i--) {
        var x = 150 + i * 24, y = 36 + i * 9;
        P.rect(x, y, 116, 150, solid(PAPER, { seed: 110 + i, strokeWidth: 1.1 }));
        P.text(x + 98, y + 26, String(i + 1), 'hand', { 'text-anchor': 'end', style: 'font-size:22px' });
      }
      P.text(164, 90, '第 1 章', 'hand zh', { style: 'font-size:22px' });
      P.text(164, 122, '保住账号', 'hand zh', { style: 'font-size:24px' });
      var ky = 284, g = P.group('anim');
      P.circle(100, ky, 64, solid(PLATE, { seed: 120, strokeWidth: 2 }), g); P.circle(100, ky, 16, { seed: 121, strokeWidth: 1.4 }, g);
      P.line(132, ky, 262, ky, { seed: 122, strokeWidth: 2.2 }, g); P.line(224, ky, 224, ky + 20, { seed: 123, strokeWidth: 2 }, g); P.line(246, ky, 246, ky + 14, { seed: 124, strokeWidth: 2 }, g);
      P.line(262, ky, 286, ky - 14, { seed: 126, strokeWidth: 1 }, g);
      P.wash('M284 ' + (ky - 30) + ' L336 ' + (ky - 36) + ' L340 ' + (ky - 8) + ' L288 ' + (ky - 2) + ' Z', .65, g);
      P.poly([[284, ky - 30], [336, ky - 36], [340, ky - 8], [288, ky - 2]], { seed: 125, strokeWidth: 1.1 }, g);
      P.text(296, ky - 12, '2FA', 'hand', { style: 'font-size:18px' }, g);
    },
    // Oddverse：睁着眼的月亮
    moon: function (P) {
      P.circle(200, 170, 190, solid(PAPER, { seed: 130, strokeWidth: 1.8 }));
      P.circle(150, 110, 26, { seed: 131, strokeWidth: 1 }); P.circle(250, 236, 36, { seed: 132, strokeWidth: 1 }); P.circle(130, 230, 16, { seed: 133, strokeWidth: 1 });
      var g = P.group('anim eye');
      P.path('M140 176 Q200 126 260 176 Q200 214 140 176 Z', solid(PAPER, { seed: 134, strokeWidth: 1.8 }), g);
      P.wash('M180 172 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0', .8, g);
      P.circle(200, 172, 14, solid(INK, { seed: 135 }), g);
      ['M156 154 l-10 -12', 'M180 140 l-4 -14', 'M206 136 l1 -14', 'M232 142 l6 -13', 'M252 154 l10 -11'].forEach(function (d, i) { P.path(d, { seed: 140 + i, strokeWidth: 1.4 }, g); });
      P.text(300, 70, 'z z z', 'hand muted', { style: 'font-size:30px' });
      P.line(296, 62, 352, 52, { stroke: ACC, strokeWidth: 2, roughness: 1.2, seed: 150 });
      P.text(40, 316, 'What if you never slept?', 'hand', { style: 'font-size:24px' });
      [[60, 60], [340, 280], [80, 150], [330, 150], [300, 30]].forEach(function (s, i) {
        P.path('M' + (s[0] - 6) + ' ' + s[1] + ' L' + (s[0] + 6) + ' ' + s[1] + ' M' + s[0] + ' ' + (s[1] - 6) + ' L' + s[0] + ' ' + (s[1] + 6), { seed: 160 + i, strokeWidth: 1 });
      });
    },
    // 博客空状态：一张纸 + 铅笔
    note: function (P) {
      P.rect(14, 20, 70, 62, solid(PAPER, { seed: 3 }));
      [34, 46, 58].forEach(function (y, i) { P.line(24, y, 70 - i * 10, y, { seed: 4 + i, strokeWidth: 1 }); });
      P.poly([[78, 74], [112, 22], [118, 27], [84, 79]], solid(PLATE, { seed: 9 }));
      P.poly([[78, 74], [84, 79], [74, 84]], solid(ACC, { seed: 10 }));
    }
  };

  /* ---------- 联系：周期线收尾成纸飞机 ---------- */
  function plane(svg, width, endX, endY, amp) {
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    var P = Pen(svg), pts = [];
    for (var i = 0; i <= 50; i++) {
      var t = i / 50, x = endX * t, y = endY + amp + amp * Math.sin(t * Math.PI * 2 * 1.4 + .5);
      var k = Math.max(0, (t - .7) / .3); y = y * (1 - k) + endY * k;
      pts.push([x, y]);
    }
    var g = P.group('draw-in');
    P.curve(pts, { stroke: ACC, strokeWidth: 1.7, roughness: 1.3, bowing: 2, seed: 12 }, g);
    var pl = el('g', { 'class': 'plane', transform: 'translate(' + (endX + 6) + ' ' + (endY - 6) + ')' }, svg);
    var inner = el('g', { 'class': 'plane-tilt' }, pl);
    var o = function (fill, seed) { return { roughness: .6, fill: fill, fillStyle: 'solid', seed: seed }; };
    P.poly([[0, 0], [64, -22], [22, 8]], o(PAPER, 1), inner);
    P.poly([[22, 8], [64, -22], [30, 22]], o(PLATE, 2), inner);
    P.line(22, 8, 26, 26, { roughness: .6, seed: 3 }, inner);
    var room = width - endX > 150;
    P.text(room ? endX + 40 : endX + 70, endY - (room ? 70 : 52), '发给我', 'hand zh acc', { style: 'font-size:' + (room ? 30 : 22) + 'px', 'text-anchor': room ? 'start' : 'end' });
  }

  window.Draw = { Pen: Pen, heroCycle: heroCycle, HC: HC, hx: hx, hy: hy, sOfX: sOfX, phaseOf: phaseOf, desk: desk, ART: ART, plane: plane };
})();
