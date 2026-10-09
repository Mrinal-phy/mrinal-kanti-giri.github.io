// Quantum Playbook engine: widgets, Qubi callouts, quizzes and progress.
// Widgets are declared in the page with data-widget="..." and share one "lab qubit".
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(x) { var s = (Math.abs(x) < 0.005 ? 0 : x).toFixed(2); return s === '-0.00' ? '0.00' : s; }
  function amp(x) { return (x < 0 ? '− ' : '') + Math.abs(x).toFixed(2); }

  // ---------- progress (stored only in this visitor's browser) ----------
  var PB = window.PB = window.PB || {};
  PB.progress = function (ch, data) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem('pb-progress') || '{}'); } catch (e) {}
    if (data === undefined) return ch ? all[ch] : all;
    var old = all[ch] || {};
    if (!old.stars || data.stars >= old.stars) all[ch] = data;
    try { localStorage.setItem('pb-progress', JSON.stringify(all)); } catch (e) {}
  };

  // ---------- Qubi helpers ----------
  function qubiFace(mood) {
    var f = el('div', 'qsay-face');
    f.setAttribute('data-mood', mood || 'happy');
    f.innerHTML = window.QubiAPI ? QubiAPI.svg() : '<span class="qsay-dot"></span>';
    return f;
  }
  function react(face, mood, ms) {
    if (!face) return;
    if (window.QubiAPI) QubiAPI.setMood(face, mood, ms);
    else face.setAttribute('data-mood', mood);
    face.classList.remove('bounce'); void face.offsetWidth; face.classList.add('bounce');
  }
  PB.react = react;

  // ---------- the shared lab qubit: real amplitudes alpha|0> + beta|1> ----------
  var lab = { phi: Math.PI / 4, listeners: [] };
  lab.alpha = function () { return Math.cos(lab.phi); };
  lab.beta = function () { return Math.sin(lab.phi); };
  lab.set = function (phi, source) {
    lab.phi = Math.atan2(Math.sin(phi), Math.cos(phi));
    lab.listeners.forEach(function (fn) { fn(source); });
  };
  lab.on = function (fn) { lab.listeners.push(fn); };
  PB.lab = lab;
  function ketHTML(a, b) {
    return '|ψ⟩ = <b>' + amp(a) + '</b>|0⟩ ' + (b < 0 ? '−' : '+') + ' <b>' + Math.abs(b).toFixed(2) + '</b>|1⟩';
  }

  // ================= Widget: state dial =================
  function stateDial(host) {
    var W = 300, C = 150, R = 112;
    var wrap = el('div', 'dial-wrap');
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + W, class: 'dial-svg', role: 'img', 'aria-label': 'State dial' });
    wrap.appendChild(s);
    var defs = svg('defs', {}, s);
    var mk = svg('marker', { id: 'dial-arrow', viewBox: '0 0 10 10', refX: '7', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
    svg('path', { d: 'M0 0 L10 5 L0 10 z', class: 'dial-arrowhead' }, mk);
    svg('circle', { cx: C, cy: C, r: R, class: 'dial-circle' }, s);
    svg('line', { x1: C - R - 18, y1: C, x2: C + R + 22, y2: C, class: 'dial-axis' }, s);
    svg('line', { x1: C, y1: C + R + 18, x2: C, y2: C - R - 22, class: 'dial-axis' }, s);
    var t0 = svg('text', { x: C + R + 4, y: C - 10, class: 'dial-label' }, s); t0.textContent = '|0⟩';
    var t1 = svg('text', { x: C - 12, y: C - R - 28, class: 'dial-label' }, s); t1.textContent = '|1⟩';
    var pa = svg('line', { class: 'dial-proj dial-proj-a' }, s);
    var pb = svg('line', { class: 'dial-proj dial-proj-b' }, s);
    var la = svg('text', { class: 'dial-val dial-val-a' }, s);
    var lb = svg('text', { class: 'dial-val dial-val-b' }, s);
    var arrow = svg('line', { x1: C, y1: C, class: 'dial-arrow', 'marker-end': 'url(#dial-arrow)' }, s);
    var knob = svg('circle', { r: 13, class: 'dial-knob', tabindex: '0', role: 'slider',
      'aria-label': 'Drag to set the qubit state', 'aria-valuemin': '0', 'aria-valuemax': '360' }, s);

    var side = el('div', 'dial-side');
    side.innerHTML =
      '<div class="dial-eq" aria-live="polite"></div>' +
      '<div class="bars">' +
        '<div class="bar-row"><span>amplitude α</span><div class="bar signed"><i class="a"></i></div><em class="va"></em></div>' +
        '<div class="bar-row"><span>amplitude β</span><div class="bar signed"><i class="b"></i></div><em class="vb"></em></div>' +
        '<div class="bar-row"><span>P(0) = α²</span><div class="bar"><i class="p0"></i></div><em class="v0"></em></div>' +
        '<div class="bar-row"><span>P(1) = β²</span><div class="bar"><i class="p1"></i></div><em class="v1"></em></div>' +
      '</div>' +
      '<label class="dial-range">angle <input type="range" min="-180" max="180" step="1"></label>' +
      '<div class="presets"><button data-p="0">|0⟩</button><button data-p="90">|1⟩</button>' +
      '<button data-p="45">|+⟩</button><button data-p="-45">|−⟩</button></div>';
    wrap.appendChild(side);
    host.appendChild(wrap);
    var range = $('input', side);

    function draw() {
      var a = lab.alpha(), b = lab.beta(), x = C + R * a, y = C - R * b;
      arrow.setAttribute('x2', x); arrow.setAttribute('y2', y);
      knob.setAttribute('cx', x); knob.setAttribute('cy', y);
      knob.setAttribute('aria-valuenow', Math.round(lab.phi * 180 / Math.PI));
      pa.setAttribute('x1', x); pa.setAttribute('y1', y); pa.setAttribute('x2', x); pa.setAttribute('y2', C);
      pb.setAttribute('x1', x); pb.setAttribute('y1', y); pb.setAttribute('x2', C); pb.setAttribute('y2', y);
      // keep the value labels clear of the knob: push them away when the knob is near an axis
      var dv = R * Math.abs(b), dh = R * Math.abs(a), pushV = Math.max(0, 30 - dv), pushH = Math.max(0, 30 - dh);
      la.setAttribute('x', x); la.setAttribute('y', b >= 0 ? C + 18 + pushV : C - 8 - pushV); la.textContent = 'α = ' + fmt(a);
      lb.setAttribute('x', a >= 0 ? C - 8 - pushH : C + 8 + pushH); lb.setAttribute('y', y + 4);
      lb.setAttribute('text-anchor', a >= 0 ? 'end' : 'start'); lb.textContent = 'β = ' + fmt(b);
      $('.dial-eq', side).innerHTML = ketHTML(a, b);
      $('.a', side).style.cssText = barSigned(a); $('.b', side).style.cssText = barSigned(b);
      $('.p0', side).style.width = (a * a * 100) + '%'; $('.p1', side).style.width = (b * b * 100) + '%';
      $('.va', side).textContent = fmt(a); $('.vb', side).textContent = fmt(b);
      $('.v0', side).textContent = fmt(a * a); $('.v1', side).textContent = fmt(b * b);
      range.value = Math.round(lab.phi * 180 / Math.PI);
    }
    function barSigned(v) {
      return v >= 0 ? 'left:50%;width:' + (v * 50) + '%' : 'left:' + (50 + v * 50) + '%;width:' + (-v * 50) + '%';
    }
    function fromPointer(e) {
      var r = s.getBoundingClientRect(), sc = W / r.width;
      var x = (e.clientX - r.left) * sc - C, y = C - (e.clientY - r.top) * sc;
      lab.set(Math.atan2(y, x), 'dial');
    }
    var dragging = false;
    s.addEventListener('pointerdown', function (e) { dragging = true; s.setPointerCapture(e.pointerId); fromPointer(e); });
    s.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
    s.addEventListener('pointerup', function () { dragging = false; });
    knob.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: 5, ArrowUp: 5, ArrowRight: -5, ArrowDown: -5 }[e.key];
      if (d) { e.preventDefault(); lab.set(lab.phi + d * Math.PI / 180, 'dial'); }
    });
    range.addEventListener('input', function () { lab.set(range.value * Math.PI / 180, 'dial'); });
    $$('.presets button', side).forEach(function (b) {
      b.addEventListener('click', function () { animateTo(b.getAttribute('data-p') * Math.PI / 180); });
    });
    function animateTo(target) {
      if (reduceMotion) { lab.set(target, 'dial'); return; }
      var from = lab.phi, d = Math.atan2(Math.sin(target - from), Math.cos(target - from)), t0 = performance.now();
      (function step(now) {
        var k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3);
        lab.set(from + d * e, 'dial');
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }
    lab.on(draw);
    draw();
  }

  // ================= Widget: measurement lab =================
  function measureLab(host) {
    host.innerHTML =
      '<div class="lab-top"><div class="lab-state"></div>' +
        '<div class="lab-mode" role="radiogroup" aria-label="Measurement mode">' +
          '<label><input type="radio" name="labmode" value="fresh" checked> fresh qubit every shot</label>' +
          '<label><input type="radio" name="labmode" value="same"> keep measuring the same qubit</label>' +
        '</div></div>' +
      '<div class="lab-body">' +
        '<div class="detector" aria-live="polite"><div class="det-light">?</div><div class="det-cap">detector</div></div>' +
        '<div class="histo">' +
          '<div class="hcol"><div class="hbar-wrap"><div class="hbar h0"></div><div class="htheory t0"></div></div><b>0</b><span class="hc c0">0</span></div>' +
          '<div class="hcol"><div class="hbar-wrap"><div class="hbar h1"></div><div class="htheory t1"></div></div><b>1</b><span class="hc c1">0</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="lab-buttons"><button data-n="1" class="primary">Measure once</button><button data-n="10">× 10</button>' +
        '<button data-n="100">× 100</button><button data-n="1000">× 1000</button><button class="reset">Reset</button></div>' +
      '<p class="lab-note"></p>';
    var counts = [0, 0], collapsed = null, light = $('.det-light', host), note = $('.lab-note', host);
    function mode() { return $('input[name=labmode]:checked', host).value; }
    function probs() {
      if (collapsed !== null) return collapsed === 0 ? [1, 0] : [0, 1];
      var a = lab.alpha(), b = lab.beta(); return [a * a, b * b];
    }
    function render() {
      var tot = counts[0] + counts[1], p = probs(), a = lab.alpha(), b = lab.beta();
      $('.lab-state', host).innerHTML = collapsed === null ? ketHTML(a, b)
        : '|ψ⟩ = |' + collapsed + '⟩ <span class="tag">collapsed!</span>';
      [0, 1].forEach(function (k) {
        var f = tot ? counts[k] / tot : 0;
        $('.h' + k, host).style.height = (f * 100) + '%';
        $('.c' + k, host).textContent = counts[k] + (tot ? '  (' + (f * 100).toFixed(1) + '%)' : '');
        $('.t' + k, host).style.bottom = (p[k] * 100) + '%';
      });
      if (tot) {
        var dp = Math.sqrt(p[1] * (1 - p[1]) / tot) * 100;
        note.innerHTML = 'Dashed lines: the Born-rule prediction. Measured <b>' + tot + '</b> times, so expect the bars to wander by about <b>±' +
          dp.toFixed(1) + '%</b> around them (shot noise, see the maths below).';
      } else note.innerHTML = 'Set the state with the dial above, then measure.';
    }
    function shoot(n) {
      var add = [0, 0], last = 0;
      for (var i = 0; i < n; i++) {
        last = Math.random() < probs()[0] ? 0 : 1;
        add[last]++;
        if (mode() === 'same' && collapsed === null) collapsed = last;
      }
      if (n) flash(last);
      if (n === 1 || reduceMotion) { counts[0] += add[0]; counts[1] += add[1]; render(); return; }
      var start = counts.slice(), t0 = performance.now();
      (function tick(now) {
        var k = Math.min(1, (now - t0) / 700);
        counts[0] = Math.round(start[0] + add[0] * k); counts[1] = Math.round(start[1] + add[1] * k);
        render();
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }
    function flash(k) {
      light.textContent = k; light.className = 'det-light on r' + k;
      setTimeout(function () { if (light.textContent === String(k)) light.className = 'det-light r' + k; }, 260);
    }
    $$('.lab-buttons button[data-n]', host).forEach(function (b) {
      b.addEventListener('click', function () { shoot(+b.getAttribute('data-n')); });
    });
    $('.reset', host).addEventListener('click', function () { counts = [0, 0]; collapsed = null; light.textContent = '?'; light.className = 'det-light'; render(); });
    $$('input[name=labmode]', host).forEach(function (r) {
      r.addEventListener('change', function () { counts = [0, 0]; collapsed = null; light.textContent = '?'; light.className = 'det-light'; render(); });
    });
    lab.on(function () { counts = [0, 0]; collapsed = null; light.textContent = '?'; light.className = 'det-light'; render(); });
    render();
  }

  // ================= Widget: |+>, |-> and a secret coin =================
  // Measured directly all three give 50/50. After H, |+> -> always 0, |-> -> always 1,
  // but the secret coin (really |0> or |1>, chosen at random) stays 50/50.
  function plusMinus(host) {
    var R2 = Math.SQRT1_2;
    var boxes = [
      { name: '|+⟩', ket: '(|0⟩ + |1⟩)/√2', amps: [[R2, 0], [R2, 0]], ang: 45,
        why: [['0', ['+½', '+½'], '1', 'add up'], ['1', ['+½', '−½'], '0', 'cancel!']] },
      { name: '|−⟩', ket: '(|0⟩ − |1⟩)/√2', amps: [[R2, 0], [-R2, 0]], ang: -45,
        why: [['0', ['+½', '−½'], '0', 'cancel!'], ['1', ['+½', '+½'], '1', 'add up']] },
      { name: 'Secret coin', ket: 'really |0⟩ or |1⟩, hidden', coin: true }
    ];
    var row = el('div', 'pm-row three');
    boxes.forEach(function (bx) {
      var card = el('div', 'pm-card');
      var pic;
      if (bx.coin) {
        pic = '<svg viewBox="0 0 120 120" class="pm-svg" aria-hidden="true">' +
          '<ellipse cx="60" cy="98" rx="40" ry="7" class="cup-shadow"/>' +
          '<path d="M30 96 L40 34 Q60 26 80 34 L90 96 Z" class="cup"/>' +
          '<ellipse cx="60" cy="34" rx="20" ry="5" class="cup-top"/>' +
          '<text x="60" y="76" text-anchor="middle" class="cup-q">?</text></svg>';
      } else {
        var rad = bx.ang * Math.PI / 180, x = 60 + 44 * Math.cos(rad), y = 60 - 44 * Math.sin(rad);
        pic = '<svg viewBox="0 0 120 120" class="pm-svg" aria-hidden="true"><circle cx="60" cy="60" r="44" class="dial-circle"/>' +
          '<line x1="10" y1="60" x2="112" y2="60" class="dial-axis"/><line x1="60" y1="112" x2="60" y2="8" class="dial-axis"/>' +
          '<line x1="60" y1="60" x2="' + x + '" y2="' + y + '" class="dial-arrow" marker-end="url(#dial-arrow)"/></svg>';
      }
      card.innerHTML = '<h4>' + bx.name + '</h4><p class="pm-ket">' + bx.ket + '</p>' + pic +
        '<div class="pm-histo"><div><i class="b0"></i><span>0</span></div><div><i class="b1"></i><span>1</span></div></div>' +
        '<p class="pm-out">&nbsp;</p><div class="pm-why"></div>';
      row.appendChild(card);
      bx.card = card;
    });
    var controls = el('div', 'pm-controls');
    controls.innerHTML = '<span class="pm-stepname">Step 1</span><button class="m">Measure all three, 200 times each</button>' +
      '<span class="pm-stepname">Step 2</span><button class="hm primary">Apply H first, then measure 200 times</button>';
    host.appendChild(row); host.appendChild(controls);

    function run(withH) {
      boxes.forEach(function (bx) {
        var cnt = [0, 0];
        for (var s = 0; s < 200; s++) {
          var st = new QSim.State(1);
          if (bx.coin) { if (Math.random() < 0.5) st.x(0); }   // secretly |0> or |1>
          else st.set(bx.amps);
          if (withH) st.h(0);
          cnt[st.sample()]++;
        }
        var card = bx.card;
        $('.b0', card).style.height = (cnt[0] / 2) + '%'; $('.b1', card).style.height = (cnt[1] / 2) + '%';
        $('.pm-out', card).innerHTML = '<b>0</b> × ' + cnt[0] + ' &nbsp; <b>1</b> × ' + cnt[1];
        card.classList.toggle('after-h', withH);
        var why = $('.pm-why', card);
        if (!withH) { why.innerHTML = ''; return; }
        if (bx.coin) {
          why.innerHTML = '<p>No amplitudes to combine: a secret <b>0</b> becomes 50/50 after H, and so does a secret <b>1</b>. Still 50/50.</p>';
        } else {
          why.innerHTML = bx.why.map(function (w) {
            return '<div class="why-row ' + (w[2] === '0' ? 'cancel' : 'add') + '"><span class="why-lab">amplitude for ' + w[0] + ':</span>' +
              w[1].map(function (t) { return '<span class="chip ' + (t[0] === '−' ? 'neg' : 'pos') + '">' + t + '</span>'; }).join('<span class="op">+</span>') +
              '<span class="op">=</span><b>' + w[2] + '</b><em>' + w[3] + '</em></div>';
          }).join('');
        }
      });
    }
    $('.m', controls).addEventListener('click', function () { run(false); });
    $('.hm', controls).addEventListener('click', function () { run(true); });
  }

  // ================= Widget: a classical bit vs a qubit =================
  function bitVsQubit(host) {
    host.innerHTML =
      '<div class="bq-row">' +
        '<div class="bq-card"><h4>Classical bit</h4>' +
          '<svg viewBox="0 0 120 110" class="bq-svg" aria-hidden="true">' +
            '<circle cx="60" cy="44" r="30" class="bulb"/><rect x="48" y="72" width="24" height="16" rx="3" class="bulb-base"/>' +
            '<path d="M52 44 q8 -14 16 0" class="bulb-wire"/></svg>' +
          '<div class="bq-switch"><span>0</span><button class="toggle" role="switch" aria-checked="false" aria-label="Bit value"><i></i></button><span>1</span></div>' +
          '<button class="primary look-bit">Look 10 times</button>' +
          '<div class="chips bit-chips" aria-live="polite"></div>' +
          '<p class="bq-cap">Set the switch, then look.</p></div>' +
        '<div class="bq-card"><h4>Qubit in |+⟩</h4>' +
          '<div class="bq-qubi"></div>' +
          '<p class="bq-hint">Each try uses a freshly prepared |+⟩</p>' +
          '<button class="primary look-qubit">Prepare and look, 10 times</button>' +
          '<div class="chips qubit-chips" aria-live="polite"></div>' +
          '<p class="bq-cap">What will you see?</p></div>' +
      '</div>';
    var bit = 0, sw = $('.toggle', host), face = qubiFace('thinking');
    $('.bq-qubi', host).appendChild(face);
    function setBit(v) { bit = v; sw.setAttribute('aria-checked', v ? 'true' : 'false'); host.querySelector('.bq-row').classList.toggle('lit', !!v); }
    sw.addEventListener('click', function () { setBit(1 - bit); $('.bit-chips', host).innerHTML = ''; $$('.bq-cap', host)[0].textContent = 'Set the switch, then look.'; });
    function chips(box, vals, cap, capText) {
      box.innerHTML = '';
      vals.forEach(function (v, k) {
        var c = el('span', 'chip-b r' + v, String(v));
        if (!reduceMotion) c.style.animationDelay = (k * 70) + 'ms';
        box.appendChild(c);
      });
      cap.innerHTML = capText;
    }
    $('.look-bit', host).addEventListener('click', function () {
      chips($('.bit-chips', host), new Array(10).fill(bit), $$('.bq-cap', host)[0],
        'The same answer every time. Looking never changes a bit.');
    });
    $('.look-qubit', host).addEventListener('click', function () {
      var vals = [], st;
      for (var k = 0; k < 10; k++) { st = new QSim.State(1).h(0); vals.push(st.sample()); }
      var zeros = vals.filter(function (v) { return v === 0; }).length;
      chips($('.qubit-chips', host), vals, $$('.bq-cap', host)[1],
        '<b>Random!</b> ' + zeros + ' zeros and ' + (10 - zeros) + ' ones this time. Press again and the pattern changes, but over many tries it is half and half.');
      react(face, 'surprised', 1200);
    });
  }

  // ================= Widget: challenge, make P(1) = 0.75 =================
  function challenge75(host) {
    var face = qubiFace('thinking');
    var box = el('div', 'ch-box');
    box.innerHTML = '<p class="ch-text">Use the <b>state dial</b> above to prepare a qubit that gives <b>1</b> with probability <b>0.75</b>. ' +
      'Then press check. <span class="muted">Bonus: there are <b>four</b> different arrows that work. Can you find them all?</span></p>' +
      '<div class="ch-found"><span data-q="1">?</span><span data-q="2">?</span><span data-q="3">?</span><span data-q="4">?</span></div>' +
      '<button class="primary ch-check">Check my qubit</button> <span class="ch-msg" aria-live="polite"></span>';
    host.appendChild(face); host.appendChild(box);
    var found = {};
    $('.ch-check', host).addEventListener('click', function () {
      var a = lab.alpha(), b = lab.beta(), p1 = b * b, msg = $('.ch-msg', host);
      if (Math.abs(p1 - 0.75) < 0.02) {
        var q = a >= 0 ? (b >= 0 ? 1 : 4) : (b >= 0 ? 2 : 3);
        var isNew = !found[q]; found[q] = true;
        var slot = $('[data-q="' + q + '"]', host);
        slot.textContent = amp(a) + ', ' + amp(b); slot.classList.add('ok');
        var n = Object.keys(found).length;
        msg.innerHTML = n === 4 ? '🎉 All four! Same probabilities, different amplitude signs. Signs matter (you will see why in Chapter 3).'
          : (isNew ? '✓ Correct! P(1) = ' + p1.toFixed(2) + '. Found ' + n + ' of 4.' : 'You already found that one. Try another quadrant!');
        react(face, n === 4 ? 'love' : 'excited', n === 4 ? 0 : 1500);
      } else {
        msg.textContent = 'P(1) is ' + p1.toFixed(2) + ' right now. ' + (p1 < 0.75 ? 'Tilt the arrow closer to |1⟩.' : 'A little too close to |1⟩.');
        react(face, 'thinking');
      }
    });
  }

  // ================= Quiz engine =================
  // PB_QUIZ = { chapter: 'ch1', questions: [{ q, options: [{ t, ok, why }], review: '#section-id' }] }
  function quiz(host) {
    var data = window.PB_QUIZ; if (!data) return;
    var qs = data.questions, i = 0, firstTry = [], answered = false;
    host.innerHTML = '<div class="quiz-card"><div class="quiz-head"><span class="quiz-count"></span><div class="quiz-dots"></div></div>' +
      '<div class="quiz-q"></div><div class="quiz-opts" role="list"></div>' +
      '<div class="quiz-feedback" aria-live="polite"></div><div class="quiz-nav"><button class="primary quiz-next" disabled>Next question →</button></div></div>';
    var face = qubiFace('happy'); $('.quiz-card', host).prepend(face);
    var dots = $('.quiz-dots', host);
    qs.forEach(function () { dots.appendChild(el('i')); });
    function mathify(node) { if (window.renderMathInElement) renderMathInElement(node, MATH_OPTS); }
    function show() {
      answered = false;
      var q = qs[i];
      $('.quiz-count', host).textContent = 'Question ' + (i + 1) + ' of ' + qs.length;
      $$('i', dots).forEach(function (d, k) { d.className = k < i ? (firstTry[k] ? 'ok' : 'bad') : k === i ? 'cur' : ''; });
      $('.quiz-q', host).innerHTML = q.q;
      var opts = $('.quiz-opts', host); opts.innerHTML = '';
      q.options.forEach(function (o, k) {
        var b = el('button', 'quiz-opt', '<span class="qo-letter">' + 'ABCDEF'[k] + '</span><span>' + o.t + '</span>');
        b.type = 'button'; b.setAttribute('role', 'listitem');
        b.addEventListener('click', function () { pick(k, b); });
        opts.appendChild(b);
      });
      $('.quiz-feedback', host).innerHTML = '';
      $('.quiz-next', host).disabled = true;
      $('.quiz-next', host).textContent = i === qs.length - 1 ? 'See my results →' : 'Next question →';
      react(face, 'thinking');
      mathify(host);
    }
    function pick(k, btn) {
      var q = qs[i], o = q.options[k];
      if (firstTry[i] === undefined) firstTry[i] = !!o.ok;
      btn.classList.add(o.ok ? 'right' : 'wrong');
      btn.disabled = true;
      var fb = $('.quiz-feedback', host);
      fb.className = 'quiz-feedback ' + (o.ok ? 'good' : 'bad');
      fb.innerHTML = (o.ok ? '<b>Correct!</b> ' : '<b>Not quite.</b> ') + o.why +
        (o.ok || !q.review ? '' : ' <a href="' + q.review + '">Review this section ↑</a>') +
        (o.ok ? '' : '<br><span class="muted">Try another answer.</span>');
      mathify(fb);
      if (o.ok) {
        $$('.quiz-opt', host).forEach(function (b) { b.disabled = true; });
        $('.quiz-next', host).disabled = false;
        $('.quiz-next', host).focus({ preventScroll: true });
        react(face, firstTry[i] ? 'excited' : 'happy');
      } else {
        react(face, 'sad', 1400);
      }
    }
    $('.quiz-next', host).addEventListener('click', function () {
      if (i < qs.length - 1) { i++; show(); } else results();
    });
    function results() {
      var score = firstTry.filter(Boolean).length, n = qs.length;
      var stars = score === n ? 3 : score >= Math.ceil(n * 0.66) ? 2 : score >= Math.ceil(n * 0.33) ? 1 : 0;
      PB.progress(data.chapter, { stars: stars, score: score, total: n, date: new Date().toISOString().slice(0, 10) });
      var missed = qs.map(function (q, k) { return firstTry[k] ? '' : '<li>' + q.q + ' <a href="' + (q.review || '#') + '">Review ↑</a></li>'; }).join('');
      $('.quiz-card', host).innerHTML = '';
      $('.quiz-card', host).appendChild(face);
      $('.quiz-card', host).insertAdjacentHTML('beforeend',
        '<div class="quiz-result"><div class="stars">' + '★★★'.slice(0, stars) + '<span>' + '★★★'.slice(stars) + '</span></div>' +
        '<h3>' + score + ' / ' + n + ' right on the first try</h3>' +
        '<p>' + (stars === 3 ? 'Perfect! You really get superposition and measurement.' : stars === 2 ? 'Great work! Have a look at the ones you missed.' : 'Good start! Revisit the sections below, then try again.') + '</p>' +
        (missed ? '<h4>To revisit</h4><ul class="missed">' + missed + '</ul>' : '') +
        '<div class="quiz-nav"><button class="retake">Retake quiz</button> <a class="qb-like primary" href="' + (data.next || '../playbook.html') + '">' + (data.nextLabel || 'Back to the map →') + '</a></div></div>');
      mathify(host);
      react(face, stars >= 2 ? 'love' : 'happy');
      if (stars >= 2) confetti(host);
      $('.retake', host).addEventListener('click', function () { i = 0; firstTry = []; quiz(host); });
    }
    show();
  }
  function confetti(host) {
    if (reduceMotion) return;
    var colors = ['#3f74c4', '#e0607a', '#f2b134', '#3fae6a', '#8a6bb8'];
    for (var k = 0; k < 40; k++) {
      var b = el('span', 'confetti'); b.style.background = colors[k % 5];
      host.appendChild(b);
      var a = b.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(' + (Math.random() - 0.5) * 500 + 'px,' + (-120 - Math.random() * 220) + 'px) rotate(' + Math.random() * 720 + 'deg)', opacity: 0 }],
        { duration: 1200 + Math.random() * 800, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      a.onfinish = (function (bb) { return function () { bb.remove(); }; })(b);
    }
  }

  // ---------- Qubi callouts:  <aside class="qsay" data-mood="excited">...</aside> ----------
  function callouts() {
    $$('.qsay').forEach(function (c) {
      var body = el('div', 'qsay-body');
      while (c.firstChild) body.appendChild(c.firstChild);
      c.appendChild(qubiFace(c.getAttribute('data-mood') || 'happy'));
      c.appendChild(body);
    });
  }

  var MATH_OPTS = { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false };

  function init() {
    callouts();
    var widgets = { 'bit-vs-qubit': bitVsQubit, 'state-dial': stateDial, 'measure-lab': measureLab, 'plus-minus': plusMinus, 'challenge-75': challenge75, quiz: quiz };
    $$('[data-widget]').forEach(function (h) { var f = widgets[h.getAttribute('data-widget')]; if (f) f(h); });
    if (window.renderMathInElement) renderMathInElement(document.querySelector('main'), MATH_OPTS);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
