// QSim: a small, exact state-vector simulator for the Quantum Playbook.
// Good for up to ~10 qubits. Qubit 0 is the rightmost (least significant) bit,
// so basis state index 6 = |110> means qubit 2 = 1, qubit 1 = 1, qubit 0 = 0.
(function () {
  var S2 = Math.SQRT1_2;

  // 2x2 gate matrices as [[re, im], [re, im], [re, im], [re, im]] in row-major order
  var G = {
    I: [[1, 0], [0, 0], [0, 0], [1, 0]],
    X: [[0, 0], [1, 0], [1, 0], [0, 0]],
    Y: [[0, 0], [0, -1], [0, 1], [0, 0]],
    Z: [[1, 0], [0, 0], [0, 0], [-1, 0]],
    H: [[S2, 0], [S2, 0], [S2, 0], [-S2, 0]],
    S: [[1, 0], [0, 0], [0, 0], [0, 1]],
    T: [[1, 0], [0, 0], [0, 0], [S2, S2]]
  };
  function RX(t) { var c = Math.cos(t / 2), s = Math.sin(t / 2); return [[c, 0], [0, -s], [0, -s], [c, 0]]; }
  function RY(t) { var c = Math.cos(t / 2), s = Math.sin(t / 2); return [[c, 0], [-s, 0], [s, 0], [c, 0]]; }
  function RZ(t) { var c = Math.cos(t / 2), s = Math.sin(t / 2); return [[c, -s], [0, 0], [0, 0], [c, s]]; }

  function State(n) {
    this.n = n; this.dim = 1 << n;
    this.re = new Float64Array(this.dim); this.im = new Float64Array(this.dim);
    this.re[0] = 1;
  }
  State.prototype.clone = function () {
    var s = new State(this.n); s.re.set(this.re); s.im.set(this.im); return s;
  };
  // set amplitudes from an array of [re, im] pairs (normalised automatically)
  State.prototype.set = function (amps) {
    var norm = 0;
    for (var i = 0; i < this.dim; i++) { var a = amps[i] || [0, 0]; norm += a[0] * a[0] + a[1] * a[1]; }
    norm = Math.sqrt(norm) || 1;
    for (var j = 0; j < this.dim; j++) { var b = amps[j] || [0, 0]; this.re[j] = b[0] / norm; this.im[j] = b[1] / norm; }
    return this;
  };
  // apply a 2x2 gate to qubit q, optionally only where control qubit c is 1
  State.prototype.apply = function (m, q, c) {
    var bit = 1 << q, cb = c === undefined ? 0 : 1 << c;
    for (var i = 0; i < this.dim; i++) {
      if (i & bit) continue;
      if (cb && !(i & cb)) continue;
      var j = i | bit;
      var ar = this.re[i], ai = this.im[i], br = this.re[j], bi = this.im[j];
      this.re[i] = m[0][0] * ar - m[0][1] * ai + m[1][0] * br - m[1][1] * bi;
      this.im[i] = m[0][0] * ai + m[0][1] * ar + m[1][0] * bi + m[1][1] * br;
      this.re[j] = m[2][0] * ar - m[2][1] * ai + m[3][0] * br - m[3][1] * bi;
      this.im[j] = m[2][0] * ai + m[2][1] * ar + m[3][0] * bi + m[3][1] * br;
    }
    return this;
  };
  ['X', 'Y', 'Z', 'H', 'S', 'T'].forEach(function (g) {
    State.prototype[g.toLowerCase()] = function (q) { return this.apply(G[g], q); };
  });
  State.prototype.rx = function (t, q) { return this.apply(RX(t), q); };
  State.prototype.ry = function (t, q) { return this.apply(RY(t), q); };
  State.prototype.rz = function (t, q) { return this.apply(RZ(t), q); };
  State.prototype.cnot = function (c, t) { return this.apply(G.X, t, c); };
  State.prototype.cz = function (c, t) { return this.apply(G.Z, t, c); };

  State.prototype.probs = function () {
    var p = new Float64Array(this.dim);
    for (var i = 0; i < this.dim; i++) p[i] = this.re[i] * this.re[i] + this.im[i] * this.im[i];
    return p;
  };
  // sample one full-register outcome (does not change the state)
  State.prototype.sample = function (rand) {
    var r = (rand || Math.random)(), p = this.probs(), acc = 0;
    for (var i = 0; i < this.dim; i++) { acc += p[i]; if (r < acc) return i; }
    return this.dim - 1;
  };
  State.prototype.counts = function (shots, rand) {
    var c = new Array(this.dim).fill(0);
    for (var s = 0; s < shots; s++) c[this.sample(rand)]++;
    return c;
  };
  // measure the whole register and collapse onto the outcome
  State.prototype.measure = function (rand) {
    var k = this.sample(rand);
    this.re.fill(0); this.im.fill(0); this.re[k] = 1;
    return k;
  };
  // Bloch vector of a single-qubit state
  State.prototype.bloch = function () {
    var ar = this.re[0], ai = this.im[0], br = this.re[1], bi = this.im[1];
    return [2 * (ar * br + ai * bi), 2 * (ar * bi - ai * br), ar * ar + ai * ai - br * br - bi * bi];
  };
  State.prototype.ket = function (i) {
    var s = i.toString(2); while (s.length < this.n) s = '0' + s; return '|' + s + '⟩';
  };

  window.QSim = { State: State, gates: G, RX: RX, RY: RY, RZ: RZ };
})();
