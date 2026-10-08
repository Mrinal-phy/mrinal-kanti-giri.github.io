// "Qubi", a cartoon quantum walker who lives on this site.
//  - About page, first visit: Qubi sits on the photo, does a quantum walk,
//    collapses, then jumps forward to introduce itself.
//  - "Qubi explains" notes: Qubi pops up big beside a note card and types out a
//    fun summary (what we do, any paper, the travel story, where to start, facts).
//  - "Ask Qubi" buttons next to papers on Research and Publications.
//  - A guided tour across all pages, and gentle suggestions once per visit.
(function () {
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var page = {
    'index.html': 'about', '': 'about', 'research.html': 'research',
    'publications.html': 'publications', 'experience.html': 'experience', 'reading.html': 'reading'
  }[file];
  if (!page) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); }
    catch (e) { return null; }
  }
  function session(key, val) {
    try { if (val === undefined) return sessionStorage.getItem(key); sessionStorage.setItem(key, val); }
    catch (e) { return null; }
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // ---------- Qubi artwork (one SVG, reused everywhere) ----------
  var svgCount = 0;
  function qubiSVG() {
    var id = 'qbody' + (++svgCount);
    return '<svg viewBox="0 0 110 112" aria-hidden="true">' +
      '<defs><radialGradient id="' + id + '" cx="36%" cy="32%" r="72%">' +
        '<stop offset="0" stop-color="#a9cbff"/><stop offset="0.55" stop-color="#3f74c4"/><stop offset="1" stop-color="#1f3f6e"/>' +
      '</radialGradient></defs>' +
      '<ellipse class="q-shadow" cx="52" cy="108" rx="22" ry="3.5"/>' +
      '<g class="q-feet"><ellipse class="q-foot q-foot-l" cx="40" cy="99" rx="9" ry="5"/><ellipse class="q-foot q-foot-r" cx="64" cy="99" rx="9" ry="5"/></g>' +
      '<g class="q-figure">' +
        '<path class="q-arm q-arm-l" d="M17 62 q-9 4 -11 13"/>' +
        '<path class="q-arm q-arm-r" d="M88 58 q10 -5 13 -15"/>' +
        '<circle cx="52" cy="58" r="37" fill="url(#' + id + ')"/>' +
        '<ellipse cx="52" cy="58" rx="37" ry="10" class="q-equator"/>' +
        '<line x1="52" y1="21" x2="58" y2="7" class="q-antenna"/><circle cx="59" cy="6" r="4" class="q-ket"/>' +
        '<path class="q-brow q-brow-l" d="M32 38 q8 -5 15 -1"/><path class="q-brow q-brow-r" d="M57 37 q7 -4 15 1"/>' +
        '<g class="q-eyes">' +
          '<g class="q-eye q-eye-l"><ellipse cx="40" cy="52" rx="7" ry="9" fill="#fff"/>' +
            '<g class="q-pupils"><circle class="q-pupil" cx="41.5" cy="54" r="4"/><circle cx="43" cy="51.5" r="1.4" fill="#fff"/></g></g>' +
          '<g class="q-eye q-eye-r"><ellipse cx="64" cy="52" rx="7" ry="9" fill="#fff"/>' +
            '<g class="q-pupils"><circle class="q-pupil" cx="65.5" cy="54" r="4"/><circle cx="67" cy="51.5" r="1.4" fill="#fff"/></g></g>' +
        '</g>' +
        '<g class="q-alt q-eyes-happy"><path d="M33 55 q7 -9 14 0"/><path d="M57 55 q7 -9 14 0"/></g>' +
        '<g class="q-alt q-eyes-closed"><path d="M33 53 q7 6 14 0"/><path d="M57 53 q7 6 14 0"/></g>' +
        '<g class="q-alt q-eyes-heart">' +
          '<path d="M40 59 C30 51 33 43 40 48 C47 43 50 51 40 59 Z"/><path d="M64 59 C54 51 57 43 64 48 C71 43 74 51 64 59 Z"/></g>' +
        '<path class="q-alt q-wink" d="M57 53 q7 6 14 0"/>' +
        '<path class="q-alt q-tear" d="M33 58 q-5 8 0 11 q5 -3 0 -11 Z"/>' +
        '<path class="q-mouth" d="M43 68 Q52 76 61 68"/>' +
        '<ellipse class="q-mouth-open" cx="52" cy="70" rx="6" ry="5"/>' +
        '<path class="q-alt q-mouth-big" d="M41 66 Q52 82 63 66 Z"/>' +
        '<ellipse class="q-alt q-mouth-o" cx="52" cy="71" rx="4" ry="5"/>' +
        '<path class="q-alt q-mouth-flat" d="M46 71 L59 69"/>' +
        '<path class="q-alt q-mouth-sad" d="M44 74 Q52 66 60 74"/>' +
        '<circle cx="31" cy="65" r="4" class="q-cheek"/><circle cx="73" cy="65" r="4" class="q-cheek"/>' +
      '</g>' +
      '<g class="q-alt q-think"><circle cx="92" cy="26" r="3"/><circle cx="100" cy="16" r="4"/><circle cx="110" cy="4" r="5.5"/></g>' +
      '<g class="q-alt q-zzz"><text x="84" y="22">z</text><text x="94" y="10">z</text><text x="104" y="-2">Z</text></g>' +
    '</svg>';
  }

  // ================= Content =================
  var papers = {
    '2609.37059': {
      scene: 'proximity',
      short: 'the proximity-localization preprint',
      title: 'Catching localization from your neighbour',
      paras: [
        "Picture a ladder made of two chains. Both have a gentle, almost-repeating (quasiperiodic) landscape, so on their own, particles slide along happily.",
        "Now Mrinal adds a staggered energy shift (a \"detuning\") to just ONE leg. Surprise: particles on the OTHER, untouched leg get stuck! They catch localization from their neighbour, like catching a yawn.",
        "Turn the detuning up even more and they're free again: moving, stuck, moving. And it's not just theory: the frozen spreading and its comeback were seen on real IBM quantum hardware."
      ]
    },
    'ae9007': {
      scene: 'flatband',
      short: 'the quantum switch paper (QST 2026)',
      title: 'A quantum switch',
      paras: [
        "Picture a little quantum road: a chain of sites with a diamond (a rhombus) in the middle. I start at one end and want to reach the other.",
        "At the rhombus I split and take the top and bottom paths at the same time. With no magnetic flux, my two halves meet on the far side in step, add up, and I sail through to the end. Switch ON!",
        "Now thread a π flux through the rhombus. My two halves arrive exactly out of step and cancel, so I can't get past and bounce back. Switch OFF!",
        "Mrinal ran this switch on a real IBM quantum computer, using tensor networks to compress the circuits so they survive the noise."
      ]
    },
    'adb244': {
      scene: 'topo',
      short: 'topological quantum walks (Physica Scripta 2025)',
      title: 'Donuts, coffee mugs and quantum walks',
      paras: [
        "Topology is the branch of maths where a donut and a coffee mug are \"the same shape\", because both have exactly one hole.",
        "In a topological quantum walk, special states cling to the edges and refuse to leave, protected by that topology. Bump them, shake them, and they stay put.",
        "Mrinal turned these walks into quantum circuits and ran them on a real NISQ quantum computer to watch the edge states do their thing."
      ]
    },
    '109.043308': {
      scene: 'ladder',
      short: 'flux-enhanced localization (PRA 2024)',
      title: 'A quantum plot twist on a ladder',
      paras: [
        "Take interacting bosons on a two-leg ladder and thread a magnetic flux through it. You'd expect the flux to just stir things up...",
        "Instead, it can freeze the particles in place: localization! Keep turning the flux and, plot twist, they break free again. That's reentrant delocalization.",
        "So one knob, the magnetic flux, can switch quantum motion off and back on."
      ]
    },
    '108.063319': {
      scene: 'ladderDance',
      short: 'flux-induced reentrant dynamics (PRA 2023)',
      title: 'The prequel: a dance with changing tempo',
      paras: [
        "This is the prequel to the ladder story. Interacting bosons go for a quantum walk while a magnetic flux plays the music.",
        "As the flux changes, the walkers go from spreading out, to getting stuck, to spreading again, like a dance where the tempo keeps switching.",
        "Mrinal mapped out when and why this reentrant behaviour happens."
      ]
    },
    '108.013316': {
      scene: 'constrained',
      short: 'constrained bosons on a ladder (PRA 2023)',
      title: 'Bosons with house rules',
      paras: [
        "Bosons usually love to crowd together. But what if they have to follow strict house rules about how many can share a spot?",
        "On a two-leg Bose–Hubbard ladder, these constrained bosons can organise into different quantum phases: different \"states of matter\" made of quantum particles.",
        "This team effort mapped out which phases appear and where."
      ]
    },
    'PhysRevLett.129.050601': {
      scene: 'pairing',
      short: 'the pairing paper (PRL 2022)',
      title: 'The quantum buddy system',
      paras: [
        "Two kinds of bosons go for a quantum walk on a line. Same-kind and different-kind particles interact with different strengths.",
        "When those interactions compete, something unexpected happens: particles that you'd think would fly apart team up as pairs on the same site and walk together. A quantum buddy system!",
        "This result made it into Physical Review Letters, one of physics' top journals."
      ]
    },
    'L220201': {
      scene: 'quasi',
      short: 'multiple localization transitions (PRB 2022)',
      title: 'Stuck, free, stuck, free...',
      paras: [
        "A quasiperiodic lattice is a pattern that almost repeats but never quite does, like a song that's always slightly off-beat.",
        "On such a lattice, particles can switch between moving freely and being frozen in place not just once, but several times as the system is tuned.",
        "Multiple localization transitions in one system. Physics loves a sequel."
      ]
    },
    's41598-021-01230-5': {
      scene: 'first',
      short: 'the very first paper (Sci. Rep. 2021)',
      title: "Where it all started",
      paras: [
        "This is Mrinal's first paper! Two kinds of particles take a quantum walk together, but one kind hops faster than the other.",
        "How does that speed imbalance change the way they spread out and stick together? That question kicked off the whole quantum-walk adventure.",
        "Every quantum walker has to take a first step. This was his."
      ]
    }
  };
  function paperKey(href) {
    for (var k in papers) if (href && href.indexOf(k) !== -1) return k;
    return null;
  }

  var notes = {
    whatWeDo: {
      scene: ['walks', 'pairing', 'chip'],
      title: 'What does Mrinal do? (Qubi\'s version)',
      paras: [
        "Imagine a tiny particle, like me, on a row of stepping stones. A normal ball would wander around randomly. A quantum particle does something weirder: it takes every path at once and spreads out like ripples. That's a quantum walk!",
        "Mrinal studies what happens when lots of quantum particles interact. Do they pair up? Get stuck (localization)? Race ahead? It depends on the landscape, magnetic flux and disorder.",
        "Then comes the fun part: he turns these models into circuits and runs them on real IBM quantum computers, squeezing the circuits short enough to survive the noise."
      ]
    },
    travel: {
      scene: 'travel', staged: true,
      title: "Mrinal's long quantum walk",
      paras: [
        "It started in India: an M.Sc. and Ph.D. at IIT Guwahati, then a postdoc at TCG-CREST in Kolkata.",
        "Next hop: Taiwan, at National Tsing Hua University. Then Singapore, where he's now a Research Fellow at NTU.",
        "Along the way he's presented his work in Japan, Germany, Italy and the USA, including a talk at the APS March Meeting.",
        "That's a pretty long walk! But unlike me, he can only be in one place at a time."
      ]
    },
    startHere: {
      scene: 'path', staged: true,
      title: 'Where should I start?',
      paras: [
        "New to all this? Here's my favourite path:",
        "1. Preskill's \"Quantum computing in the NISQ era\" for the big picture.",
        "2. Orús's practical introduction to tensor networks.",
        "3. Childs on quantum walks (my personal favourite, for obvious reasons).",
        "4. IBM Quantum Learning, to run your very first circuit on a real machine.",
        "Then send Mrinal an email and say Qubi sent you!"
      ]
    }
  };

  var facts = [
    "A qubit can be in a superposition of 0 and 1 at the same time. But the moment you measure it, you only ever get one answer.",
    "Entangled qubits stay correlated no matter how far apart they are. Einstein called it \"spooky action at a distance\".",
    "A quantum walker spreads much faster than a classical random walker: its distance grows like time, not like the square root of time.",
    "Anderson localization: with enough disorder, a quantum particle can get completely stuck, even without any walls to stop it.",
    "Today's quantum computers are \"NISQ\": Noisy Intermediate-Scale Quantum. Noise is the enemy, so shorter circuits win.",
    "In 1982 Richard Feynman suggested that to simulate nature, you need a computer that is quantum too. That idea is quantum simulation.",
    "Two quantum walkers can interfere so that they always land together, a bit like the famous Hong–Ou–Mandel effect for photons."
  ];
  var factScenes = ['coin', 'entangle', 'walks', 'localize', 'noisy', 'feynman', 'bunch'];
  var factIdx = Math.floor(Math.random() * facts.length);

  // ================= Corner Qubi + bubble =================
  var qubi = el('button', 'qubi');
  qubi.type = 'button';
  qubi.setAttribute('aria-label', 'Qubi, the quantum walker: open menu');
  qubi.innerHTML = '<span class="q-ripple"></span>' + qubiSVG();
  document.body.appendChild(qubi);

  var bubble = el('div', 'qubi-bubble');
  bubble.setAttribute('role', 'dialog');
  bubble.setAttribute('aria-live', 'polite');
  bubble.hidden = true;
  document.body.appendChild(bubble);

  function hop() { qubi.classList.remove('hop'); void qubi.offsetWidth; qubi.classList.add('hop'); }

  // ---------- Moods: happy, excited, surprised, thinking, love, wink, sad, sleepy ----------
  function setMood(target, m, ms) {
    if (!target) return;
    clearTimeout(target._moodTimer);
    target.setAttribute('data-mood', m);
    if (ms) target._moodTimer = setTimeout(function () { target.setAttribute('data-mood', 'happy'); }, ms);
  }
  function mood(m, ms) { setMood(qubi, m, ms); }
  qubi.setAttribute('data-mood', 'happy');

  function show(html, buttons, opts) {
    opts = opts || {};
    bubble.className = 'qubi-bubble' + (opts.front ? ' front' : '') + (opts.menu ? ' menu' : '');
    bubble.innerHTML = '<button class="qb-close" type="button" aria-label="Close">×</button>' +
      '<div class="qb-text">' + html + '</div><div class="qb-actions"></div>';
    var actions = bubble.querySelector('.qb-actions');
    buttons.forEach(function (b) {
      var e = el(b.href ? 'a' : 'button', 'qb-btn' + (b.primary ? ' primary' : ''));
      e.textContent = b.label;
      if (b.href) e.href = b.href; else { e.type = 'button'; e.addEventListener('click', b.onClick); }
      actions.appendChild(e);
    });
    bubble.querySelector('.qb-close').addEventListener('click', closeAll);
    bubble.hidden = false;
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    hop();
    var first = actions.querySelector('.primary') || actions.firstChild;
    if (first) first.focus({ preventScroll: true });
  }
  function hideBubble() { bubble.hidden = true; }

  // Move the corner Qubi with a transform (used by the entrance animation)
  var HOME = 'translate(0px, 0px) scale(1)';
  var qTransform = HOME;
  function moveQubi(to, ms, easing) {
    var anim = qubi.animate([{ transform: qTransform }, { transform: to }],
      { duration: reduceMotion ? 0 : ms, easing: easing || 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' });
    qTransform = to;
    return anim;
  }
  function home(ms) { if (qTransform !== HOME) moveQubi(HOME, ms || 600, 'cubic-bezier(.5,0,.3,1)'); }
  function baseRect() {
    var w = qubi.offsetWidth, h = qubi.offsetHeight;
    var cs = getComputedStyle(qubi);
    return { left: innerWidth - parseFloat(cs.right) - w, top: innerHeight - parseFloat(cs.bottom) - h, width: w, height: h };
  }
  function frontTransform() {
    var b = baseRect(), s = innerWidth < 640 ? 1.5 : 1.8;
    var dx = innerWidth / 2 - (b.left + b.width / 2);
    var dy = -Math.min(60, innerHeight * 0.07);
    return 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')';
  }

  // ================= "Qubi explains" note =================
  var noteOverlay = el('div', 'qnote-overlay');
  noteOverlay.hidden = true;
  noteOverlay.innerHTML =
    '<div class="qnote-stage" role="dialog" aria-modal="true" aria-labelledby="qnote-title">' +
      '<div class="qnote-qubi">' + qubiSVG() + '</div>' +
      '<article class="qnote">' +
        '<span class="qnote-pin" aria-hidden="true"></span>' +
        '<button class="qnote-close" type="button" aria-label="Close note">×</button>' +
        '<h3 class="qnote-title" id="qnote-title"></h3>' +
        '<figure class="qnote-figure" aria-hidden="true"><canvas></canvas><div class="qnote-dots"></div></figure>' +
        '<div class="qnote-body"></div>' +
        '<p class="qnote-sign">— Qubi</p>' +
        '<div class="qnote-actions"></div>' +
      '</article>' +
    '</div>';
  document.body.appendChild(noteOverlay);
  var bigQubi = noteOverlay.querySelector('.qnote-qubi');
  var noteEl = noteOverlay.querySelector('.qnote');
  var typing = null;
  bigQubi.setAttribute('data-mood', 'happy');

  // Eyes follow the mouse cursor
  var mouse = null, eyeRaf = 0;
  function trackEyes() {
    eyeRaf = 0;
    if (!mouse) return;
    [qubi, bigQubi].forEach(function (host) {
      if (host === bigQubi && noteOverlay.hidden) return;
      var r = host.getBoundingClientRect();
      if (!r.width) return;
      var dx = mouse.x - (r.left + r.width * 0.47), dy = mouse.y - (r.top + r.height * 0.47);
      var d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, d / 260);
      var tr = 'translate(' + (dx / d * 2.6 * k).toFixed(2) + ' ' + (dy / d * 2.2 * k).toFixed(2) + ')';
      host.querySelectorAll('.q-pupils').forEach(function (g) { g.setAttribute('transform', tr); });
    });
  }
  // Falls asleep when nobody is around; random little expressions while idle
  var lastActive = Date.now();
  function activity() {
    lastActive = Date.now();
    if (qubi.getAttribute('data-mood') === 'sleepy') { mood('surprised', 900); hop(); }
  }
  document.addEventListener('mousemove', function (e) {
    mouse = { x: e.clientX, y: e.clientY };
    activity();
    if (!eyeRaf) eyeRaf = requestAnimationFrame(trackEyes);
  }, { passive: true });
  ['scroll', 'keydown', 'pointerdown', 'touchstart'].forEach(function (ev) { addEventListener(ev, activity, { passive: true }); });
  setInterval(function () {
    if (!bubble.hidden || !noteOverlay.hidden || introRunning) return;
    var cur = qubi.getAttribute('data-mood'), idle = Date.now() - lastActive;
    if (idle > 45000) { if (cur !== 'sleepy') mood('sleepy'); return; }
    if (cur === 'happy' && Math.random() < 0.2) {
      var pick = ['wink', 'excited', 'love', 'surprised'][Math.floor(Math.random() * 4)];
      mood(pick, 1300);
      if (pick === 'excited') hop();
    }
  }, 2600);

  function finishTyping() {
    if (!typing) return;
    clearTimeout(typing.timer);
    typing.paras.forEach(function (t, i) { typing.nodes[i].textContent = t; });
    typing = null;
    bigQubi.classList.remove('talking');
    noteEl.classList.add('typed');
    setMood(bigQubi, 'wink', 1500);
  }
  function typeOut(body, paras) {
    body.innerHTML = '';
    var nodes = paras.map(function () { var p = el('p'); body.appendChild(p); return p; });
    noteEl.classList.remove('typed');
    if (reduceMotion) { paras.forEach(function (t, i) { nodes[i].textContent = t; }); noteEl.classList.add('typed'); return; }
    typing = { paras: paras, nodes: nodes, timer: null };
    setMood(bigQubi, typeOut.firstMood || 'thinking');
    var pi = 0, ci = 0, started = false;
    function tick() {
      if (!typing) return;
      if (!started) { started = true; setMood(bigQubi, 'happy'); bigQubi.classList.add('talking'); }
      if (pi >= paras.length) { typing = null; bigQubi.classList.remove('talking'); noteEl.classList.add('typed'); setMood(bigQubi, 'wink', 1500); return; }
      ci += 2;
      typing.pi = pi;
      nodes[pi].textContent = paras[pi].slice(0, ci);
      if (ci >= paras[pi].length) { pi++; ci = 0; typing.timer = setTimeout(tick, 260); }
      else typing.timer = setTimeout(tick, 16);
    }
    typing.timer = setTimeout(tick, 700);
  }

  // ---------- animated cartoon inside the note ----------
  var fig = noteOverlay.querySelector('.qnote-figure');
  var figCanvas = fig.querySelector('canvas'), figCtx = figCanvas.getContext('2d');
  var dotsEl = fig.querySelector('.qnote-dots');
  var anim = { note: null, raf: 0, start: 0, stage: 0, stageAt: 0, manual: false };
  function stageCount(n) { return Array.isArray(n.scene) ? n.scene.length : n.staged ? n.paras.length : 1; }
  function setupFigure(note) {
    cancelAnimationFrame(anim.raf);
    anim.note = note;
    if (!note.scene || !window.QubiScenes) { fig.hidden = true; return; }
    fig.hidden = false;
    // render at the canvas's real on-screen size, at least 2x for crisp lines
    var Wd = QubiScenes.W, Hd = QubiScenes.H;
    var cssW = figCanvas.getBoundingClientRect().width || Wd;
    var scale = (cssW / Wd) * Math.max(2, window.devicePixelRatio || 1);
    figCanvas.width = Math.round(Wd * scale); figCanvas.height = Math.round(Hd * scale);
    figCtx.setTransform(scale, 0, 0, scale, 0, 0);
    figCtx.imageSmoothingQuality = 'high';
    anim.start = performance.now(); anim.stage = 0; anim.stageAt = anim.start; anim.manual = false;
    var n = stageCount(note);
    dotsEl.innerHTML = '';
    if (n > 1) for (var i = 0; i < n; i++) (function (i) {
      var d = el('button', 'qnote-dot'); d.type = 'button'; d.setAttribute('aria-label', 'Scene ' + (i + 1));
      d.addEventListener('click', function () { finishTyping(); anim.manual = true; goStage(i); });
      dotsEl.appendChild(d);
    })(i);
    goStage(0);
    if (reduceMotion) { drawFigure(performance.now() + 2500); return; }
    anim.raf = requestAnimationFrame(loopFigure);
  }
  function goStage(i) {
    anim.stage = i; anim.stageAt = performance.now();
    [].forEach.call(dotsEl.children, function (d, k) { d.classList.toggle('on', k === i); });
  }
  function drawFigure(now) {
    var note = anim.note, n = stageCount(note);
    if (n > 1 && !anim.manual) {
      if (typing && typing.pi !== undefined && typing.pi !== anim.stage) goStage(Math.min(typing.pi, n - 1));
      else if (!typing && now - anim.stageAt > 5000) goStage((anim.stage + 1) % n);
    }
    var name = Array.isArray(note.scene) ? note.scene[anim.stage] : note.scene;
    var t = (now - (Array.isArray(note.scene) ? anim.stageAt : anim.start)) / 1000;
    QubiScenes.draw(figCtx, name, Math.max(0, t), anim.stage);
  }
  function loopFigure(now) {
    if (noteOverlay.hidden) return;
    drawFigure(now);
    anim.raf = requestAnimationFrame(loopFigure);
  }

  function openNote(note, actions) {
    hideBubble(); clearSpot(); finishTyping();
    qubi.classList.add('away');
    noteOverlay.querySelector('.qnote-title').textContent = note.title;
    var act = noteOverlay.querySelector('.qnote-actions');
    act.innerHTML = '';
    (actions || []).concat([{ label: 'Thanks, Qubi!', primary: true, onClick: function () { closeNote(); mood('love', 1600); } }]).forEach(function (a) {
      var b = el(a.href ? 'a' : 'button', 'qb-btn' + (a.primary ? ' primary' : ''));
      b.textContent = a.label;
      if (a.href) { b.href = a.href; if (/^https?:/.test(a.href)) { b.target = '_blank'; b.rel = 'noopener'; } }
      else { b.type = 'button'; b.addEventListener('click', a.onClick); }
      act.appendChild(b);
    });
    noteOverlay.hidden = false;
    noteOverlay.classList.remove('open'); void noteOverlay.offsetWidth; noteOverlay.classList.add('open');
    typeOut(noteOverlay.querySelector('.qnote-body'), note.paras);
    typeOut.firstMood = null;
    setupFigure(note);
    act.querySelector('.primary').focus({ preventScroll: true });
  }
  function closeNote() {
    finishTyping();
    cancelAnimationFrame(anim.raf);
    noteOverlay.hidden = true;
    qubi.classList.remove('away');
    hop();
  }
  noteOverlay.addEventListener('click', function (e) {
    if (e.target === noteOverlay || e.target.classList.contains('qnote-stage')) closeNote();
  });
  noteOverlay.querySelector('.qnote-close').addEventListener('click', closeNote);
  noteEl.addEventListener('click', function (e) { if (!e.target.closest('a, button')) finishTyping(); });

  // Specific notes
  function linkFor(key) { return document.querySelector('main a[href*="' + key + '"]'); }
  function explainPaper(key, href) {
    var p = papers[key];
    var others = Object.keys(papers).filter(function (k) { return k !== key && linkFor(k); });
    var actions = [];
    if (href) actions.push({ label: 'Read the real paper ↗', href: href });
    if (others.length) actions.push({ label: 'Another one!', onClick: function () {
      var k = others[Math.floor(Math.random() * others.length)];
      var a = linkFor(k);
      explainPaper(k, a && a.href);
    } });
    openNote({ title: 'Qubi explains: ' + p.title, paras: p.paras, scene: p.scene }, actions);
  }
  function randomPaper() {
    var keys = Object.keys(papers).filter(linkFor);
    if (!keys.length) keys = Object.keys(papers);
    var k = keys[Math.floor(Math.random() * keys.length)];
    var a = linkFor(k);
    explainPaper(k, a && a.href);
  }
  function quantumFact() {
    factIdx = (factIdx + 1) % facts.length;
    typeOut.firstMood = 'surprised';
    openNote({ title: 'Quantum fact #' + (factIdx + 1), paras: [facts[factIdx]], scene: factScenes[factIdx] },
      [{ label: 'Another fact!', onClick: quantumFact }]);
  }
  function whatWeDo() {
    var acts = page === 'research' ? [] : [{ label: 'Show me the research', href: 'research.html' }];
    openNote(notes.whatWeDo, acts);
  }

  // ================= "Ask Qubi" buttons next to papers =================
  (function addAskButtons() {
    var targets = [];
    if (page === 'research') targets = [].slice.call(document.querySelectorAll('.highlight > div'));
    if (page === 'publications') targets = [].slice.call(document.querySelectorAll('.pubs li'));
    targets.forEach(function (t) {
      var link = [].slice.call(t.querySelectorAll('a[href]')).filter(function (a) { return paperKey(a.href); })[0];
      if (!link) return;
      var key = paperKey(link.href);
      var b = el('button', 'ask-qubi', '<span class="aq-face" aria-hidden="true"></span>Ask Qubi');
      b.type = 'button';
      b.title = 'Qubi explains ' + papers[key].short + ' in a fun way';
      b.addEventListener('click', function () { explainPaper(key, link.href); });
      b.addEventListener('mouseenter', function () { if (noteOverlay.hidden) mood('excited', 900); });
      t.appendChild(document.createTextNode(' '));
      t.appendChild(b);
    });
  })();

  // ================= News reactions (About page) =================
  (function newsReactions() {
    var list = document.querySelector('.news');
    if (!list) return;
    var items = [].slice.call(list.querySelectorAll('li'));
    function kind(text) {
      if (/preprint/i.test(text)) return { mood: 'excited', say: 'Fresh preprint! 📄', fx: 'confetti', emoji: '📄' };
      if (/published|paper/i.test(text)) return { mood: 'love', say: 'New paper! 🎉', fx: 'confetti', emoji: '🎉' };
      if (/invited talk/i.test(text)) return { mood: 'excited', say: 'Invited talk! 🎤', fx: 'rings', emoji: '🎤' };
      if (/oral|talk/i.test(text)) return { mood: 'excited', say: 'On stage! 🎤', fx: 'rings', emoji: '🎤' };
      if (/poster/i.test(text)) return { mood: 'wink', say: 'Poster time! 🖼️', fx: 'sparkle', emoji: '🖼️' };
      if (/joined/i.test(text)) return { mood: 'happy', say: 'New home! 🏠', fx: 'confetti', emoji: '🏠' };
      return { mood: 'happy', say: 'Nice! 👍', fx: 'sparkle', emoji: '👍' };
    }
    var kinds = items.map(function (li) { return kind(li.textContent); });

    // Narrow screens: tap an item to pop its emoji next to the date
    items.forEach(function (li, i) {
      li.addEventListener('click', function () {
        if (wide()) return;
        var when = li.querySelector('.when'); if (!when || when.querySelector('.nq-emoji')) return;
        var e = el('span', 'nq-emoji', kinds[i].emoji); when.appendChild(e);
        setTimeout(function () { e.remove(); }, 1600);
      });
    });
    function wide() { return innerWidth >= 1040; }

    // Wide screens: a mini Qubi in the left margin hops to each item and reacts
    var mini = el('div', 'news-qubi', qubiSVG() + '<span class="nq-say"></span>');
    mini.setAttribute('aria-hidden', 'true');
    mini.setAttribute('data-mood', 'happy');
    list.appendChild(mini);
    var sayEl = mini.querySelector('.nq-say'), hideTimer = 0, playing = false;

    function burst(li, fx) {
      if (reduceMotion) return;
      var y = li.offsetTop + li.offsetHeight / 2;
      var colors = ['#3f74c4', '#e0607a', '#f2b134', '#3fae6a', '#8a6bb8'];
      var n = fx === 'confetti' ? 16 : fx === 'sparkle' ? 8 : 2;
      for (var k = 0; k < n; k++) {
        var b = el('span', 'nq-bit nq-' + fx);
        b.style.top = y + 'px';
        if (fx !== 'rings') b.style.background = colors[k % colors.length];
        list.appendChild(b);
        var ang = Math.random() * 2 * Math.PI, dist = 30 + Math.random() * 40;
        var frames = fx === 'rings'
          ? [{ transform: 'scale(0.4)', opacity: 0.8 }, { transform: 'scale(2.4)', opacity: 0 }]
          : [{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
             { transform: 'translate(' + Math.cos(ang) * dist + 'px,' + (Math.sin(ang) * dist - 10) + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 0 }];
        var a = b.animate(frames, { duration: fx === 'rings' ? 900 : 800 + Math.random() * 300, delay: fx === 'rings' ? k * 250 : 0, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        a.onfinish = (function (bb) { return function () { bb.remove(); }; })(b);
      }
    }
    function react(i) {
      var li = items[i], kd = kinds[i];
      clearTimeout(hideTimer);
      mini.style.top = (li.offsetTop + li.offsetHeight / 2) + 'px';
      mini.classList.add('show');
      mini.classList.remove('hop'); void mini.offsetWidth; mini.classList.add('hop');
      setMood(mini, kd.mood);
      sayEl.textContent = kd.say;
      sayEl.classList.remove('pop'); void sayEl.offsetWidth; sayEl.classList.add('pop');
      burst(li, kd.fx);
    }
    function hideSoon(ms) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { mini.classList.remove('show'); }, ms || 700);
    }
    function playAll() {
      if (playing || !wide()) return;
      playing = true;
      var i = 0;
      (function next() {
        if (i >= items.length) { playing = false; hideSoon(1400); return; }
        react(i++);
        setTimeout(next, 1150);
      })();
    }
    items.forEach(function (li, i) {
      li.addEventListener('mouseenter', function () { if (wide() && !playing) react(i); });
    });
    list.addEventListener('mouseleave', function () { if (!playing) hideSoon(); });
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); setTimeout(playAll, 500); }
      }, { threshold: 0.6 });
      io.observe(list);
    }
  })();

  // ================= Page menu & suggestions =================
  var pageOptions = {
    about: { ask: "Would you like to know what we do?", primary: { label: 'What do you do?', onClick: whatWeDo } },
    research: { ask: "I can explain any of these papers in a funny way! Look for the <b>Ask Qubi</b> buttons, or let me pick one.",
                primary: { label: 'Surprise me with a paper', onClick: randomPaper },
                second: { label: 'What is all this about?', onClick: whatWeDo } },
    publications: { ask: "Papers can look scary. Want me to tell you about one in a funny way? Every paper has an <b>Ask Qubi</b> button!",
                primary: { label: 'Explain a random paper', onClick: randomPaper } },
    experience: { ask: "Want to hear the story of Mrinal's long quantum walk around the world?",
                primary: { label: 'Tell me the story', onClick: function () { openNote(notes.travel); } } },
    reading: { ask: "Not sure where to begin? I can pick a starting path for you.",
                primary: { label: 'Where should I start?', onClick: function () { openNote(notes.startHere, [{ label: 'Email Mrinal', href: 'mailto:mrinalphy333@gmail.com' }]); } } }
  }[page];

  function menu() {
    var btns = [{ label: pageOptions.primary.label, onClick: pageOptions.primary.onClick, primary: true }];
    if (pageOptions.second) btns.push(pageOptions.second);
    btns.push({ label: 'Take the tour', onClick: startTour });
    btns.push({ label: 'Tell me a quantum fact', onClick: quantumFact });
    if (page === 'about' && !reduceMotion) btns.push({ label: 'Do your quantum walk again!', onClick: function () { hideBubble(); intro(true); } });
    show("Hi! What shall we do?", btns, { menu: true });
    mood('thinking');
  }
  function suggest() {
    if (!bubble.hidden || !noteOverlay.hidden || introRunning || session('qubi-sugg-' + page)) return;
    session('qubi-sugg-' + page, '1');
    mood('excited', 1500);
    show(pageOptions.ask, [
      { label: 'Not now', onClick: notNow },
      { label: 'Yes, please!', primary: true, onClick: pageOptions.primary.onClick }
    ]);
  }

  // ================= Spotlight + tour =================
  var overlay = el('div', 'qubi-overlay');
  overlay.hidden = true;
  overlay.addEventListener('click', function () { closeAll(); });
  document.body.appendChild(overlay);

  var spotEl = null;
  function clearSpot() {
    if (spotEl) spotEl.classList.remove('qubi-spot', 'qubi-spot-rel');
    spotEl = null;
    overlay.classList.remove('on');
    overlay.hidden = true;
  }
  function spot(target) {
    clearSpot();
    if (!target) return;
    spotEl = target;
    if (getComputedStyle(target).position === 'static') target.classList.add('qubi-spot-rel');
    target.classList.add('qubi-spot');
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('on'); });
    if (getComputedStyle(target).position !== 'fixed') target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }
  function visible(e) { return e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; }
  var sideShown = function () { var s = document.querySelector('.qside'); return s && getComputedStyle(s).display !== 'none'; };

  var tours = {
    about: [
      { text: "Hi, I'm <b>Qubi</b>, a little quantum walker! I hop between lattice sites, and between pages. Let me show you around." },
      { target: '.intro', text: "This is Mrinal. He studies how quantum particles move and interact, and simulates them on real quantum computers." },
      { target: '.contact-lines', text: "Want to get in touch? Email, CV, ORCID and LinkedIn are all right here." },
      { target: '.news', text: "The latest news: new papers, talks and travels." },
      { target: '.qw-canvas', text: "See the flickering bars next to the name? That's a quantum walk, spreading over many sites at once!" },
      { target: '.qside', when: sideShown, text: "Each page has its own quantum animation in this corner. Here, a qubit is doing Rabi oscillations on the Bloch sphere." },
      { next: 'research.html', text: "Next stop: the research. Hop along with me!" }
    ],
    research: [
      { target: 'main h2', text: "Welcome to the research page. Here's the big picture first." },
      { target: '.areas', text: "These are the main research directions, from digital quantum simulation to quantum machine learning." },
      { target: '.skills', text: "The toolbox: quantum-computing techniques, tensor networks and the software behind them." },
      { target: '.highlight', text: "A few selected works with their figures. Press <b>Ask Qubi</b> and I'll explain one in a funny way!" },
      { target: '.qside', when: sideShown, text: "This is a quantum-walk light cone: one particle spreading out over time. It looks a lot like the figures in Mrinal's papers!" },
      { next: 'publications.html', text: "Now let's look at the papers." }
    ],
    publications: [
      { target: '.pubs.preprints', text: "Fresh from the lab: preprints that are still under review." },
      { target: '.pubs:not(.preprints)', text: "All journal articles. The grey tag shows each journal's impact factor, and † marks the corresponding author." },
      { target: '.ask-qubi', text: "Every paper has one of these. Click it and I'll tell you what the paper is about, the fun way." },
      { target: '.qside', when: sideShown, text: "Here a quantum circuit entangles three qubits. Measure them and you always get 000 or 111!" },
      { next: 'experience.html', text: "On to positions and talks!" }
    ],
    experience: [
      { target: 'main > .entries', text: "Research positions, from India to Taiwan to Singapore." },
      { target: 'main h2:nth-of-type(2)', text: "Talks and posters at conferences around the world." },
      { target: 'main h2:nth-of-type(3)', text: "Service to the community: refereeing for journals." },
      { target: '.qside', when: sideShown, text: "Two entangled qubits: measure one, and the other always agrees. Spooky!" },
      { next: 'reading.html', text: "Last stop: the reading corner." }
    ],
    reading: [
      { target: '.student-note', text: "Are you a student? Mrinal is happy to guide motivated students informally." },
      { target: '.tabs', text: "Two lists: classic recommended reading, and interesting recent articles." },
      { target: '.tab-panel:not([hidden]) .topic-grid', text: "Click any card to open its list of papers." },
      { target: '.qside', when: sideShown, text: "This is DMRG sweeping over a matrix product state while the energy converges." },
      { text: "That's the whole tour! Click me any time for fun facts and paper stories. Bye for now! 👋", end: true }
    ]
  };

  var active = [], idx = 0;
  function startTour() {
    home();
    qubi.classList.remove('waving');
    document.querySelectorAll('.reveal').forEach(function (e) { e.classList.add('visible'); });
    active = tours[page].filter(function (s) {
      if (s.when && !s.when()) return false;
      if (s.target && !visible(document.querySelector(s.target))) return false;
      return true;
    });
    idx = 0;
    store('qubi-greeted', '1');
    renderStep();
  }
  function renderStep() {
    var s = active[idx];
    spot(s.target ? document.querySelector(s.target) : null);
    if (idx === 0 || s.next || s.end) mood('excited');
    else if (s.target === '.qw-canvas' || s.target === '.qside') mood('surprised');
    else mood(idx % 2 ? 'wink' : 'happy', idx % 2 ? 1200 : 0);
    var counter = '<span class="qb-count">' + (idx + 1) + ' / ' + active.length + '</span>';
    var btns = [];
    if (idx > 0) btns.push({ label: 'Back', onClick: function () { idx--; renderStep(); } });
    if (s.next) btns.push({ label: 'Hop to next page →', primary: true, href: s.next + '?tour=1' });
    else if (s.end || idx === active.length - 1) btns.push({ label: 'Done', primary: true, onClick: closeAll });
    else btns.push({ label: 'Next', primary: true, onClick: function () { idx++; renderStep(); } });
    show(s.text + counter, btns);
  }

  function notNow() { closeAll(); mood('sad', 1700); }
  function closeAll() {
    if (['thinking', 'excited'].indexOf(qubi.getAttribute('data-mood')) !== -1) mood('happy');
    clearSpot();
    hideBubble();
    qubi.classList.remove('waving');
    home();
    store('qubi-greeted', '1');
  }

  qubi.addEventListener('click', function () {
    if (introRunning) return;
    if (!bubble.hidden) { closeAll(); return; }
    menu();
    mood('surprised');
    setTimeout(function () { if (!bubble.hidden && qubi.getAttribute('data-mood') === 'surprised') mood('thinking'); }, 550);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!noteOverlay.hidden) closeNote(); else if (!bubble.hidden) closeAll();
  });

  // ================= Entrance: a quantum walk on the photo =================
  function factorial(m) { var r = 1; for (var i = 2; i <= m; i++) r *= i; return r; }
  function besselJ(n, x) {
    n = Math.abs(n);
    var sum = 0;
    for (var k = 0; k < 25; k++) sum += Math.pow(-1, k) * Math.pow(x / 2, 2 * k + n) / (factorial(k) * factorial(k + n));
    return sum;
  }

  var introRunning = false;
  function intro(replay) {
    var img = document.querySelector('.intro img');
    if (!img) { if (!replay) greet(); return; }
    var r = img.getBoundingClientRect();
    if (reduceMotion || r.bottom < 60 || r.bottom > innerHeight - 20) { if (!replay) greet(); return; }
    introRunning = true;
    clearSpot(); hideBubble(); home(1);
    qubi.classList.add('away');

    // lattice of 7 sites along the bottom edge of the photo, one ghost Qubi per site
    var sites = 7, mid = 3, size = Math.max(34, Math.min(46, r.width / 4.6)), h = size * 112 / 110;
    var stage = el('div', 'qintro');
    stage.setAttribute('aria-hidden', 'true');
    stage.style.left = (r.left + scrollX) + 'px';
    stage.style.top = (r.bottom + scrollY) + 'px';
    stage.style.width = r.width + 'px';
    var say = el('div', 'qi-say', 'quantum walking...');
    stage.appendChild(say);
    var ghosts = [];
    for (var s = 0; s < sites; s++) {
      var x = r.width * (s + 0.5) / sites;
      var dot = el('span', 'qi-site'); dot.style.left = x + 'px'; stage.appendChild(dot);
      var g = el('div', 'qi-ghost', qubiSVG());
      g.style.left = (x - size / 2) + 'px';
      g.style.width = size + 'px'; g.style.height = h + 'px'; g.style.top = -h + 'px';
      g.style.opacity = s === mid ? 1 : 0;
      stage.appendChild(g); ghosts.push(g);
    }
    document.body.appendChild(stage);
    ghosts[mid].classList.add('drop');

    var t0 = null, walkStart = 1000, walkDur = 2400, chosen = 5;
    function frame(now) {
      if (t0 === null) t0 = now;
      var dt = now - t0;
      if (dt <= walkStart) { requestAnimationFrame(frame); return; }
      if (dt < walkStart + walkDur) {
        // |psi_n(t)|^2 = J_n(2t)^2 for a walker starting on the middle site
        var tq = (dt - walkStart) / walkDur * 1.55, probs = [], max = 0;
        for (var n = 0; n < sites; n++) { var j = besselJ(n - mid, 2 * tq); probs.push(j * j); max = Math.max(max, j * j); }
        ghosts.forEach(function (gh, n) {
          var rel = probs[n] / max, a = Math.sqrt(rel) * (0.35 + 0.65 * rel);
          gh.style.opacity = a.toFixed(3);
          gh.style.transform = 'translateY(' + (-7 * Math.abs(Math.sin(dt / 150 + n)) * a).toFixed(1) + 'px)';
        });
        if (dt > walkStart + walkDur * 0.45) say.textContent = "I'm everywhere at once!";
        requestAnimationFrame(frame);
        return;
      }
      collapse();
    }
    function collapse() {
      say.textContent = '👀 Oops, you measured me!';
      ghosts[chosen].setAttribute('data-mood', 'surprised');
      stage.classList.add('flash');
      ghosts.forEach(function (gh, n) {
        gh.style.transition = 'opacity .35s ease, transform .35s ease';
        gh.style.opacity = n === chosen ? 1 : 0;
        gh.style.transform = 'none';
      });
      setTimeout(jumpForward, 1200);
    }
    function jumpForward() {
      var gr = ghosts[chosen].getBoundingClientRect(), b = baseRect();
      var sc = gr.width / b.width;
      var dx = (gr.left + gr.width / 2) - (b.left + b.width / 2);
      var dy = (gr.top + gr.height) - (b.top + b.height);
      qTransform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
      qubi.animate([{ transform: qTransform }, { transform: qTransform }], { duration: 1, fill: 'forwards' });
      qubi.classList.remove('away');
      qubi.classList.add('shown');
      stage.classList.add('done');
      setTimeout(function () { stage.remove(); }, 400);
      moveQubi(frontTransform(), 950, 'cubic-bezier(.3,1.3,.5,1)').onfinish = function () {
        introRunning = false;
        qubi.classList.add('waving');
        mood('excited');
        show("Ta-da! Hi, I'm <b>Qubi</b>, a quantum walker. Did you see? I was in many places at once, until you looked at me! 😳<br>Would you like to know what we do here?", [
          { label: 'Maybe later', onClick: notNow },
          { label: 'Give me the tour', onClick: startTour },
          { label: 'Yes, tell me!', primary: true, onClick: function () { qubi.classList.remove('waving'); home(); whatWeDo(); } }
        ], { front: true });
      };
    }
    requestAnimationFrame(frame);
  }

  function greet() {
    qubi.classList.add('in', 'waving');
    mood('excited');
    show("Hi there! I'm <b>Qubi</b>, a quantum walker who lives on this site. " + pageOptions.ask, [
      { label: 'Not now', onClick: notNow },
      { label: 'Take the tour', onClick: startTour },
      { label: pageOptions.primary.label, primary: true, onClick: function () { qubi.classList.remove('waving'); pageOptions.primary.onClick(); } }
    ]);
  }

  // ================= Start =================
  var params = new URLSearchParams(location.search);
  var continuing = params.get('tour') === '1';
  if (continuing) history.replaceState(null, '', location.pathname + location.hash);
  var firstVisit = !store('qubi-greeted');

  if (page === 'about' && firstVisit && !continuing && !reduceMotion) {
    setTimeout(function () { store('qubi-greeted', '1'); intro(false); }, 1300);
  } else {
    setTimeout(function () {
      qubi.classList.add('in');
      if (continuing) setTimeout(startTour, 500);
      else if (firstVisit) setTimeout(greet, 700);
      else setTimeout(suggest, 5000);
    }, continuing ? 200 : 1200);
  }
})();
