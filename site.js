// Site-wide effects: header quantum-walk animation and fade-in on scroll.
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Fade sections in as they scroll into view ----------
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealer.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('main > *').forEach(function (el) {
      el.classList.add('reveal');
      revealer.observe(el);
    });
  }

  // ---------- Header: continuous-time quantum walk on a 1D lattice ----------
  // A particle starts on the central site and spreads ballistically,
  // |psi_n(t)|^2 = |J_n(2t)|^2, drawn as a faint bar chart over the lattice.
  var header = document.querySelector('header');
  if (!header) return;
  var canvas = document.createElement('canvas');
  canvas.className = 'qw-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  header.insertBefore(canvas, header.firstChild);
  var ctx = canvas.getContext('2d');

  var N = 41, center = (N - 1) / 2;
  var re, im, t;
  var dt = 0.01, stepsPerFrame = 2, tMax = 9.5;

  function reset() {
    re = new Float64Array(N); im = new Float64Array(N);
    re[center] = 1; t = 0;
  }

  // d(psi)/dt = -i H psi with H = -(hop left + hop right); RK4 step
  function deriv(r, i, dr, di) {
    for (var n = 0; n < N; n++) {
      var hr = -((n > 0 ? r[n - 1] : 0) + (n < N - 1 ? r[n + 1] : 0));
      var hi = -((n > 0 ? i[n - 1] : 0) + (n < N - 1 ? i[n + 1] : 0));
      dr[n] = hi;   // -i * (hr + i*hi) = hi - i*hr
      di[n] = -hr;
    }
  }
  var k = [], tmpR = new Float64Array(N), tmpI = new Float64Array(N);
  for (var j = 0; j < 4; j++) k.push([new Float64Array(N), new Float64Array(N)]);
  function step() {
    deriv(re, im, k[0][0], k[0][1]);
    for (var s = 1; s < 4; s++) {
      var f = s === 3 ? dt : dt / 2;
      for (var n = 0; n < N; n++) {
        tmpR[n] = re[n] + f * k[s - 1][0][n];
        tmpI[n] = im[n] + f * k[s - 1][1][n];
      }
      deriv(tmpR, tmpI, k[s][0], k[s][1]);
    }
    for (var m = 0; m < N; m++) {
      re[m] += dt / 6 * (k[0][0][m] + 2 * k[1][0][m] + 2 * k[2][0][m] + k[3][0][m]);
      im[m] += dt / 6 * (k[0][1][m] + 2 * k[1][1][m] + 2 * k[2][1][m] + k[3][1][m]);
    }
    t += dt;
  }

  var W = 0, H = 0;
  function resize() {
    var dpr = Math.max(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    var color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1f3f6e';
    ctx.clearRect(0, 0, W, H);
    // fade in at the start and out before restarting
    var fade = Math.min(1, t / 0.6, (tMax - t) / 0.8);
    var gap = W / N, base = H - 8, barW = Math.max(2, gap * 0.45);
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gap / 2, base); ctx.lineTo(W - gap / 2, base); ctx.stroke();
    for (var n = 0; n < N; n++) {
      var x = gap * (n + 0.5);
      var p = re[n] * re[n] + im[n] * im[n];
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, base, 1.6, 0, 2 * Math.PI); ctx.fill();
      var h = (base - 6) * Math.sqrt(p);
      ctx.globalAlpha = 0.38 * Math.max(0, fade);
      ctx.fillRect(x - barW / 2, base - h, barW, h);
    }
    ctx.globalAlpha = 1;
  }

  reset(); resize();
  window.addEventListener('resize', function () { resize(); draw(); });

  if (reduceMotion) {
    // Static snapshot of the spread-out walk
    while (t < 6) step();
    tMax = 1e9; draw();
    return;
  }

  var running = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      var was = running; running = e[0].isIntersecting;
      if (running && !was) requestAnimationFrame(loop);
    }).observe(canvas);
  }
  function loop() {
    if (!running) return;
    for (var s = 0; s < stepsPerFrame; s++) step();
    if (t >= tMax) reset();
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
