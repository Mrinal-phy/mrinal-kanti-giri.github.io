// Animated cartoon diagrams shown inside Qubi's notes.
// Each scene is draw(ctx, t, stage): t = seconds since the note opened,
// stage = which paragraph Qubi is on (for multi-step notes).
// Canvas is drawn in a 480 x 180 coordinate box.
(function () {
  var W = 480, H = 180, C = {};
  var BLUE = '#3f74c4', RED = '#e0607a', GOLD = '#f2b134', GREEN = '#3fae6a', INK = '#14213d';

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    C.accent = cs.getPropertyValue('--accent').trim() || '#1f3f6e';
    C.text = cs.getPropertyValue('--text').trim() || '#2a2723';
    C.muted = cs.getPropertyValue('--muted').trim() || '#6b665d';
    C.rule = cs.getPropertyValue('--rule').trim() || '#e2ddd1';
    C.card = cs.getPropertyValue('--card').trim() || '#f4f1e8';
    C.bg = cs.getPropertyValue('--bg').trim() || '#fbf9f4';
  }

  // ---------- helpers ----------
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { k = clamp(k, 0, 1); return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  var facts = [1];
  function fact(m) { while (facts.length <= m) facts.push(facts[facts.length - 1] * facts.length); return facts[m]; }
  function J(n, x) {
    n = Math.abs(n); var s = 0;
    for (var k = 0; k < 22; k++) s += Math.pow(-1, k) * Math.pow(x / 2, 2 * k + n) / (fact(k) * fact(k + n));
    return s;
  }
  function P(n, t) { var j = J(n, 2 * t); return j * j; }   // quantum-walk probability
  function rng(seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  function say(ctx, txt, x, y, size, color, align) {
    ctx.fillStyle = color || C.accent;
    ctx.font = '700 ' + (size || 20) + 'px Caveat, "Comic Sans MS", cursive';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(txt, x, y);
  }
  function small(ctx, txt, x, y, color, align) {
    ctx.fillStyle = color || C.muted;
    ctx.font = '12px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.fillText(txt, x, y);
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function stone(ctx, x, y, w, col) {
    w = w || 9;
    var g = ctx.createRadialGradient(x, y - w * 0.15, 1, x, y, w);
    g.addColorStop(0, col || 'rgba(120,110,95,0.30)'); g.addColorStop(1, 'rgba(120,110,95,0.06)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.38, 0, 0, 2 * Math.PI); ctx.fill();
  }
  // shaded lattice site (a small sphere)
  function site(ctx, x, y, r, col) {
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col || '#9aa3ad'); g.addColorStop(1, shade(col || '#9aa3ad'));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
  }
  function shade(hex) {
    var n = parseInt(hex.slice(1), 16), f = 0.62;
    return 'rgb(' + Math.round((n >> 16) * f) + ',' + Math.round(((n >> 8) & 255) * f) + ',' + Math.round((n & 255) * f) + ')';
  }
  function bond(ctx, x1, y1, x2, y2, w) {
    ctx.strokeStyle = 'rgba(120,110,95,0.35)'; ctx.lineWidth = w || 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // tiny tight-binding simulator: H = -sum amp (|i><j| + h.c.), RK4 in time
  function TB(n, bonds, start) {
    var me = { re: new Float64Array(n), im: new Float64Array(n), t: 0 };
    var k = [], tr = new Float64Array(n), ti = new Float64Array(n);
    for (var q = 0; q < 4; q++) k.push([new Float64Array(n), new Float64Array(n)]);
    function deriv(r, i, dr, di) {
      dr.fill(0); di.fill(0);
      bonds.forEach(function (b) {
        var a = b[0], c = b[1], J = -(b[2] === undefined ? 1 : b[2]);
        dr[a] += J * i[c]; di[a] -= J * r[c];
        dr[c] += J * i[a]; di[c] -= J * r[a];
      });
    }
    me.reset = function () { me.re.fill(0); me.im.fill(0); me.re[start] = 1; me.t = 0; };
    me.step = function (dt) {
      deriv(me.re, me.im, k[0][0], k[0][1]);
      for (var s2 = 1; s2 < 4; s2++) {
        var f = s2 === 3 ? dt : dt / 2;
        for (var m = 0; m < n; m++) { tr[m] = me.re[m] + f * k[s2 - 1][0][m]; ti[m] = me.im[m] + f * k[s2 - 1][1][m]; }
        deriv(tr, ti, k[s2][0], k[s2][1]);
      }
      for (var m2 = 0; m2 < n; m2++) {
        me.re[m2] += dt / 6 * (k[0][0][m2] + 2 * k[1][0][m2] + 2 * k[2][0][m2] + k[3][0][m2]);
        me.im[m2] += dt / 6 * (k[0][1][m2] + 2 * k[1][1][m2] + 2 * k[2][1][m2] + k[3][1][m2]);
      }
      me.t += dt;
    };
    me.prob = function (m) { return me.re[m] * me.re[m] + me.im[m] * me.im[m]; };
    me.reset();
    return me;
  }
  function dot(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); }
  function line(ctx, x1, y1, x2, y2, col, w, dash) {
    ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  }

  // A little cartoon particle with a face
  function walker(ctx, x, y, r, col, o) {
    o = o || {};
    ctx.save();
    ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    if (o.glow) {
      ctx.fillStyle = col; ctx.globalAlpha *= 0.25;
      ctx.beginPath(); ctx.arc(x, y, r * (1.6 + 0.15 * Math.sin(o.glow * 5)), 0, 2 * Math.PI); ctx.fill();
      ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    }
    var sx = o.squish ? 1 + o.squish : 1, sy = o.squish ? 1 - o.squish : 1;
    ctx.translate(x, y); ctx.scale(sx, sy);
    var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(0.35, col); g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = r * 0.6; ctx.shadowOffsetY = r * 0.18;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1; ctx.stroke();
    var lx = (o.look || 0) * r * 0.08;
    if (o.angry) {
      ctx.fillStyle = 'rgba(230,60,60,0.35)';
      ctx.beginPath(); ctx.arc(-r * 0.55, r * 0.25, r * 0.2, 0, 2 * Math.PI); ctx.arc(r * 0.55, r * 0.25, r * 0.2, 0, 2 * Math.PI); ctx.fill();
    }
    if (o.sleep) {
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, r * 0.12);
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(s * r * 0.33, -r * 0.1, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); });
    } else {
      [-1, 1].forEach(function (s) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(s * r * 0.33, -r * 0.12, r * 0.22, r * 0.28, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(s * r * 0.33 + lx, -r * 0.07, r * 0.12, 0, 2 * Math.PI); ctx.fill();
      });
    }
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, r * 0.1); ctx.lineCap = 'round';
    if (o.angry) {
      ctx.lineWidth = Math.max(1.5, r * 0.13);
      ctx.beginPath(); ctx.moveTo(-r * 0.58, -r * 0.52); ctx.lineTo(-r * 0.14, -r * 0.34);
      ctx.moveTo(r * 0.58, -r * 0.52); ctx.lineTo(r * 0.14, -r * 0.34); ctx.stroke();
      ctx.lineWidth = Math.max(1.2, r * 0.1);
      ctx.beginPath(); ctx.arc(0, r * 0.52, r * 0.24, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.beginPath();
    if (o.wow) { ctx.arc(0, r * 0.38, r * 0.14, 0, 2 * Math.PI); }
    else ctx.arc(0, r * 0.2, r * (o.happy ? 0.34 : 0.26), 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
  function heart(ctx, x, y, s, col) {
    ctx.fillStyle = col || RED;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.45, y - s, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.45, y - s, x + s, y - s * 0.4, x, y + s * 0.35);
    ctx.fill();
  }
  function spark(ctx, x, y, s, col, t) {
    ctx.strokeStyle = col || GOLD; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 + t * 2, r1 = s * 0.35, r2 = s * (0.8 + 0.2 * Math.sin(t * 12 + i));
      ctx.beginPath(); ctx.moveTo(x + r1 * Math.cos(a), y + r1 * Math.sin(a)); ctx.lineTo(x + r2 * Math.cos(a), y + r2 * Math.sin(a)); ctx.stroke();
    }
  }
  function zzz(ctx, x, y, t) {
    for (var i = 0; i < 3; i++) {
      var k = ((t * 0.7 + i / 3) % 1);
      ctx.globalAlpha = 1 - k;
      say(ctx, 'z', x + k * 16 + i * 2, y - k * 26, 14 + 6 * k, C.muted);
    }
    ctx.globalAlpha = 1;
  }
  function knob(ctx, x, y, v, label) {
    ctx.strokeStyle = C.rule; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, 22, Math.PI, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = C.accent;
    ctx.beginPath(); ctx.arc(x, y, 22, Math.PI, Math.PI + Math.PI * v); ctx.stroke();
    var a = Math.PI + Math.PI * v;
    line(ctx, x, y, x + 17 * Math.cos(a), y + 17 * Math.sin(a), INK, 3);
    dot(ctx, x, y, 4, INK);
    say(ctx, label, x, y + 22, 17, C.text);
  }
  function bars(ctx, xs, ps, base, maxH, col) {
    var mx = Math.max.apply(null, ps) || 1;
    ctx.fillStyle = col;
    xs.forEach(function (x, i) {
      var h = maxH * Math.sqrt(ps[i] / Math.max(mx, 0.35));
      ctx.globalAlpha = 0.3; ctx.fillRect(x - 6, base - h, 12, h);
    });
    ctx.globalAlpha = 1;
  }
  // a six-sided die showing `face`, rotated by `ang`
  function die(ctx, x, y, face, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    rr(ctx, -15, -15, 30, 30, 6); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    var P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
              5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[face];
    P.forEach(function (p) { dot(ctx, p[0] * 7.5, p[1] * 7.5, 2.8, face === 1 ? RED : INK); });
    ctx.restore();
  }
  // smooth bump distribution centred at c with width w over n sites
  function blob(n, c, w) { var a = []; for (var i = 0; i < n; i++) a.push(Math.exp(-Math.pow((i - c) / w, 2))); return a; }

  // ================= Scenes =================
  var S = {};

  // Classical random walk vs quantum walk
  S.walks = function (ctx, t) {
    var T = 6.5, tt = t % T, cyc = Math.floor(t / T), r = rng(cyc + 3);
    // roll a die before every hop: even -> step right, odd -> step left
    var hop = 0.6, hopsDone = Math.floor(tt / hop), path = [4], faces = [];
    for (var i = 0; i < 14; i++) {
      var face = 1 + Math.floor(r() * 6); faces.push(face);
      path.push(clamp(path[path.length - 1] + (face % 2 === 0 ? 1 : -1), 0, 8));
    }
    var k = Math.min(hopsDone, 9), f = Math.min(1, (tt - k * hop) / hop);
    var rolling = f < 0.4 && hopsDone <= 9;
    var shown = rolling ? 1 + Math.floor((t * 23) % 6) : faces[k];
    die(ctx, 120, 44, shown, rolling ? f / 0.4 * 2 * Math.PI : 0);
    small(ctx, rolling ? 'rolling...' : (faces[k] % 2 === 0 ? faces[k] + ': even → right' : faces[k] + ': odd → left'), 120, 80, C.text);
    f = rolling ? 0 : (f - 0.4) / 0.6;
    var from = path[k], to = path[Math.min(k + 1, 13)];
    for (var s = 0; s < 9; s++) stone(ctx, 32 + s * 22, 128);
    var cx = lerp(32 + from * 22, 32 + to * 22, ease(f)), cy = 116 - Math.sin(f * Math.PI) * 18;
    walker(ctx, cx, cy, 11, RED, { look: to - from });
    say(ctx, 'classical: one random path', 120, 166, 17, C.text);
    line(ctx, 240, 20, 240, 150, C.rule, 1.5, [4, 4]);
    var tq = Math.min(tt, 5) / 5 * 3.3, xs = [], ps = [];
    for (var n = -4; n <= 4; n++) { xs.push(360 + n * 22); ps.push(P(n, tq)); }
    xs.forEach(function (x) { stone(ctx, x, 128); });
    bars(ctx, xs, ps, 124, 70, BLUE);
    var mx = Math.max.apply(null, ps);
    xs.forEach(function (x, i) {
      var a = Math.sqrt(ps[i] / mx);
      if (a > 0.08) walker(ctx, x, 116 - 4 * Math.sin(t * 6 + i), 10, BLUE, { alpha: a, happy: true });
    });
    say(ctx, 'quantum: all paths at once!', 362, 166, 17, C.text);
    say(ctx, '〰', 360, 40, 26, BLUE);
  };

  // Two particles meet, interact, and pair up (also used for "do they pair up?")
  function pairScene(ctx, t, captions) {
    var T = 7, tt = t % T, y = 120;
    for (var s = 0; s < 13; s++) stone(ctx, 48 + s * 32, y + 12);
    var meet = 2.4, xA, xB, pairX;
    if (tt < meet) {
      var k = ease(tt / meet);
      xA = lerp(60, 222, k); xB = lerp(420, 258, k);
      var hop = Math.abs(Math.sin(tt * 7)) * 10;
      walker(ctx, xA, y - hop, 13, BLUE, { look: 1 });
      walker(ctx, xB, y - hop, 13, RED, { look: -1 });
      say(ctx, captions[0], 240, 40, 22);
    } else if (tt < meet + 1.2) {
      walker(ctx, 226, y, 13, BLUE, { wow: true, squish: 0.1 });
      walker(ctx, 254, y, 13, RED, { wow: true, squish: 0.1 });
      spark(ctx, 240, y - 26, 22, GOLD, tt);
      say(ctx, captions[1], 240, 40, 22);
    } else {
      var k2 = ease((tt - meet - 1.2) / (T - meet - 1.6));
      pairX = lerp(240, 400, k2);
      var hop2 = Math.abs(Math.sin(tt * 6)) * 12;
      walker(ctx, pairX - 12, y - hop2, 13, BLUE, { happy: true });
      walker(ctx, pairX + 12, y - hop2, 13, RED, { happy: true });
      heart(ctx, pairX, y - 34 - hop2, 9);
      say(ctx, captions[2], 240, 40, 22);
    }
  }
  // PRL: a bound pair of one component meets a single particle of the other;
  // the pair breaks and a new inter-component pair forms
  S.pairing = function (ctx, t) {
    var T = 8.5, tt = t % T, y = 116;
    for (var s2 = 0; s2 < 14; s2++) stone(ctx, 32 + s2 * 32, y + 14, 11);
    var meet = 2.6, clash = 1.3;
    function link(x1, x2, yy, col) { line(ctx, x1, yy - 4, x2, yy - 4, col, 3); }
    if (tt < meet) {
      var k = ease(tt / meet), px = lerp(60, 200, k), rx = lerp(430, 268, k), hop = Math.abs(Math.sin(tt * 7)) * 9;
      link(px - 11, px + 11, y - hop, BLUE);
      walker(ctx, px - 11, y - hop, 12, BLUE, { look: 1 }); walker(ctx, px + 11, y - hop, 12, BLUE, { look: 1 });
      walker(ctx, rx, y - hop, 12, RED, { look: -1 });
      small(ctx, 'component A: a bound pair', px, y + 40, BLUE); small(ctx, 'component B: one particle', rx, y + 40, RED);
      say(ctx, 'two components go walking...', 240, 34, 21);
    } else if (tt < meet + clash) {
      var wob = Math.sin(tt * 30) * 2;
      walker(ctx, 200 + wob, y, 12, BLUE, { wow: true }); walker(ctx, 224 - wob, y, 12, BLUE, { wow: true });
      walker(ctx, 250 + wob, y, 12, RED, { wow: true });
      spark(ctx, 237, y - 30, 22, GOLD, tt);
      say(ctx, 'interactions compete!', 240, 34, 21);
    } else {
      var k2 = ease((tt - meet - clash) / (T - meet - clash - 0.6)), hop2 = Math.abs(Math.sin(tt * 6)) * 10;
      var lone = lerp(200, 70, k2), pair = lerp(237, 390, k2);
      walker(ctx, lone, y - hop2 * 0.6, 12, BLUE, { look: -1 });
      link(pair - 11, pair + 11, y - hop2, '#8a6bb8');
      walker(ctx, pair - 11, y - hop2, 12, BLUE, { happy: true }); walker(ctx, pair + 11, y - hop2, 12, RED, { happy: true });
      heart(ctx, pair, y - 32 - hop2, 8);
      small(ctx, 'off alone', lone, y + 40, C.muted); small(ctx, 'new A–B pair!', pair, y + 40, C.text);
      say(ctx, 'the A pair breaks, A + B pair up!', 240, 34, 21);
    }
  };
  S.interact = function (ctx, t) { pairScene(ctx, t, ['many particles, many interactions...', 'bzzt! they interact!', 'do they pair up? get stuck? race?']); };

  // Real quantum chip + circuit compression
  S.chip = function (ctx, t) {
    rr(ctx, 30, 30, 140, 120, 14); ctx.fillStyle = C.card; ctx.fill();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.stroke();
    for (var p = 0; p < 6; p++) {
      line(ctx, 46 + p * 22, 22, 46 + p * 22, 30, C.muted, 3);
      line(ctx, 46 + p * 22, 150, 46 + p * 22, 158, C.muted, 3);
    }
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      var qx = 62 + i * 38, qy = 58 + j * 32, on = Math.floor(t * 3) % 9 === i * 3 + j;
      if (i < 2) line(ctx, qx, qy, qx + 38, qy, C.rule, 2);
      if (j < 2) line(ctx, qx, qy, qx, qy + 32, C.rule, 2);
      dot(ctx, qx, qy, on ? 9 : 7, on ? GOLD : BLUE);
    }
    small(ctx, 'quantum chip', 100, 172);
    var T = 6, tt = t % T, k = ease((tt - 2.4) / 1.6);
    say(ctx, k < 0.5 ? 'long circuit = noisy 😵' : 'compressed = survives! 😎', 340, 40, 21);
    for (var w = 0; w < 3; w++) line(ctx, 210, 76 + w * 26, 470, 76 + w * 26, C.rule, 2);
    for (var g = 0; g < 10; g++) {
      var x0 = 222 + g * 24, wire = g % 3, x1 = 240 + Math.floor(g / 2.5) * 52;
      var gx = lerp(x0, x1, k), a = g < 4 ? 1 : 1 - k;
      ctx.globalAlpha = a; rr(ctx, gx - 9, 67 + wire * 26, 18, 18, 4);
      ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (k < 0.5) {
      var r = rng(Math.floor(t * 6));
      for (var s = 0; s < 3; s++) spark(ctx, 230 + r() * 230, 66 + r() * 70, 9, RED, t);
    } else {
      ctx.strokeStyle = GREEN; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(440, 155); ctx.lineTo(450, 166); ctx.lineTo(468, 146); ctx.stroke();
    }
  };

  // Tensor networks on a laptop double-check the quantum computer
  S.tensor = function (ctx, t) {
    rr(ctx, 40, 24, 190, 118, 8); ctx.fillStyle = INK; ctx.fill();
    rr(ctx, 48, 32, 174, 102, 4); ctx.fillStyle = '#eaf2ff'; ctx.fill();
    ctx.fillStyle = C.muted; ctx.beginPath(); ctx.moveTo(24, 152); ctx.lineTo(246, 152); ctx.lineTo(232, 142); ctx.lineTo(38, 142); ctx.closePath(); ctx.fill();
    var site = Math.floor(t * 2) % 5;
    for (var i = 0; i < 6; i++) {
      var x = 70 + i * 26;
      if (i < 5) line(ctx, x, 82, x + 26, 82, i === site ? GOLD : BLUE, i === site ? 4 : 2);
      line(ctx, x, 82, x, 104, BLUE, 2);
      dot(ctx, x, 82, i === site || i === site + 1 ? 9 : 7, i === site || i === site + 1 ? GOLD : BLUE);
    }
    small(ctx, 'tensor network (MPS)', 135, 56, INK);
    var xs = [], qs = [], tq = 1.6;
    for (var n = -4; n <= 4; n++) { xs.push(360 + n * 20); qs.push(P(n, tq)); }
    var mx = Math.max.apply(null, qs);
    xs.forEach(function (x, i) {
      var h = 80 * qs[i] / mx;
      ctx.fillStyle = BLUE; ctx.globalAlpha = 0.35; ctx.fillRect(x - 7, 140 - h, 14, h); ctx.globalAlpha = 1;
      var show = (t % 5) > 1 + i * 0.15;
      if (show) dot(ctx, x, 140 - h, 4.5, GOLD);
    });
    line(ctx, 270, 140, 450, 140, C.rule, 2);
    small(ctx, 'bars: quantum chip · dots: tensors', 360, 166);
    if (t % 5 > 3) say(ctx, '✓ they match!', 360, 40, 24, GREEN);
    else say(ctx, 'checking...', 360, 40, 22);
  };

  // Quantum switch (the lattice from the paper's figure): chain 0-1-2, rhombus 2-(3,4)-5, chain 5-6-7.
  // ON (no flux): the two paths add up at site 5 and Qubi reaches site 7, dancing.
  // OFF (pi flux): the two paths cancel at site 5 and Qubi bounces back, angry.
  function steam(ctx, x, y, t) {
    for (var i = 0; i < 3; i++) {
      var k = (t * 1.4 + i / 3) % 1;
      ctx.globalAlpha = 0.5 * (1 - k); ctx.fillStyle = '#b9b2a6';
      ctx.beginPath(); ctx.arc(x + (i - 1) * 9 + Math.sin(t * 6 + i) * 2, y - k * 20, 3 + k * 4, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  S.flatband = function (ctx, t) {
    var y = 112, P = { 0: [34, y], 1: [86, y], 2: [138, y], 3: [190, y - 46], 4: [190, y + 46], 5: [242, y], 6: [294, y], 7: [346, y] };
    var T = 16, tt = t % T, on = tt < 8, u = on ? tt : tt - 8;
    // switch (top right)
    rr(ctx, 396, 22, 62, 30, 15); ctx.fillStyle = on ? GREEN : '#c9c2b6'; ctx.fill();
    dot(ctx, on ? 443 : 411, 37, 11, '#ffffff');
    small(ctx, on ? 'switch ON' : 'switch OFF', 427, 68, on ? GREEN : RED);
    small(ctx, on ? 'no flux' : 'flux π', 427, 84);
    // lattice exactly as in the figure
    var bonds = [[0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [5, 6], [6, 7]];
    bonds.forEach(function (bd) {
      var A = P[bd[0]], B = P[bd[1]];
      if (!on && bd[0] === 3 && bd[1] === 5) line(ctx, A[0], A[1], B[0], B[1], RED, 3, [6, 5]);
      else line(ctx, A[0], A[1], B[0], B[1], C.text, 3);
    });
    if (!on) {
      ctx.strokeStyle = C.text; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(190, y, 15, 0.35 * Math.PI, 1.75 * Math.PI); ctx.stroke();
      say(ctx, 'π', 192, y + 7, 20, C.text);
    }
    for (var n = 0; n <= 7; n++) {
      var p = P[n];
      ctx.fillStyle = n === 0 ? INK : C.bg; ctx.strokeStyle = C.text; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      if (n === 3 || n === 4) small(ctx, String(n), p[0] - 17, p[1] + 4, C.text);
      else small(ctx, String(n), p[0], p[1] + 24, C.text);
    }
    function along(path, k) {   // position along a list of sites, k in [0,1]
      var segs = path.length - 1, x = Math.min(segs - 1e-6, k * segs), i = Math.floor(x), f = x - i;
      var A = P[path[i]], B = P[path[i + 1]];
      return [lerp(A[0], B[0], ease(f)), lerp(A[1], B[1], ease(f)) - 18 - Math.abs(Math.sin(f * Math.PI)) * 8];
    }
    var q, cap;
    if (u < 2.2) {
      q = along([0, 1, 2], u / 2.2); walker(ctx, q[0], q[1], 12, BLUE, { happy: true, look: 1 });
      cap = 'off to the rhombus...';
    } else if (u < 4.4) {
      // split into two halves: top path (via 3) and bottom path (via 4)
      var k = (u - 2.2) / 2.2;
      var top = along([2, 3, 5], k * 0.98), bot = along([2, 4, 5], k * 0.98);
      walker(ctx, top[0], top[1], 10, BLUE, { alpha: 0.6, wow: true });
      walker(ctx, bot[0], bot[1] + 36, 10, BLUE, { alpha: 0.6, wow: true });
      small(ctx, '+', top[0] + 15, top[1] - 8, C.text);
      small(ctx, on ? '+' : '−', bot[0] + 15, bot[1] + 30, on ? C.text : RED);
      cap = 'both paths at once!';
    } else if (on) {
      if (u < 5) {
        spark(ctx, P[5][0], P[5][1] - 18, 20, GREEN, u);
        walker(ctx, P[5][0], P[5][1] - 18, 12, BLUE, { happy: true });
        cap = 'in step: they add up! ✨';
      } else if (u < 6.4) {
        q = along([5, 6, 7], (u - 5) / 1.4); walker(ctx, q[0], q[1], 12, BLUE, { happy: true, look: 1 });
        cap = 'zooming through...';
      } else {
        var dx = P[7][0], dy = P[7][1] - 20 - Math.abs(Math.sin(u * 7)) * 10;
        ctx.save(); ctx.translate(dx, dy); ctx.rotate(Math.sin(u * 8) * 0.35);
        walker(ctx, 0, 0, 13, BLUE, { happy: true }); ctx.restore();
        for (var m = 0; m < 3; m++) {
          var kk = (u * 0.8 + m / 3) % 1;
          ctx.globalAlpha = 1 - kk; say(ctx, m % 2 ? '♪' : '♫', dx - 22 + m * 22, dy - 18 - kk * 26, 18, C.accent); ctx.globalAlpha = 1;
        }
        cap = 'made it to the other side!';
      }
    } else {
      if (u < 5) {
        var fl = (u - 4.4) / 0.6;
        ctx.globalAlpha = 1 - fl * 0.6; say(ctx, '✕', P[5][0], P[5][1] + 9, 30, RED); ctx.globalAlpha = 1;
        walker(ctx, P[5][0] - 26, P[5][1] - 18, 12, BLUE, { angry: true, squish: 0.12 });
        steam(ctx, P[5][0] - 26, P[5][1] - 34, u);
        cap = 'out of step: they cancel! ✕';
      } else if (u < 7.4) {
        q = along([2, 1, 0], (u - 5) / 2.4); walker(ctx, q[0], q[1], 12, BLUE, { angry: true, look: -1 });
        steam(ctx, q[0], q[1] - 16, u);
        say(ctx, 'Hmph!', q[0] + 4, q[1] - 34, 18, RED);
        cap = 'bounced back... 😠';
      } else {
        walker(ctx, P[0][0], P[0][1] - 18, 12, BLUE, { angry: true });
        steam(ctx, P[0][0], P[0][1] - 34, u);
        cap = 'switch OFF: no way through!';
      }
    }
    say(ctx, cap, 190, 26, 21);
  };

  // Topology: donut = mug, and edge states that won't budge
  S.topo = function (ctx, t) {
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.ellipse(62, 70, 40, 26, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = C.card;
    ctx.beginPath(); ctx.ellipse(62, 70, 13, 7, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#d86a9a'; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(62, 60, 34, 14, 0, Math.PI, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
    say(ctx, '=', 122, 80, 34, C.text);
    rr(ctx, 148, 42, 50, 56, 8); ctx.fillStyle = BLUE; ctx.fill();
    ctx.strokeStyle = BLUE; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(200, 70, 14, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    say(ctx, 'same shape: one hole!', 125, 128, 19, C.text);
    var shake = (t % 4) < 2, y = 100;
    for (var i = 0; i < 8; i++) {
      var x = 262 + i * 28; stone(ctx, x, y + 14);
      if (i === 0 || i === 7) walker(ctx, x, y, 12, GOLD, { glow: t, happy: true });
      else {
        var r = rng(Math.floor(t * 10) + i);
        var jx = shake ? (r() - 0.5) * 10 : 0, jy = shake ? (r() - 0.5) * 8 : 0;
        walker(ctx, x + jx, y + jy, 8, BLUE, { alpha: 0.55, wow: shake });
      }
    }
    say(ctx, shake ? 'shake it!' : 'edges stay put', 360, 50, 22);
    say(ctx, 'protected edge states', 360, 150, 19, C.text);
  };

  // Two-leg ladder with magnetic flux: spread, frozen, spread again
  function ladderScene(ctx, t, dance) {
    var T = 9, tt = t % T, phi = tt / T, n = 9, y1 = 72, y2 = 132;
    var regime = phi < 0.33 ? 0 : phi < 0.66 ? 1 : 2;
    knob(ctx, 50, 104, phi, 'flux');
    for (var i = 0; i < n; i++) {
      var x = 130 + i * 40;
      if (i < n - 1) { line(ctx, x, y1, x + 40, y1, C.rule, 3); line(ctx, x, y2, x + 40, y2, C.rule, 3); }
      line(ctx, x, y1, x, y2, C.rule, 3);
      if (i < n - 1) {
        var cx = x + 20, cy = (y1 + y2) / 2, a0 = t * (1 + 5 * phi);
        ctx.strokeStyle = C.accent; ctx.globalAlpha = 0.35; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 10, a0, a0 + 1.6 * Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    var c = 4, w = regime === 1 ? 0.7 : 1.6 + 1.2 * Math.abs(Math.sin(tt * 1.5)), sway = regime === 1 ? 0 : 1.4 * Math.sin(tt * 2);
    var d = blob(n, c + sway, w);
    for (var j = 0; j < n; j++) {
      var xx = 130 + j * 40;
      if (d[j] > 0.1) {
        walker(ctx, xx, y1, 9, BLUE, { alpha: d[j], sleep: regime === 1 });
        walker(ctx, xx, y2, 9, BLUE, { alpha: d[j] * 0.8, sleep: regime === 1 });
      }
    }
    if (regime === 1) { zzz(ctx, 130 + c * 40 + 12, y1 - 12, t); }
    if (dance) {
      for (var m = 0; m < 4; m++) {
        var k = (t * 0.4 + m / 4) % 1;
        ctx.globalAlpha = 1 - k; say(ctx, m % 2 ? '♪' : '♫', 150 + m * 80 + 10 * Math.sin(t + m), 50 - k * 30, 20, C.accent); ctx.globalAlpha = 1;
      }
    }
    var caps = dance ? ['the music starts: spread out!', 'tempo change: freeze!', 'and dance again!']
                     : ['low flux: spreading out', 'more flux: frozen! ❄', 'even more: free again!'];
    say(ctx, caps[regime], 290, 172, 21, C.text);
  }
  S.ladder = function (ctx, t) { ladderScene(ctx, t, false); };
  S.ladderDance = function (ctx, t) { ladderScene(ctx, t, true); };

  // Constrained bosons: house rules on how many can share a site
  S.constrained = function (ctx, t) {
    var T = 8, tt = t % T, sites = [];
    for (var i = 0; i < 6; i++) { sites.push([190 + i * 46, 78]); sites.push([190 + i * 46, 138]); }
    rr(ctx, 18, 30, 130, 72, 8); ctx.fillStyle = C.card; ctx.fill(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
    say(ctx, 'House rules:', 83, 54, 19, C.accent); say(ctx, 'no crowding!', 83, 78, 19, C.text); say(ctx, '🏠', 83, 98, 18);
    line(ctx, 83, 102, 83, 150, C.muted, 3);
    for (var r = 0; r < 6; r++) {
      line(ctx, sites[2 * r][0], 78, sites[2 * r][0], 138, C.rule, 2);
      if (r < 5) { line(ctx, sites[2 * r][0], 78, sites[2 * r + 2][0], 78, C.rule, 2); line(ctx, sites[2 * r][0], 138, sites[2 * r + 2][0], 138, C.rule, 2); }
    }
    sites.forEach(function (s) { stone(ctx, s[0], s[1] + 11, 12); });
    var order = [0, 3, 4, 7, 8, 11];
    order.forEach(function (sidx, k) {
      var t0 = 0.3 + k * 0.5; if (tt < t0) return;
      var f = ease((tt - t0) / 0.4), s = sites[sidx];
      var glow = tt > 5.6 ? tt : 0;
      walker(ctx, s[0], lerp(-20, s[1], f), 11, GREEN, { happy: tt > 5.6, glow: glow });
    });
    if (tt > 3.6 && tt < 5.4) {
      var s3 = sites[3], k2 = (tt - 3.6) / 1.8;
      var yy = k2 < 0.4 ? lerp(-20, s3[1] - 24, k2 / 0.4) : lerp(s3[1] - 24, -30, (k2 - 0.4) / 0.6);
      var xx = k2 < 0.4 ? s3[0] : lerp(s3[0], s3[0] + 120, (k2 - 0.4) / 0.6);
      walker(ctx, xx, yy, 11, RED, { wow: true });
      if (k2 > 0.3 && k2 < 0.8) say(ctx, '✋ full!', s3[0] + 30, s3[1] - 30, 20, RED);
    }
    say(ctx, tt > 5.6 ? 'a quantum phase forms ✨' : 'bosons move in, one by one...', 310, 30, 19, C.text);
  };

  // PRB: a quasiperiodic lattice whose landscape is reshaped by a detuning knob,
  // giving extended -> localized -> extended -> localized
  S.quasi = function (ctx, t) {
    var T = 12, tt = t % T, D = tt / T, reg = Math.min(3, Math.floor(D * 4)), loc = reg % 2 === 1;
    var n = 12, beta = 0.618, x0 = 160, dx = 27, yb = 100, pts = [];
    knob(ctx, 62, 104, D, 'detuning');
    for (var i = 0; i < n; i++) {
      var off = 11 * Math.cos(2 * Math.PI * beta * i + 0.6) + D * 17 * (i % 2 ? 1 : -1);
      pts.push([x0 + i * dx, yb + off]);
    }
    for (var j = 0; j < n - 1; j++) bond(ctx, pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], 3);
    pts.forEach(function (p) { site(ctx, p[0], p[1], 6, GOLD); line(ctx, p[0], p[1] + 7, p[0], 150, 'rgba(120,110,95,0.18)', 1.5, [2, 3]); });
    line(ctx, x0 - 8, 150, x0 + (n - 1) * dx + 8, 150, C.rule, 1.5);
    small(ctx, 'on-site energies', x0 + (n - 1) * dx / 2, 164);
    if (loc) {
      var c = reg === 1 ? 4 : 8, p = pts[c];
      walker(ctx, p[0], p[1] - 15, 11, BLUE, { sleep: true }); zzz(ctx, p[0] + 10, p[1] - 30, t);
    } else {
      var d = blob(n, 5.5 + 4 * Math.sin(tt * 1.5), 3.2);
      pts.forEach(function (pp, k) { if (d[k] > 0.12) walker(ctx, pp[0], pp[1] - 15, 10, BLUE, { alpha: d[k], happy: true }); });
    }
    var words = ['extended', 'localized', 'extended', 'localized'];
    words.forEach(function (w, k) {
      var x = 66 + k * 114;
      say(ctx, w, x, 30, k === reg ? 21 : 17, k === reg ? C.accent : C.muted);
      if (k < 3) say(ctx, '→', x + 57, 30, 17, C.muted);
    });
  };

  // First paper: light (fast) + heavy (slow) particle with on-site interaction U.
  // Real two-particle simulation: the light wave hits the heavy one, reflects, and interferes.
  S.first = (function () {
    var N = 26, JL = 1, JH = 0.12, U = 6, i0 = 6, j0 = 17, sig = 1.6, kx = Math.PI / 2, size = N * N;
    var re = new Float64Array(size), im = new Float64Array(size), simT = 0;
    var k = [], tr = new Float64Array(size), ti = new Float64Array(size);
    for (var q = 0; q < 4; q++) k.push([new Float64Array(size), new Float64Array(size)]);
    // light particle: a right-moving Gaussian wave packet; heavy particle: one site
    function reset() {
      re.fill(0); im.fill(0); var norm = 0;
      for (var a = 0; a < N; a++) { var g = Math.exp(-Math.pow(a - i0, 2) / (2 * sig * sig)); norm += g * g; }
      norm = Math.sqrt(norm);
      for (var a2 = 0; a2 < N; a2++) {
        var g2 = Math.exp(-Math.pow(a2 - i0, 2) / (2 * sig * sig)) / norm;
        re[a2 * N + j0] = g2 * Math.cos(kx * a2); im[a2 * N + j0] = g2 * Math.sin(kx * a2);
      }
      simT = 0;
    }
    function deriv(r, i, dr, di) {
      for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) {
        var idx = a * N + b, hr = 0, hi = 0;
        if (a > 0) { hr -= JL * r[idx - N]; hi -= JL * i[idx - N]; }
        if (a < N - 1) { hr -= JL * r[idx + N]; hi -= JL * i[idx + N]; }
        if (b > 0) { hr -= JH * r[idx - 1]; hi -= JH * i[idx - 1]; }
        if (b < N - 1) { hr -= JH * r[idx + 1]; hi -= JH * i[idx + 1]; }
        if (a === b) { hr += U * r[idx]; hi += U * i[idx]; }
        dr[idx] = hi; di[idx] = -hr;
      }
    }
    function step(dt) {
      deriv(re, im, k[0][0], k[0][1]);
      for (var s2 = 1; s2 < 4; s2++) {
        var f = s2 === 3 ? dt : dt / 2;
        for (var m = 0; m < size; m++) { tr[m] = re[m] + f * k[s2 - 1][0][m]; ti[m] = im[m] + f * k[s2 - 1][1][m]; }
        deriv(tr, ti, k[s2][0], k[s2][1]);
      }
      for (var m2 = 0; m2 < size; m2++) {
        re[m2] += dt / 6 * (k[0][0][m2] + 2 * k[1][0][m2] + 2 * k[2][0][m2] + k[3][0][m2]);
        im[m2] += dt / 6 * (k[0][1][m2] + 2 * k[1][1][m2] + 2 * k[2][1][m2] + k[3][1][m2]);
      }
      simT += dt;
    }
    reset();
    return function (ctx, t) {
      var T = 9, target = (t % T) * 1.25;
      if (target < simT - 1e-9) reset();
      var guard = 0; while (simT < target && guard++ < 700) step(0.015);
      var nL = new Float64Array(N), nH = new Float64Array(N);
      for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) { var p = re[a * N + b] * re[a * N + b] + im[a * N + b] * im[a * N + b]; nL[a] += p; nH[b] += p; }
      // both densities drawn upward from the same lattice line, side by side
      var x0 = 28, dx = 17, y = 150, mL = 0, mH = 0, hMax = 92;
      for (var c = 0; c < N; c++) { mL = Math.max(mL, nL[c]); mH = Math.max(mH, nH[c]); }
      line(ctx, x0 - 8, y, x0 + (N - 1) * dx + 8, y, 'rgba(120,110,95,0.35)', 3);
      for (var s3 = 0; s3 < N; s3++) {
        var x = x0 + s3 * dx;
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = BLUE; var hL = hMax * Math.sqrt(nL[s3]); ctx.fillRect(x - 7, y - 7 - hL, 7, hL);
        ctx.fillStyle = RED; var hH = hMax * Math.sqrt(nH[s3]); ctx.fillRect(x, y - 7 - hH, 7, hH);
        ctx.globalAlpha = 1;
        site(ctx, x, y, 4.5);
      }
      for (var s4 = 0; s4 < N; s4++) {
        var aL = Math.sqrt(nL[s4] / mL), aH = Math.sqrt(nH[s4] / mH);
        var tL = y - 16 - hMax * Math.sqrt(nL[s4]), tH = y - 18 - hMax * Math.sqrt(nH[s4]);
        if (aH > 0.3) walker(ctx, x0 + s4 * dx + 3, tH, 10, RED, { alpha: aH, wow: simT > 3.5 && simT < 7 });
        if (aL > 0.15) walker(ctx, x0 + s4 * dx - 3, tL, 7.5, BLUE, { alpha: aL, happy: true });
      }
      dot(ctx, 26, 168, 5, BLUE); small(ctx, 'light, fast hopper (A)', 36, 172, BLUE, 'left');
      dot(ctx, 200, 168, 5, RED); small(ctx, 'heavy, slow hopper (B)', 210, 172, RED, 'left');
      var cap = simT < 3.6 ? 'the light one races ahead...' : simT < 7 ? 'bonk! the heavy one blocks it' : 'reflected: interference fringes ✨';
      say(ctx, cap, 240, 24, 20);
    };
  })();

  // Preprint: two Aubry-Andre legs; a staggered detuning on the top leg only
  // localizes the bottom (extended) leg, then more detuning frees it again
  S.proximity = function (ctx, t) {
    var T = 11, tt = t % T, D = tt / T, n = 11, beta = 0.618, x0 = 170, dx = 28, y1 = 64, y2 = 132;
    var regime = D < 0.3 ? 0 : D < 0.66 ? 1 : 2, top = [], bot = [];
    for (var i = 0; i < n; i++) {
      var aa = 8 * Math.cos(2 * Math.PI * beta * i + 0.4);
      top.push([x0 + i * dx, y1 + aa + D * 15 * (i % 2 ? 1 : -1)]);
      bot.push([x0 + i * dx, y2 + 8 * Math.cos(2 * Math.PI * beta * i + 2.1)]);
    }
    for (var r = 0; r < n; r++) line(ctx, top[r][0], top[r][1] + 6, bot[r][0], bot[r][1] - 6, 'rgba(120,110,95,0.25)', 1.5, [3, 3]);
    for (var j = 0; j < n - 1; j++) { bond(ctx, top[j][0], top[j][1], top[j + 1][0], top[j + 1][1], 3); bond(ctx, bot[j][0], bot[j][1], bot[j + 1][0], bot[j + 1][1], 3); }
    top.forEach(function (p) { site(ctx, p[0], p[1], 6, GOLD); });
    bot.forEach(function (p) { site(ctx, p[0], p[1], 6, '#7fa7de'); });
    small(ctx, 'AA + detuning', 156, y1 + 4, C.text, 'right');
    small(ctx, 'AA (extended)', 156, y2 + 4, C.text, 'right');
    knob(ctx, 52, 160, D, '');
    small(ctx, 'detuning', 52, 178);
    var d = regime === 1 ? blob(n, 5, 0.7) : blob(n, 5 + 3 * Math.sin(tt * 1.6), 2.6);
    bot.forEach(function (p, k) { if (d[k] > 0.12) walker(ctx, p[0], p[1] - 15, 10, BLUE, { alpha: d[k], sleep: regime === 1, happy: regime !== 1 }); });
    if (regime === 1) { zzz(ctx, bot[5][0] + 10, bot[5][1] - 30, t); say(ctx, '*yawn*', bot[5][0] + 30, bot[5][1] + 34, 17, C.muted); }
    var caps = ['both legs: particles roam freely', 'detune the top leg: bottom gets stuck!', 'more detuning: free again!'];
    say(ctx, caps[regime], 300, 22, 18, C.text);
  };

  // Travel story (staged)
  var pins = {
    guwahati: [150, 66, 'IIT Guwahati'], kolkata: [118, 104, 'Kolkata'], taiwan: [368, 62, 'NTHU Taiwan'],
    singapore: [282, 142, 'NTU Singapore'], japan: [440, 34, 'Japan'], germany: [34, 30, 'Germany'],
    italy: [64, 150, 'Italy'], usa: [440, 150, 'USA']
  };
  function pin(ctx, p, on) {
    line(ctx, p[0], p[1], p[0], p[1] - 14, on ? C.accent : C.muted, 2.5);
    dot(ctx, p[0], p[1] - 18, on ? 7 : 5, on ? RED : C.muted);
    small(ctx, p[2], p[0], p[1] + 14, on ? C.text : C.muted);
  }
  function arcPos(a, b, k, hgt) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - 22 - Math.sin(k * Math.PI) * (hgt || 40)]; }
  S.travel = function (ctx, t, stage) {
    var keys = Object.keys(pins);
    var on = [['guwahati', 'kolkata'], ['kolkata', 'taiwan', 'singapore'], ['singapore', 'japan', 'germany', 'italy', 'usa'], keys][stage % 4];
    keys.forEach(function (k) { pin(ctx, pins[k], on.indexOf(k) !== -1); });
    var p;
    if (stage % 4 === 0) {
      var k0 = (Math.sin(t * 1.5) + 1) / 2; p = arcPos(pins.guwahati, pins.kolkata, k0, 22);
      walker(ctx, p[0], p[1], 11, BLUE, { happy: true });
      say(ctx, 'India: Ph.D. + first postdoc', 270, 112, 19, C.text);
    } else if (stage % 4 === 1) {
      var k1 = (t % 4) / 4, a = k1 < 0.5 ? pins.kolkata : pins.taiwan, b = k1 < 0.5 ? pins.taiwan : pins.singapore;
      p = arcPos(a, b, ease((k1 % 0.5) * 2), 50);
      walker(ctx, p[0], p[1], 11, BLUE, { happy: true, look: b[0] - a[0] });
      say(ctx, 'next: Taiwan, then Singapore!', 240, 112, 19, C.text);
    } else if (stage % 4 === 2) {
      walker(ctx, pins.singapore[0], pins.singapore[1] - 24, 11, BLUE, { happy: true });
      ['japan', 'germany', 'italy', 'usa'].forEach(function (k, i) {
        var kk = ((t * 0.5 + i / 4) % 1), q = arcPos(pins.singapore, pins[k], kk, 30);
        say(ctx, '✈', q[0], q[1] + 6, 18, C.accent);
      });
      say(ctx, 'talks around the world', 250, 100, 21, C.text);
    } else {
      keys.forEach(function (k, i) { walker(ctx, pins[k][0], pins[k][1] - 24, 9, BLUE, { alpha: 0.35 + 0.2 * Math.sin(t * 3 + i), happy: true }); });
      walker(ctx, pins.singapore[0], pins.singapore[1] - 24, 11, RED, { happy: true });
      say(ctx, 'Qubi: everywhere at once 😎', 250, 100, 21, C.text);
    }
  };

  // Where to start (staged path of stepping stones)
  S.path = function (ctx, t, stage) {
    var stops = [[40, 130, 'start'], [118, 96, 'NISQ'], [196, 128, 'tensor nets'], [274, 94, 'quantum walks'], [352, 126, 'IBM Learning'], [430, 92, 'email!']];
    var cur = clamp(stage, 0, 5);
    ctx.strokeStyle = C.rule; ctx.lineWidth = 3; ctx.setLineDash([5, 6]); ctx.beginPath();
    stops.forEach(function (s, i) { i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.stroke(); ctx.setLineDash([]);
    stops.forEach(function (s, i) {
      stone(ctx, s[0], s[1] + 12, 16, i <= cur ? 'rgba(63,116,196,0.25)' : C.rule);
      if (i >= 1 && i <= 4) {
        rr(ctx, s[0] - 12, s[1] - 44, 24, 30, 3); ctx.fillStyle = [BLUE, GOLD, GREEN, RED][i - 1]; ctx.fill();
        line(ctx, s[0] - 7, s[1] - 36, s[0] + 7, s[1] - 36, '#fff', 2);
      }
      if (i === 5) { rr(ctx, s[0] - 15, s[1] - 40, 30, 20, 3); ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s[0] - 15, s[1] - 40); ctx.lineTo(s[0], s[1] - 28); ctx.lineTo(s[0] + 15, s[1] - 40); ctx.stroke(); }
      small(ctx, s[2], s[0], s[1] + 34, i === cur ? C.text : C.muted);
    });
    var s = stops[cur], hop = Math.abs(Math.sin(t * 4)) * 8;
    walker(ctx, s[0], s[1] - 2 - hop, 12, BLUE, { happy: true });
    say(ctx, cur === 0 ? 'your reading adventure' : 'step ' + cur + (cur === 5 ? ': say hi!' : ''), 240, 24, 21, C.accent);
  };

  // ---------- quantum-fact scenes ----------
  S.coin = function (ctx, t) {
    var T = 4, tt = t % T, measured = tt > 2.8, r = rng(Math.floor(t / T)), face = r() < 0.5 ? '0' : '1';
    var sx = measured ? 1 : Math.cos(tt * 9), w = 44 * Math.abs(sx);
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(160, 92, Math.max(w, 3), 44, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#c78f12'; ctx.lineWidth = 3; ctx.stroke();
    if (w > 14) say(ctx, measured ? face : (sx > 0 ? '0' : '1'), 160, 106, 40, '#7a5408');
    say(ctx, measured ? 'measured: ' + face + '!' : 'spinning: 0 AND 1', 350, 80, 24, C.text);
    say(ctx, measured ? 'only one answer 👀' : '(superposition)', 350, 112, 20, C.muted);
  };
  S.entangle = function (ctx, t) {
    var T = 3, tt = t % T, r = rng(Math.floor(t / T)), up = r() < 0.5, meas = tt > 1.6;
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.beginPath();
    for (var x = 110; x <= 370; x += 3) { var y = 92 + 8 * Math.sin((x - 110) / 10 - t * 6); x === 110 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.globalAlpha = 1;
    [90, 390].forEach(function (x) {
      walker(ctx, x, 92, 20, BLUE, { wow: !meas, happy: meas });
      say(ctx, meas ? (up ? '↑' : '↓') : '?', x, 52, 30, meas ? C.accent : C.muted);
    });
    say(ctx, meas ? 'both ' + (up ? 'up' : 'down') + ', always together!' : 'far apart, still linked...', 240, 160, 22, C.text);
  };
  S.localize = function (ctx, t) {
    var r = rng(7);
    var ys = []; for (var i = 0; i <= 28; i++) ys.push(112 + (r() - 0.5) * 50);
    ys[14] = 140;
    ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.beginPath();
    ys.forEach(function (y, i) { var x = 30 + i * 15; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    var j = Math.sin(t * 8) * 2;
    walker(ctx, 240 + j, 128, 11, BLUE, { sleep: true });
    zzz(ctx, 250, 112, t);
    say(ctx, 'random bumps everywhere...', 240, 36, 21, C.text);
    say(ctx, 'no walls, still stuck!', 240, 172, 21, C.text);
  };
  S.noisy = S.chip;
  S.feynman = function (ctx, t) {
    dot(ctx, 120, 92, 8, RED);
    for (var i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(120, 92); ctx.rotate(i * Math.PI / 3);
      ctx.strokeStyle = BLUE; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 56, 18, 0, 0, 2 * Math.PI); ctx.stroke();
      var a = t * (2 + i * 0.7) + i; dot(ctx, 56 * Math.cos(a), 18 * Math.sin(a), 5, GOLD);
      ctx.restore();
    }
    say(ctx, 'nature is quantum...', 115, 170, 18, C.text);
    say(ctx, '=', 240, 104, 36, C.text);
    rr(ctx, 310, 50, 90, 84, 10); ctx.fillStyle = C.card; ctx.fill(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.stroke();
    for (var q = 0; q < 4; q++) dot(ctx, 332 + (q % 2) * 46, 72 + Math.floor(q / 2) * 40, 7, Math.floor(t * 2) % 4 === q ? GOLD : BLUE);
    say(ctx, '...so simulate it quantumly!', 360, 170, 18, C.text);
  };
  S.bunch = function (ctx, t) {
    var T = 5, tt = t % T, r = rng(Math.floor(t / T)), dir = r() < 0.5 ? -1 : 1;
    line(ctx, 240, 40, 240, 150, C.muted, 3, [6, 5]);
    small(ctx, 'beam splitter', 240, 34);
    if (tt < 2) {
      var k = ease(tt / 2);
      walker(ctx, lerp(60, 222, k), 100, 13, BLUE, { look: 1 });
      walker(ctx, lerp(420, 258, k), 100, 13, RED, { look: -1 });
      say(ctx, 'one from each side...', 240, 172, 21, C.text);
    } else {
      var k2 = ease((tt - 2) / 2.5), x = lerp(240, 240 + dir * 160, k2);
      walker(ctx, x - 12, 100, 13, BLUE, { happy: true }); walker(ctx, x + 12, 100, 13, RED, { happy: true });
      say(ctx, '...and they leave together!', 240, 172, 21, C.text);
    }
  };

  // ---------- public API ----------
  window.QubiScenes = {
    W: W, H: H,
    has: function (name) { return !!S[name]; },
    draw: function (ctx, name, t, stage) {
      readColors();
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      S[name](ctx, t, stage || 0);
    }
  };
})();
