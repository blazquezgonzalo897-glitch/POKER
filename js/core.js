/* =========================================================================
   Motor básico: cartas, baraja, evaluador de manos, equity y rangos.
   Funciona en el navegador (window.PK) y en Node (globalThis.PK).
   Carta = entero 0..51 → rango = (c >> 2) + 2 (2..14), palo = c & 3
   Palos: 0 picas ♠, 1 corazones ♥, 2 diamantes ♦, 3 tréboles ♣
   ========================================================================= */
(function (root) {
  'use strict';
  const PK = root.PK = root.PK || {};

  // ---------------------------------------------------------------- cartas
  const RANK_CHARS = '23456789TJQKA';
  const SUIT_CHARS = 'shdc';
  const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];
  const SUIT_NAMES = ['picas', 'corazones', 'diamantes', 'tréboles'];
  const RANK_SING = { 1: 'As', 2: 'Dos', 3: 'Tres', 4: 'Cuatro', 5: 'Cinco', 6: 'Seis', 7: 'Siete', 8: 'Ocho', 9: 'Nueve', 10: 'Diez', 11: 'Jota', 12: 'Dama', 13: 'Rey', 14: 'As' };
  const RANK_PL = { 2: 'Doses', 3: 'Treses', 4: 'Cuatros', 5: 'Cincos', 6: 'Seises', 7: 'Sietes', 8: 'Ochos', 9: 'Nueves', 10: 'Dieces', 11: 'Jotas', 12: 'Damas', 13: 'Reyes', 14: 'Ases' };

  const rankOf = c => (c >> 2) + 2;
  const suitOf = c => c & 3;
  const makeCard = (rank, suit) => ((rank - 2) << 2) | suit;

  function cardFromStr(s) {
    s = s.trim();
    let r = s.slice(0, -1).toUpperCase(), su = s.slice(-1).toLowerCase();
    if (r === '10') r = 'T';
    const ri = RANK_CHARS.indexOf(r), si = SUIT_CHARS.indexOf(su);
    if (ri < 0 || si < 0) throw new Error('Carta no válida: ' + s);
    return (ri << 2) | si;
  }
  const cardToStr = c => RANK_CHARS[c >> 2] + SUIT_CHARS[c & 3];
  const parseCards = str => (Array.isArray(str) ? str : str.trim().split(/[\s,]+/).filter(Boolean)).map(x => typeof x === 'number' ? x : cardFromStr(x));
  const rankLabel = r => (r === 10 ? '10' : RANK_CHARS[r - 2]);
  const cardName = c => `${RANK_SING[rankOf(c)]} de ${SUIT_NAMES[suitOf(c)]}`;

  // ------------------------------------------------------------- aleatorio
  // Entero uniforme en [0, n) con crypto (rechazo para evitar sesgo).
  const cryptoObj = root.crypto || (typeof globalThis !== 'undefined' && globalThis.crypto);
  const buf = new Uint32Array(1);
  function secureInt(n) {
    if (!cryptoObj || !cryptoObj.getRandomValues) return Math.floor(Math.random() * n);
    const limit = Math.floor(0x100000000 / n) * n;
    let x;
    do { cryptoObj.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  }
  // Fisher-Yates
  function shuffle(arr, randInt = secureInt) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  const makeDeck = () => Array.from({ length: 52 }, (_, i) => i);
  const freshDeck = () => shuffle(makeDeck());
  const fastInt = n => (Math.random() * n) | 0;   // para simulaciones
  const pick = arr => arr[fastInt(arr.length)];
  // Reparte cartas aleatorias evitando las indicadas
  function dealRandom(n, exclude = []) {
    const ex = new Set(exclude);
    const deck = shuffle(makeDeck().filter(c => !ex.has(c)));
    return deck.slice(0, n);
  }

  // ------------------------------------------------------------- evaluador
  // Puntuación = categoría * 16^5 + kickers (base 16). Mayor = mejor.
  const CAT = { HIGH: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4, FLUSH: 5, FULL: 6, QUADS: 7, STRAIGHT_FLUSH: 8 };
  const CAT_NAMES = ['Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Color', 'Full', 'Póker', 'Escalera de color'];
  const B5 = 1048576; // 16^5
  const rc = new Int8Array(15), sc = new Int8Array(4), sm = new Int32Array(4);

  function pack(cat, a = 0, b = 0, c = 0, d = 0, e = 0) {
    return cat * B5 + a * 65536 + b * 4096 + c * 256 + d * 16 + e;
  }
  // Carta más alta de una escalera en la máscara de bits (bit r = rango r). 0 si no hay.
  function straightHigh(m) {
    if (m & (1 << 14)) m |= 2; // As como 1
    for (let h = 14; h >= 5; h--) {
      const w = 31 << (h - 4);
      if ((m & w) === w) return h;
    }
    return 0;
  }
  // Evalúa la mejor mano de 5 cartas entre 5, 6 o 7 cartas.
  function evaluate(cards) {
    rc.fill(0); sc.fill(0); sm.fill(0);
    let mask = 0;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i], r = (c >> 2) + 2, s = c & 3;
      rc[r]++; sc[s]++; sm[s] |= 1 << r; mask |= 1 << r;
    }
    let fs = -1;
    for (let s = 0; s < 4; s++) if (sc[s] >= 5) fs = s;
    if (fs >= 0) {
      const sh = straightHigh(sm[fs]);
      if (sh) return pack(8, sh);
      const k = [];
      for (let r = 14; r >= 2 && k.length < 5; r--) if (sm[fs] & (1 << r)) k.push(r);
      return pack(5, k[0], k[1], k[2], k[3], k[4]);
    }
    let quad = 0; const trips = [], pairs = [];
    for (let r = 14; r >= 2; r--) {
      if (rc[r] === 4) quad = r;
      else if (rc[r] === 3) trips.push(r);
      else if (rc[r] === 2) pairs.push(r);
    }
    if (quad) {
      let k = 0;
      for (let r = 14; r >= 2; r--) if (r !== quad && rc[r]) { k = r; break; }
      return pack(7, quad, k);
    }
    if (trips.length && (trips.length > 1 || pairs.length)) {
      const p = Math.max(trips[1] || 0, pairs[0] || 0);
      return pack(6, trips[0], p);
    }
    const sh = straightHigh(mask);
    if (sh) return pack(4, sh);
    const kick = (exclude, n) => {
      const k = [];
      for (let r = 14; r >= 2 && k.length < n; r--) if (rc[r] && exclude.indexOf(r) < 0) k.push(r);
      return k;
    };
    if (trips.length) { const k = kick([trips[0]], 2); return pack(3, trips[0], k[0], k[1]); }
    if (pairs.length >= 2) { const k = kick([pairs[0], pairs[1]], 1); return pack(2, pairs[0], pairs[1], k[0]); }
    if (pairs.length) { const k = kick([pairs[0]], 3); return pack(1, pairs[0], k[0], k[1], k[2]); }
    const k = kick([], 5);
    return pack(0, k[0], k[1], k[2], k[3], k[4]);
  }
  const category = score => Math.floor(score / B5);
  const kickers = score => [16 ** 4, 16 ** 3, 256, 16, 1].map(d => Math.floor(score / d) % 16);

  function describe(score) {
    const cat = category(score), k = kickers(score);
    const S = RANK_SING, P = RANK_PL;
    switch (cat) {
      case 8: return k[0] === 14 ? 'Escalera real' : `Escalera de color al ${S[k[0]]}`;
      case 7: return `Póker de ${P[k[0]]}`;
      case 6: return `Full de ${P[k[0]]} y ${P[k[1]]}`;
      case 5: return `Color al ${S[k[0]]}`;
      case 4: return k[0] === 5 ? 'Escalera baja (A-2-3-4-5)' : `Escalera al ${S[k[0]]}`;
      case 3: return `Trío de ${P[k[0]]}`;
      case 2: return `Doble pareja: ${P[k[0]]} y ${P[k[1]]}` + (k[2] ? `, kicker ${S[k[2]]}` : '');
      case 1: return `Pareja de ${P[k[0]]}` + (k[1] ? `, kicker ${S[k[1]]}` : '');
      default: return `Carta alta: ${S[k[0]]}`;
    }
  }
  const catName = score => (category(score) === 8 && kickers(score)[0] === 14) ? 'Escalera real' : CAT_NAMES[category(score)];

  function combinations(arr, k) {
    const out = [], cur = [];
    (function rec(i) {
      if (cur.length === k) { out.push(cur.slice()); return; }
      for (let j = i; j <= arr.length - (k - cur.length); j++) { cur.push(arr[j]); rec(j + 1); cur.pop(); }
    })(0);
    return out;
  }
  // Las 5 cartas concretas que forman la mejor jugada (ordenadas por importancia).
  function bestFive(cards) {
    let best = null, bestScore = -1;
    for (const combo of (cards.length === 5 ? [cards] : combinations(cards, 5))) {
      const s = evaluate(combo);
      if (s > bestScore) { bestScore = s; best = combo; }
    }
    return { score: bestScore, cards: sortForDisplay(best, bestScore), name: describe(bestScore), cat: category(bestScore) };
  }
  // Ordena cartas: primero las que forman grupos, luego por rango.
  function sortForDisplay(cards, score) {
    const cnt = {};
    cards.forEach(c => { cnt[rankOf(c)] = (cnt[rankOf(c)] || 0) + 1; });
    const cat = category(score);
    const val = c => {
      let r = rankOf(c);
      if ((cat === 4 || cat === 8) && kickers(score)[0] === 5 && r === 14) r = 1;
      return r;
    };
    return cards.slice().sort((a, b) => (cnt[rankOf(b)] - cnt[rankOf(a)]) || (val(b) - val(a)) || (suitOf(a) - suitOf(b)));
  }
  // Compara manos de varios jugadores con la mesa: devuelve índices de ganadores.
  function winners(holes, board) {
    const scores = holes.map(h => evaluate(h.concat(board)));
    const max = Math.max(...scores);
    return { scores, winners: scores.map((s, i) => s === max ? i : -1).filter(i => i >= 0) };
  }

  // ---------------------------------------------------- manos iniciales
  // Etiqueta tipo "AKs", "T9o", "77"
  function handLabel(c1, c2) {
    let r1 = rankOf(c1), r2 = rankOf(c2);
    if (r2 > r1) { const t = r1; r1 = r2; r2 = t; }
    const a = RANK_CHARS[r1 - 2], b = RANK_CHARS[r2 - 2];
    if (r1 === r2) return a + b;
    return a + b + (suitOf(c1) === suitOf(c2) ? 's' : 'o');
  }
  // Todas las etiquetas en la cuadrícula 13x13 (fila i, columna j; A arriba/izquierda)
  const GRID_RANKS = 'AKQJT98765432';
  function gridLabel(i, j) {
    const a = GRID_RANKS[i], b = GRID_RANKS[j];
    if (i === j) return a + b;
    return i < j ? a + b + 's' : b + a + 'o';
  }
  const ALL_LABELS = [];
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) ALL_LABELS.push(gridLabel(i, j));
  const labelCombosCount = l => (l.length === 2 ? 6 : l[2] === 's' ? 4 : 12);
  function labelToCombos(label, dead) {
    const r1 = RANK_CHARS.indexOf(label[0]) + 2, r2 = RANK_CHARS.indexOf(label[1]) + 2;
    const out = [], d = dead ? new Set(dead) : null;
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) {
      if (r1 === r2 && s2 <= s1) continue;
      if (label[2] === 's' && s1 !== s2) continue;
      if (label[2] === 'o' && s1 === s2) continue;
      const a = makeCard(r1, s1), b = makeCard(r2, s2);
      if (d && (d.has(a) || d.has(b))) continue;
      out.push([a, b]);
    }
    return out;
  }
  // Notación de rangos: "77+, ATs+, KQo, T9s"
  function parseRange(str) {
    const set = new Set();
    const R = RANK_CHARS;
    str.split(/[\s,]+/).filter(Boolean).forEach(tok => {
      const plus = tok.endsWith('+');
      const t = plus ? tok.slice(0, -1) : tok;
      const a = R.indexOf(t[0]), b = R.indexOf(t[1]);
      if (a === b) {
        for (let r = a; r <= (plus ? 12 : a); r++) set.add(R[r] + R[r]);
      } else {
        const hi = Math.max(a, b), lo = Math.min(a, b), suf = t[2];
        for (let r = lo; r <= (plus ? hi - 1 : lo); r++) set.add(R[hi] + R[r] + suf);
      }
    });
    return set;
  }
  // Rangos para abrir (primera subida) en mesa de 6 jugadores, simplificados.
  const OPEN_RANGES = {
    UTG: '77+, ATs+, KTs+, QTs+, JTs, T9s, 98s, AJo+, KQo',
    MP: '66+, A9s+, A5s, A4s, KTs+, QTs+, J9s+, T9s, 98s, 87s, ATo+, KJo+',
    CO: '44+, A2s+, K8s+, Q9s+, J9s+, T8s+, 97s+, 87s, 86s, 76s, 65s, A9o+, KTo+, QTo+, JTo',
    BTN: '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 54s, 53s, A2o+, K8o+, Q9o+, J9o+, T9o, 98o',
    SB: '22+, A2s+, K5s+, Q7s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, A5o+, K9o+, Q9o+, J9o+, T9o',
    BB: '22+, A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s, A2o+, K5o+, Q8o+, J8o+, T8o+, 98o, 87o, 76o'
  };
  const OPEN_SETS = {};
  Object.keys(OPEN_RANGES).forEach(k => { OPEN_SETS[k] = parseRange(OPEN_RANGES[k]); });
  const POSITION_ORDER = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
  const rangePercent = set => [...set].reduce((s, l) => s + labelCombosCount(l), 0) / 1326;

  // Orden de manos por fuerza (equity contra una mano aleatoria). Se rellena en preflop-data.js
  PK.HAND_ORDER = PK.HAND_ORDER || null;
  let pctCache = null;
  function handPercentile(label) {
    if (!pctCache) {
      pctCache = {};
      let cum = 0;
      (PK.HAND_ORDER || ALL_LABELS).forEach(l => { cum += labelCombosCount(l); pctCache[l] = cum / 1326; });
    }
    return pctCache[label];
  }
  // Etiquetas del mejor x% de manos
  function topRange(pct) {
    const set = new Set();
    let cum = 0;
    for (const l of (PK.HAND_ORDER || ALL_LABELS)) {
      if (cum / 1326 >= pct) break;
      set.add(l); cum += labelCombosCount(l);
    }
    return set;
  }
  function rangeCombos(set, dead) {
    const out = [];
    set.forEach(l => labelToCombos(l, dead).forEach(c => out.push(c)));
    return out;
  }

  // --------------------------------------------------------------- equity
  // players: [{cards:[a,b]} | {range:[[a,b],...]} | null (mano aleatoria)]
  function createEquityJob(players, board, opts = {}) {
    board = board || [];
    const n = players.length;
    const deadBase = new Uint8Array(52);
    board.forEach(c => { deadBase[c] = 1; });
    players.forEach(p => { if (p && p.cards) p.cards.forEach(c => { deadBase[c] = 1; }); });
    const ranges = players.map(p => (p && p.range) ? p.range.filter(cb => !deadBase[cb[0]] && !deadBase[cb[1]]) : null);
    const base = [];
    for (let c = 0; c < 52; c++) if (!deadBase[c]) base.push(c);
    const missing = 5 - board.length;
    const share = new Float64Array(n), wins = new Float64Array(n), ties = new Float64Array(n);
    let samples = 0;
    const allKnown = players.every(p => p && p.cards);
    const exact = allKnown && missing <= 2;
    const hands = players.map(p => (p && p.cards) ? p.cards.slice() : [0, 0]);
    const scores = new Float64Array(n);
    const full = board.slice();

    function score(boardFull) {
      let max = -1, cnt = 0;
      for (let i = 0; i < n; i++) {
        const h = hands[i];
        const s = evaluate([h[0], h[1]].concat(boardFull));
        scores[i] = s;
        if (s > max) { max = s; cnt = 1; } else if (s === max) cnt++;
      }
      for (let i = 0; i < n; i++) if (scores[i] === max) {
        share[i] += 1 / cnt;
        if (cnt === 1) wins[i]++; else ties[i]++;
      }
      samples++;
    }
    function runExact() {
      if (missing === 0) score(board);
      else if (missing === 1) for (const c of base) score(board.concat([c]));
      else for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++) score(board.concat([base[i], base[j]]));
    }
    const work = base.slice();
    const used = new Uint8Array(52);
    function runMC(k) {
      for (let it = 0; it < k; it++) {
        used.fill(0);
        let top = 0, ok = true;
        const draw = () => {
          while (top < work.length) {
            const j = top + fastInt(work.length - top);
            const t = work[top]; work[top] = work[j]; work[j] = t;
            const c = work[top++];
            if (!used[c]) { used[c] = 1; return c; }
          }
          return -1;
        };
        // primero los rangos (para que no choquen con cartas aleatorias)
        for (let i = 0; i < n && ok; i++) {
          if (!ranges[i]) continue;
          let tries = 0, cb;
          do { cb = ranges[i][fastInt(ranges[i].length)]; tries++; } while ((used[cb[0]] || used[cb[1]]) && tries < 30);
          if (!cb || used[cb[0]] || used[cb[1]]) { ok = false; break; }
          used[cb[0]] = used[cb[1]] = 1; hands[i] = cb;
        }
        if (!ok) continue;
        for (let i = 0; i < n; i++) if (!players[i]) { hands[i] = [draw(), draw()]; }
        full.length = board.length;
        for (let m = 0; m < missing; m++) full.push(draw());
        score(full);
      }
    }
    return {
      exact,
      run(k) { if (exact) { if (!samples) runExact(); return true; } runMC(k); return false; },
      result() {
        const d = samples || 1;
        return { equity: Array.from(share, x => x / d), win: Array.from(wins, x => x / d), tie: Array.from(ties, x => x / d), samples, exact };
      }
    };
  }
  function equity(players, board, opts = {}) {
    const job = createEquityJob(players, board, opts);
    job.run(opts.iterations || 4000);
    return job.result();
  }
  // Versión asíncrona por bloques para no bloquear la interfaz
  function equityAsync(players, board, opts = {}) {
    const total = opts.iterations || 20000, chunk = opts.chunk || 1500;
    const job = createEquityJob(players, board, opts);
    return new Promise(resolve => {
      let done = 0;
      const step = () => {
        const fin = job.run(chunk);
        done += chunk;
        if (fin || done >= total) resolve(job.result());
        else setTimeout(step, 0);
      };
      step();
    });
  }

  // ------------------------------------------------- análisis de la mano
  const boardOnlyScore = board => (board.length >= 5 ? evaluate(board) : -1);
  // Proyectos: color (4 del mismo palo con alguna carta propia) y escalera.
  function drawInfo(hole, board) {
    const all = hole.concat(board);
    const res = { flushDraw: false, oesd: false, gutshot: false, straightOuts: 0, flushOuts: 0, backdoorFlush: false };
    if (board.length < 3 || board.length >= 5) return res;
    const made = category(evaluate(all));
    for (let s = 0; s < 4; s++) {
      const cnt = all.filter(c => suitOf(c) === s).length;
      const mine = hole.some(c => suitOf(c) === s);
      if (cnt === 4 && mine && made < 5) { res.flushDraw = true; res.flushOuts = 9; }
      if (cnt === 3 && mine && board.length === 3 && hole.filter(c => suitOf(c) === s).length >= 1) res.backdoorFlush = res.backdoorFlush || cnt === 3;
    }
    let mask = 0, bmask = 0;
    all.forEach(c => { mask |= 1 << rankOf(c); });
    board.forEach(c => { bmask |= 1 << rankOf(c); });
    if (made < 4 || !straightHigh(mask)) {
      if (!straightHigh(mask)) {
        let ranks = 0;
        for (let r = 2; r <= 14; r++) {
          if (mask & (1 << r)) continue;
          if (straightHigh(mask | (1 << r)) && !straightHigh(bmask | (1 << r))) ranks++;
        }
        res.straightOuts = ranks * 4;
        if (ranks >= 2) res.oesd = true; else if (ranks === 1) res.gutshot = true;
      }
    }
    return res;
  }
  // Cartas que, al salir, hacen que el héroe gane contra la mano conocida del rival
  function outsAgainst(hero, villain, board) {
    const dead = new Set(hero.concat(villain, board));
    const outs = [];
    for (let c = 0; c < 52; c++) {
      if (dead.has(c)) continue;
      const nb = board.concat([c]);
      if (evaluate(hero.concat(nb)) > evaluate(villain.concat(nb))) outs.push(c);
    }
    return outs;
  }
  // Las mejores jugadas posibles (nuts) con esa mesa
  function nutsOf(board) {
    const dead = new Set(board);
    let best = -1, combos = [];
    for (let a = 0; a < 52; a++) {
      if (dead.has(a)) continue;
      for (let b = a + 1; b < 52; b++) {
        if (dead.has(b)) continue;
        const s = evaluate([a, b].concat(board));
        if (s > best) { best = s; combos = [[a, b]]; } else if (s === best) combos.push([a, b]);
      }
    }
    return { score: best, name: describe(best), cat: category(best), combos };
  }
  // Clasifica la fuerza relativa de una mano en una mesa (para principiantes)
  function handClass(hole, board) {
    const all = hole.concat(board);
    const score = evaluate(all), cat = category(score);
    const boardCat = board.length >= 5 ? category(evaluate(board)) : boardCategoryPartial(board);
    const br = board.map(rankOf).sort((a, b) => b - a);
    const hr = hole.map(rankOf).sort((a, b) => b - a);
    const draws = drawInfo(hole, board);
    const hasDraw = draws.flushDraw || draws.oesd;
    const k = kickers(score);
    const pairedBoard = new Set(br).size < br.length;
    const suitMax = Math.max(...[0, 1, 2, 3].map(s => board.filter(c => suitOf(c) === s).length));
    const straightOnBoard = (() => { let m = 0; board.forEach(c => { m |= 1 << rankOf(c); }); for (let h = 14; h >= 5; h--) { let cnt = 0; for (let r = h - 4; r <= h; r++) if (m & (1 << (r === 1 ? 14 : r))) cnt++; if (cnt >= 4) return true; } return false; })();
    let cls, why;
    if (boardCat >= cat && board.length >= 5 && score <= evaluate(board)) {
      cls = 'debil'; why = 'Tu mejor jugada es la que ya forma la mesa: la comparten todos.';
    } else if (cat >= 6) { cls = 'monstruo'; why = `${CAT_NAMES[cat]}: de lo mejor que se puede tener.`; }
    else if (cat === 5) {
      const fsuit = [0, 1, 2, 3].find(s => all.filter(c => suitOf(c) === s).length >= 5);
      const heroTop = Math.max(0, ...hole.filter(c => suitOf(c) === fsuit).map(rankOf));
      cls = (suitMax >= 4 && heroTop < 13) ? 'fuerte' : 'monstruo';
      why = cls === 'monstruo' ? 'Color: una mano muy alta.' : 'Color, pero con cuatro cartas del palo en la mesa un color mayor es posible.';
    }
    else if (cat === 4) { cls = (suitMax >= 3 || pairedBoard) ? 'fuerte' : 'monstruo'; why = cls === 'monstruo' ? 'Escalera en una mesa sin color ni pareja: casi imbatible.' : 'Escalera, pero la mesa permite color o full.'; }
    else if (cat === 3) {
      const set = hr[0] === hr[1];
      cls = (suitMax >= 3 || straightOnBoard) ? 'fuerte' : 'monstruo';
      if (!set && pairedBoard && hole.every(c => !board.some(b => rankOf(b) === rankOf(c)))) { cls = 'debil'; why = 'El trío está en la mesa: lo tiene todo el mundo.'; }
      else why = set ? 'Trío con pareja en mano (set): muy fuerte y escondido.' : 'Trío: mano muy fuerte.';
      if (!why) why = 'Trío.';
    } else if (cat === 2) {
      const usesBoth = hr[0] !== hr[1] && hr.every(r => br.includes(r));
      const boardPairRank = br.find((r, i) => br.indexOf(r) !== i);
      if (usesBoth) { cls = suitMax >= 3 || straightOnBoard ? 'fuerte' : 'monstruo'; why = 'Doble pareja con tus dos cartas.'; }
      else if (hr[0] === hr[1] && hr[0] > br[0]) { cls = 'fuerte'; why = 'Sobrepareja más la pareja de la mesa.'; }
      else if (boardPairRank && hole.some(c => rankOf(c) === br[0]) && k[0] === br[0]) { cls = 'fuerte'; why = 'Pareja máxima con la mesa doblada.'; }
      else if (boardPairRank && hole.some(c => board.some(b => rankOf(b) === rankOf(c)))) { cls = 'media'; why = 'Una pareja tuya y otra de la mesa: vale menos de lo que parece.'; }
      else { cls = hr[0] === hr[1] ? 'media' : 'debil'; why = 'La doble pareja la forma sobre todo la mesa.'; }
    } else if (cat === 1) {
      const pr = k[0];
      const inBoardOnly = pairedBoard && br.filter(r => r === pr).length === 2;
      if (inBoardOnly) { cls = 'debil'; why = 'La pareja está en la mesa: solo juegas carta alta.'; }
      else if (hr[0] === hr[1] && hr[0] > br[0]) { cls = 'fuerte'; why = 'Sobrepareja: pareja en mano más alta que cualquier carta de la mesa.'; }
      else if (pr === br[0]) {
        const kicker = hr[0] === pr ? hr[1] : hr[0];
        if (kicker >= 11) { cls = 'fuerte'; why = 'Pareja máxima (top pair) con buen kicker.'; }
        else { cls = 'media'; why = 'Pareja máxima con kicker flojo.'; }
      } else if (pr >= br[1] && pr !== br[br.length - 1]) { cls = 'media'; why = 'Segunda pareja: puede ganar, pero cuidado si el rival apuesta fuerte.'; }
      else { cls = 'debil'; why = 'Pareja baja: gana a pocas manos.'; }
    } else { cls = 'debil'; why = 'Solo carta alta.'; }
    if (hasDraw && board.length < 5 && (cls === 'debil' || cls === 'media')) {
      cls = 'proyecto';
      why = draws.flushDraw && draws.oesd ? 'Proyecto doble: color y escalera abierta (muchos outs).' : draws.flushDraw ? 'Proyecto de color: 9 outs para ligar.' : 'Proyecto de escalera abierta: 8 outs.';
    }
    if ((cat === 1 || cat === 2) && suitMax >= 4 && cls === 'fuerte') { cls = 'media'; why += ' Pero hay cuatro cartas del mismo palo en la mesa.'; }
    return { cls, why, name: describe(score), score, draws };
  }
  function boardCategoryPartial(board) {
    const cnt = {};
    board.forEach(c => { cnt[rankOf(c)] = (cnt[rankOf(c)] || 0) + 1; });
    const v = Object.values(cnt).sort((a, b) => b - a);
    if (v[0] === 4) return 7;
    if (v[0] === 3) return v[1] === 2 ? 6 : 3;
    if (v[0] === 2) return v[1] === 2 ? 2 : 1;
    return 0;
  }
  // Textura de la mesa
  function boardTexture(board) {
    const suits = [0, 1, 2, 3].map(s => board.filter(c => suitOf(c) === s).length);
    const maxSuit = Math.max(...suits);
    const ranks = [...new Set(board.map(rankOf))].sort((a, b) => a - b);
    let connected = 0;
    for (let h = 14; h >= 5; h--) {
      let cnt = 0;
      for (let r = h - 4; r <= h; r++) if (ranks.includes(r) || (r === 1 && ranks.includes(14))) cnt++;
      connected = Math.max(connected, cnt);
    }
    const paired = ranks.length < board.length;
    let score = 0;
    if (maxSuit >= 3) score += 3; else if (maxSuit === 2) score += 1;
    if (connected >= 3) score += 2; else if (connected === 2) score += 0.5;
    if (board.filter(c => rankOf(c) >= 10).length >= 2) score += 0.5;
    const label = score >= 3 ? 'muy coordinada' : score >= 1.5 ? 'coordinada' : 'seca';
    return { maxSuit, connected, paired, score, label, wet: score >= 1.5 };
  }

  Object.assign(PK, {
    RANK_CHARS, SUIT_CHARS, SUIT_SYMBOLS, SUIT_NAMES, RANK_SING, RANK_PL, CAT, CAT_NAMES, GRID_RANKS, ALL_LABELS,
    OPEN_RANGES, OPEN_SETS, POSITION_ORDER,
    rankOf, suitOf, makeCard, cardFromStr, cardToStr, parseCards, rankLabel, cardName,
    secureInt, shuffle, makeDeck, freshDeck, fastInt, pick, dealRandom,
    evaluate, category, kickers, describe, catName, bestFive, combinations, winners, straightHigh,
    handLabel, gridLabel, labelCombosCount, labelToCombos, parseRange, rangePercent, handPercentile, topRange, rangeCombos,
    equity, equityAsync, createEquityJob, drawInfo, outsAgainst, nutsOf, handClass, boardTexture, boardOnlyScore
  });
})(typeof window !== 'undefined' ? window : globalThis);
