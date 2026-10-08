// Page-specific quantum animation shown in the empty right-hand margin on wide screens.
//   About        -> qubit Rabi oscillation on the Bloch sphere
//   Research     -> quantum-walk light cone (site vs. time)
//   Publications -> quantum circuit preparing a GHZ state
//   Experience   -> entangled Bell pair with correlated measurements
//   Reading      -> DMRG sweep over a matrix product state
(function () {
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var page = {
    'index.html': 'bloch', '': 'bloch', 'research.html': 'lightcone',
    'publications.html': 'circuit', 'experience.html': 'bell', 'reading.html': 'mps'
  }[file];
  if (!page) return;

  var captions = {
    bloch: 'A qubit undergoing Rabi oscillations on the Bloch sphere',
    lightcone: 'Quantum walk light cone: one particle spreading over time',
    circuit: 'A three-qubit circuit preparing a GHZ state',
    bell: 'Entangled qubits: measurements always agree',
    mps: 'DMRG sweeping over a matrix product state'
  };

  var fig = document.createElement('figure');
  fig.className = 'qside';
  fig.setAttribute('aria-hidden', 'true');
  var canvas = document.createElement('canvas');
  var cap = document.createElement('figcaption');
  cap.textContent = captions[page];
  fig.appendChild(canvas); fig.appendChild(cap);
  document.body.appendChild(fig);

  var ctx = canvas.getContext('2d');
  var W = 200, H = 230;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var col = {};
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    col.accent = cs.getPropertyValue('--accent').trim() || '#1f3f6e';
    col.muted = cs.getPropertyValue('--muted').trim() || '#6b665d';
    col.rule = cs.getPropertyValue('--rule').trim() || '#e2ddd1';
    col.bg = cs.getPropertyValue('--bg').trim() || '#fbf9f4';
    col.text = cs.getPropertyValue('--text').trim() || '#2a2723';
  }
  readColors();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);

  function setup() {
    var dpr = Math.max(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  setup();

  function label(text, x, y, align, size, color) {
    ctx.fillStyle = color || col.muted;
    ctx.font = (size || 11) + 'px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.fillText(text, x, y);
  }

  // ---------- 1D continuous-time quantum walk (shared by light cone) ----------
  function makeWalk(N) {
    var w = { N: N, re: new Float64Array(N), im: new Float64Array(N), t: 0 };
    var kr = [], ki = [], tr = new Float64Array(N), ti = new Float64Array(N);
    for (var j = 0; j < 4; j++) { kr.push(new Float64Array(N)); ki.push(new Float64Array(N)); }
    function deriv(r, i, dr, di) {
      for (var n = 0; n < N; n++) {
        var hr = -((n > 0 ? r[n - 1] : 0) + (n < N - 1 ? r[n + 1] : 0));
        var hi = -((n > 0 ? i[n - 1] : 0) + (n < N - 1 ? i[n + 1] : 0));
        dr[n] = hi; di[n] = -hr;
      }
    }
    w.reset = function () { w.re.fill(0); w.im.fill(0); w.re[(N - 1) / 2] = 1; w.t = 0; };
    w.step = function (dt) {
      deriv(w.re, w.im, kr[0], ki[0]);
      for (var s = 1; s < 4; s++) {
        var f = s === 3 ? dt : dt / 2;
        for (var n = 0; n < N; n++) { tr[n] = w.re[n] + f * kr[s - 1][n]; ti[n] = w.im[n] + f * ki[s - 1][n]; }
        deriv(tr, ti, kr[s], ki[s]);
      }
      for (var m = 0; m < N; m++) {
        w.re[m] += dt / 6 * (kr[0][m] + 2 * kr[1][m] + 2 * kr[2][m] + kr[3][m]);
        w.im[m] += dt / 6 * (ki[0][m] + 2 * ki[1][m] + 2 * ki[2][m] + ki[3][m]);
      }
      w.t += dt;
    };
    w.reset();
    return w;
  }

  // ---------- Scenes ----------
  var scenes = {};

  // Bloch sphere with a Rabi-oscillating state vector
  scenes.bloch = (function () {
    var cx = 100, cy = 112, R = 72, az = -0.55, el = 0.32, trail = [];
    function proj(x, y, z) {
      var x1 = x * Math.cos(az) - y * Math.sin(az);
      var y1 = x * Math.sin(az) + y * Math.cos(az);
      return [cx + R * x1, cy - R * (z * Math.cos(el) - y1 * Math.sin(el)), y1];
    }
    return function (time) {
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      // equator
      ctx.beginPath();
      for (var u = 0; u <= 64; u++) {
        var p = proj(Math.cos(u / 64 * 2 * Math.PI), Math.sin(u / 64 * 2 * Math.PI), 0);
        u ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
      // z axis
      ctx.setLineDash([3, 3]);
      var top = proj(0, 0, 1), bot = proj(0, 0, -1);
      ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bot[0], bot[1]); ctx.stroke();
      ctx.setLineDash([]);
      label('|0⟩', top[0], top[1] - 7, 'center', 12, col.text);
      label('|1⟩', bot[0], bot[1] + 16, 'center', 12, col.text);
      // state: Rabi rotation theta(t), slow precession phi(t)
      var th = 1.1 * time, ph = 0.35 * time;
      var s = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
      var tip = proj(s[0], s[1], s[2]);
      trail.push(tip); if (trail.length > 70) trail.shift();
      for (var i = 1; i < trail.length; i++) {
        ctx.globalAlpha = i / trail.length * 0.6;
        ctx.strokeStyle = col.accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col.accent; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      ctx.fillStyle = col.accent;
      ctx.beginPath(); ctx.arc(tip[0], tip[1], 4.5, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 2 * Math.PI); ctx.fill();
      var p0 = Math.cos(th / 2) * Math.cos(th / 2);
      label('P(|0⟩) = ' + p0.toFixed(2), cx, H - 6, 'center', 11);
    };
  })();

  // Light cone: probability on each site, one row per time slice
  scenes.lightcone = (function () {
    var N = 31, rows = [], maxRows = 56, walk = makeWalk(N), hold = 0, sub = 0;
    var x0 = 18, y0 = 14, gw = 172, gh = 182;
    return function (time, dt) {
      if (hold > 0) { hold -= dt; if (hold <= 0) { rows = []; walk.reset(); } }
      else {
        for (var k = 0; k < 2; k++) {
          walk.step(0.01);
          if (++sub >= 12) {
            sub = 0;
            var r = new Float32Array(N);
            for (var n = 0; n < N; n++) r[n] = walk.re[n] * walk.re[n] + walk.im[n] * walk.im[n];
            rows.push(r);
            if (rows.length >= maxRows) { hold = 1.6; break; }
          }
        }
      }
      var cw = gw / N, ch = gh / maxRows;
      ctx.fillStyle = col.accent;
      for (var i = 0; i < rows.length; i++) {
        for (var n2 = 0; n2 < N; n2++) {
          var a = Math.min(1, Math.sqrt(rows[i][n2]) * 1.6);
          if (a < 0.02) continue;
          ctx.globalAlpha = a;
          ctx.fillRect(x0 + n2 * cw, y0 + i * ch, cw + 0.4, ch + 0.4);
        }
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, gw, gh);
      label('site', x0 + gw / 2, y0 + gh + 14, 'center', 11);
      ctx.save(); ctx.translate(10, y0 + gh / 2); ctx.rotate(-Math.PI / 2);
      label('time →', 0, 0, 'center', 11); ctx.restore();
    };
  })();

  // Circuit: H, CNOT, CNOT, measure -> |000> or |111>
  scenes.circuit = (function () {
    var wires = [48, 98, 148], xs = 26, xe = 186, period = 4.2, outcome = '000', lastCycle = -1;
    function box(x, y, txt, lit) {
      ctx.fillStyle = lit ? col.accent : col.bg;
      ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5;
      ctx.fillRect(x - 11, y - 11, 22, 22); ctx.strokeRect(x - 11, y - 11, 22, 22);
      label(txt, x, y + 4.5, 'center', 13, lit ? col.bg : col.accent);
    }
    function cnot(x, c, t, lit) {
      ctx.strokeStyle = col.accent; ctx.fillStyle = col.accent; ctx.lineWidth = lit ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(x, wires[c]); ctx.lineTo(x, wires[t] + 9); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, wires[c], lit ? 5 : 4, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = lit ? col.accent : col.bg;
      ctx.beginPath(); ctx.arc(x, wires[t], 9, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = lit ? col.bg : col.accent;
      ctx.beginPath(); ctx.moveTo(x - 9, wires[t]); ctx.lineTo(x + 9, wires[t]);
      ctx.moveTo(x, wires[t] - 9); ctx.lineTo(x, wires[t] + 9); ctx.stroke();
    }
    function meter(x, y, lit) {
      ctx.fillStyle = lit ? col.accent : col.bg; ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5;
      ctx.fillRect(x - 11, y - 11, 22, 22); ctx.strokeRect(x - 11, y - 11, 22, 22);
      ctx.strokeStyle = lit ? col.bg : col.accent;
      ctx.beginPath(); ctx.arc(x, y + 5, 7, Math.PI, 2 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.lineTo(x + 5, y - 4); ctx.stroke();
    }
    return function (time) {
      var cycle = Math.floor(time / period), ph = (time % period) / period;
      if (cycle !== lastCycle) { lastCycle = cycle; outcome = Math.random() < 0.5 ? '000' : '111'; }
      var px = xs + (xe - xs) * Math.min(1, ph / 0.75);
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1.5;
      wires.forEach(function (y, i) {
        ctx.beginPath(); ctx.moveTo(xs, y); ctx.lineTo(xe, y); ctx.stroke();
        label('q' + i, 12, y + 4, 'center', 11);
      });
      function near(x) { return Math.abs(px - x) < 10 && ph < 0.78; }
      box(56, wires[0], 'H', near(56));
      cnot(96, 0, 1, near(96));
      cnot(132, 1, 2, near(132));
      wires.forEach(function (y) { meter(168, y, near(168)); });
      if (ph < 0.75) {
        ctx.fillStyle = col.accent;
        wires.forEach(function (y) {
          ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(px, y, 7, 0, 2 * Math.PI); ctx.fill();
          ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(px, y, 3, 0, 2 * Math.PI); ctx.fill();
        });
        ctx.globalAlpha = 1;
        label('(|000⟩ + |111⟩)/√2', W / 2, 196, 'center', 12);
      } else {
        ctx.globalAlpha = Math.min(1, (ph - 0.75) / 0.06);
        label('measured: |' + outcome + '⟩', W / 2, 196, 'center', 15, col.accent);
        ctx.globalAlpha = 1;
      }
      label('50% |000⟩ · 50% |111⟩', W / 2, 220, 'center', 10);
    };
  })();

  // Bell pair: spinning superposition, then correlated measurement
  scenes.bell = (function () {
    var A = [52, 96], B = [148, 96], r = 34, period = 3.4, out = 1, lastCycle = -1;
    function qubit(c, ang, flash) {
      if (flash > 0) {
        ctx.globalAlpha = flash * 0.35; ctx.fillStyle = col.accent;
        ctx.beginPath(); ctx.arc(c[0], c[1], r + 10 * (1 - flash) + 4, 0, 2 * Math.PI); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = col.bg; ctx.strokeStyle = col.rule; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(c[0], c[1], r, r * 0.3, 0, 0, 2 * Math.PI); ctx.stroke();
      var tx = c[0] + r * 0.85 * Math.sin(ang), ty = c[1] - r * 0.85 * Math.cos(ang);
      ctx.strokeStyle = col.accent; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = col.accent; ctx.beginPath(); ctx.arc(tx, ty, 4, 0, 2 * Math.PI); ctx.fill();
    }
    return function (time) {
      var cycle = Math.floor(time / period), ph = (time % period) / period;
      if (cycle !== lastCycle) { lastCycle = cycle; out = Math.random() < 0.5 ? 0 : Math.PI; }
      var measured = ph > 0.6;
      // wavy entanglement link
      ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5; ctx.globalAlpha = measured ? 0.25 : 0.6;
      ctx.beginPath();
      for (var x = A[0] + r; x <= B[0] - r; x += 2) {
        var y = A[1] + 6 * Math.sin((x - A[0]) / 6 - time * 6);
        x === A[0] + r ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
      var angA, angB, flash = 0;
      if (!measured) { angA = time * 4.2; angB = -time * 3.1 + 1; }
      else { angA = angB = out; flash = Math.max(0, 1 - (ph - 0.6) / 0.2); }
      qubit(A, angA, flash); qubit(B, angB, flash);
      label('A', A[0], A[1] + r + 16, 'center', 12, col.text);
      label('B', B[0], B[1] + r + 16, 'center', 12, col.text);
      if (measured) {
        label(out === 0 ? 'both ↑  (|00⟩)' : 'both ↓  (|11⟩)', W / 2, 178, 'center', 15, col.accent);
      } else {
        label('(|00⟩ + |11⟩)/√2', W / 2, 178, 'center', 13, col.text);
      }
      label('measuring A fixes B', W / 2, 206, 'center', 10);
    };
  })();

  // MPS chain with a two-site DMRG sweep and a converging energy plot
  scenes.mps = (function () {
    var L = 7, x0 = 28, dx = 24, y = 70, sweepTime = 1.6, energies = [], lastHalf = -1;
    return function (time) {
      var half = Math.floor(time / sweepTime), ph = (time % sweepTime) / sweepTime;
      var dir = half % 2 === 0 ? 1 : -1;
      var pos = dir > 0 ? ph * (L - 2) : (1 - ph) * (L - 2);
      var site = Math.round(pos);
      if (half !== lastHalf) {
        lastHalf = half;
        if (energies.length >= 12) energies = [];
        energies.push(-1 - 0.9 * (1 - Math.exp(-0.7 * energies.length)));
      }
      // bonds
      for (var i = 0; i < L - 1; i++) {
        var lit = i === site;
        ctx.strokeStyle = col.accent; ctx.lineWidth = lit ? 3.5 : 1.5; ctx.globalAlpha = lit ? 1 : 0.5;
        ctx.beginPath(); ctx.moveTo(x0 + i * dx, y); ctx.lineTo(x0 + (i + 1) * dx, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // physical legs + tensors
      for (var j = 0; j < L; j++) {
        var on = j === site || j === site + 1, x = x0 + j * dx;
        ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 22); ctx.stroke();
        ctx.fillStyle = on ? col.accent : col.bg;
        ctx.beginPath(); ctx.arc(x, y, on ? 9 : 7.5, 0, 2 * Math.PI); ctx.fill();
        ctx.lineWidth = 1.8; ctx.stroke();
      }
      label(dir > 0 ? 'sweep →' : '← sweep', W / 2, y - 22, 'center', 11);
      // energy convergence
      var px = 30, py = 128, pw = 150, ph2 = 70;
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph2); ctx.lineTo(px + pw, py + ph2); ctx.stroke();
      label('energy', px - 4, py - 4, 'left', 10);
      label('sweeps', px + pw, py + ph2 + 13, 'right', 10);
      ctx.fillStyle = col.accent; ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5;
      ctx.beginPath();
      energies.forEach(function (e, k) {
        var ex = px + 8 + k * (pw - 16) / 11, ey = py + 6 + (e + 1) / -0.9 * (ph2 - 12);
        k ? ctx.lineTo(ex, ey) : ctx.moveTo(ex, ey);
      });
      ctx.stroke();
      energies.forEach(function (e, k) {
        var ex = px + 8 + k * (pw - 16) / 11, ey = py + 6 + (e + 1) / -0.9 * (ph2 - 12);
        ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, 2 * Math.PI); ctx.fill();
      });
    };
  })();

  // ---------- Run ----------
  var scene = scenes[page], start = performance.now(), last = start;
  function frame(now) {
    var time = (now - start) / 1000, dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (getComputedStyle(fig).display !== 'none') {
      ctx.clearRect(0, 0, W, H);
      scene(time, dt);
    }
    if (!reduceMotion) requestAnimationFrame(frame);
  }
  if (reduceMotion) {
    // Single still frame, advanced a little so each scene shows something meaningful
    for (var i = 0; i < 260; i++) { ctx.clearRect(0, 0, W, H); scene(i * 0.04, 0.04); }
  }
  else requestAnimationFrame(frame);
})();
