/* =========================================================================
   Utilidades de interfaz: estado guardado, progreso, sonido, iconos, fichas,
   cartas, glosario, avisos y ventanas.
   ========================================================================= */
(function (root) {
  'use strict';
  const PK = root.PK = root.PK || {};
  const SYM = PK.SUIT_SYMBOLS.map(s => s + '︎');   // forzar el glifo de texto, nunca emoji
  const reduceMotion = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ------------------------------------------------------------ estado
  const KEY = 'escuelaPoker.v1';
  const DEFAULT = () => ({
    xp: 0, unlocked: 1, passed: {}, examBest: {}, lessonsDone: {},
    games: {}, mistakes: [], badges: {},
    days: { last: null, streak: 0, best: 0 },
    daily: null,
    play: { hands: 0, vpip: 0, pfr: 0, bets: 0, calls: 0, won: 0, good: 0, doubt: 0, bad: 0, errorKinds: {} },
    history: [],
    counters: { outsRight: 0, callFoldRight: 0, foldRight: 0, reviewSolved: 0 },
    settings: { theme: 'auto', fourColor: false, sound: false, coach: true, timer: false },
    placementDone: false
  });
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULT();
      const s = JSON.parse(raw), d = DEFAULT();
      for (const k in d) if (s[k] == null) s[k] = d[k];
      for (const k in d.settings) if (s.settings[k] == null) s.settings[k] = d.settings[k];
      for (const k in d.play) if (s.play[k] == null) s.play[k] = d.play[k];
      for (const k in d.counters) if (s.counters[k] == null) s.counters[k] = d.counters[k];
      return s;
    } catch (e) { return DEFAULT(); }
  }
  const S = PK.S = load();
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* almacenamiento no disponible */ } }, 150);
  }
  PK.save = save;
  PK.resetProgress = () => { const s = DEFAULT(); s.settings = S.settings; Object.keys(S).forEach(k => delete S[k]); Object.assign(S, s); save(); };

  // ------------------------------------------------------------ fechas
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => ymd(new Date());
  function touchDay() {
    const t = today();
    if (S.days.last === t) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    S.days.streak = S.days.last === ymd(y) ? S.days.streak + 1 : 1;
    S.days.best = Math.max(S.days.best, S.days.streak);
    S.days.last = t;
    if (S.days.streak >= 3) award('constante');
    if (S.days.streak >= 7) award('semana');
    save();
  }

  // ------------------------------------------------------- XP e insignias
  const playerLevel = xp => Math.floor(Math.sqrt(xp / 60)) + 1;
  const xpForLevel = l => (l - 1) * (l - 1) * 60;
  function addXP(n) {
    if (!n) return;
    const before = playerLevel(S.xp);
    S.xp += Math.round(n);
    toast(`<b>+${Math.round(n)} XP</b>`, 'xp', 'star');
    if (playerLevel(S.xp) > before) setTimeout(() => toast(`Subes al nivel de jugador <b>${playerLevel(S.xp)}</b>`, 'level', 'trend'), 600);
    touchDay(); save(); updateHeader();
  }
  const BADGE_ICONS = { primerPaso: 'play', primerExamen: 'exam', primerFull: 'cards', primerColor: 'cards', primerBote: 'chip', cazadorOuts: 'crosshair', matematico: 'percent', racha10: 'flame', constante: 'calendar', semana: 'calendar', buenJuicio: 'check', superviviente: 'trophy', fold: 'x', maestro: 'course', estadistico: 'trend', repaso: 'refresh', retoDiario: 'star' };
  const badgeChip = (id, cls = '') => chip(icon(BADGE_ICONS[id] || 'star'), Object.keys(PK.BADGES).indexOf(id), cls);
  function award(id) {
    if (S.badges[id] || !PK.BADGES[id]) return;
    S.badges[id] = Date.now();
    const b = PK.BADGES[id];
    setTimeout(() => toast(`Insignia desbloqueada: <b>${b.name}</b>`, 'badge', null, badgeChip(id)), 300);
    Sound.play('win');
    save();
  }

  // --------------------------------------------------------- reto diario
  const DAILY_TASKS = [
    { type: 'game', text: g => `Acierta 6 en «${PK.GAMES[g].title}»`, target: 6 },
    { type: 'hands', text: () => 'Juega 10 manos en la mesa', target: 10 },
    { type: 'lesson', text: () => 'Completa o repasa una lección', target: 1 },
    { type: 'good', text: () => 'Consigue 5 decisiones «Buena» en la mesa', target: 5 },
    { type: 'game', text: g => `Acierta 6 en «${PK.GAMES[g].title}»`, target: 6 }
  ];
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function daily() {
    const t = today();
    if (!S.daily || S.daily.date !== t) {
      const h = hashStr(t);
      const task = DAILY_TASKS[h % DAILY_TASKS.length];
      const games = availableGames().filter(g => !PK.GAMES[g].tool);
      const game = games[(h >>> 4) % games.length];
      S.daily = { date: t, type: task.type, game, target: task.target, text: task.text(game), progress: 0, done: false };
      save();
    }
    return S.daily;
  }
  function dailyProgress(type, game) {
    const d = daily();
    if (d.done || d.type !== type || (type === 'game' && d.game !== game)) return;
    d.progress++;
    if (d.progress >= d.target) { d.done = true; toast('Reto diario completado', 'badge', 'calendar'); award('retoDiario'); addXP(50); }
    save();
  }

  // ---------------------------------------------------- niveles y juegos
  function gameLevel(id) {
    const lv = PK.LEVELS.find(l => l.games.includes(id));
    return lv ? lv.id : (PK.GAMES[id] && PK.GAMES[id].level) || 1;
  }
  const availableGames = () => Object.keys(PK.GAMES).filter(id => id !== 'mcq' && gameLevel(id) <= S.unlocked);
  const difficulty = () => Math.min(1, (S.unlocked - 1) / 5);
  function recordGame(id, correct, q) {
    const g = S.games[id] = S.games[id] || { right: 0, wrong: 0, best: 0, plays: 0 };
    if (correct) g.right++; else g.wrong++;
    if (!correct && q) {
      S.mistakes.unshift({ game: id, q, ts: Date.now() });
      if (S.mistakes.length > 40) S.mistakes.length = 40;
    }
    if (correct) {
      if (id === 'outsHunter' && ++S.counters.outsRight >= 10) award('cazadorOuts');
      if (id === 'callFold' && ++S.counters.callFoldRight >= 10) award('matematico');
      if (id === 'openFold' && q && !q.open && ++S.counters.foldRight >= 10) award('fold');
      dailyProgress('game', id);
    }
    touchDay(); save(); updateHeader();
  }

  // ------------------------------------------------------------- sonido
  const Sound = PK.Sound = {
    ctx: null,
    play(name) {
      if (!S.settings.sound) return;
      try {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return;
        this.ctx = this.ctx || new AC();
        const c = this.ctx, t = c.currentTime;
        const tone = (f, start, dur, type = 'sine', vol = 0.12) => {
          const o = c.createOscillator(), g = c.createGain();
          o.type = type; o.frequency.value = f;
          g.gain.setValueAtTime(vol, t + start); g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
          o.connect(g); g.connect(c.destination); o.start(t + start); o.stop(t + start + dur + 0.02);
        };
        const noise = (start, dur, vol = 0.15, freq = 3000) => {
          const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
          const d = b.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
          const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
          f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
          s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t + start);
        };
        switch (name) {
          case 'deal': noise(0, 0.07, 0.25, 2500); break;
          case 'chip': tone(1800, 0, 0.05, 'triangle', 0.08); tone(2400, 0.04, 0.05, 'triangle', 0.06); break;
          case 'tick': tone(900, 0, 0.03, 'square', 0.03); break;
          case 'right': tone(660, 0, 0.12); tone(990, 0.09, 0.18); break;
          case 'wrong': tone(220, 0, 0.25, 'sawtooth', 0.06); break;
          case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.2)); break;
          case 'fold': noise(0, 0.12, 0.12, 900); break;
        }
      } catch (e) { /* sin audio */ }
    }
  };

  // ------------------------------------------------------------- iconos
  // Trazos de 24×24; heredan el color del texto.
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9v11.5h13V9"/><path d="M10 20.5v-6h4v6"/>',
    course: '<path d="M2.5 8.5 12 4.5l9.5 4-9.5 4z"/><path d="M6.5 10.5v4.2c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.2"/><path d="M21.5 8.5v5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    table: '<rect x="3.5" y="7" width="10.5" height="14" rx="1.8"/><path d="M8.5 7V4.8A1.8 1.8 0 0 1 10.3 3h8.4a1.8 1.8 0 0 1 1.8 1.8v11.4a1.8 1.8 0 0 1-1.8 1.8H14"/>',
    cards: '<rect x="3.5" y="7" width="10.5" height="14" rx="1.8"/><path d="M8.5 7V4.8A1.8 1.8 0 0 1 10.3 3h8.4a1.8 1.8 0 0 1 1.8 1.8v11.4a1.8 1.8 0 0 1-1.8 1.8H14"/>',
    flag: '<path d="M5.5 21V3.5"/><path d="M5.5 4h11.5l-2.5 4.25L17 12.5H5.5"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/><path d="M12 7.5V12l3 2"/>',
    chart: '<path d="M4 20.5h16.5"/><path d="M6.5 17v-6"/><path d="M11.5 17V5.5"/><path d="M16.5 17v-8"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15.5H6.5A1.5 1.5 0 0 0 5 20V4.5z"/><path d="M5 20a1.5 1.5 0 0 0 1.5 1.5H19"/><path d="M9 7.5h6"/>',
    settings: '<path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 12h3"/><path d="M11 12h9"/><circle cx="9" cy="12" r="2"/><path d="M4 17h11"/><path d="M19 17h1"/><circle cx="17" cy="17" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2z"/>',
    volume: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    flame: '<path d="M12 21.5c3.6 0 6-2.6 6-6 0-4.5-4-6.5-4.8-11-2.2 1.6-3.6 4-3.2 6.8C8.8 10.5 8 9.2 8 8c-1.6 1.6-2 3.6-2 5.5 0 4.4 2.4 8 6 8z"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    trophy: '<path d="M8 3.5h8v5.5a4 4 0 0 1-8 0z"/><path d="M16 5h3.5v1.5A3.5 3.5 0 0 1 16 10"/><path d="M8 5H4.5v1.5A3.5 3.5 0 0 0 8 10"/><path d="M12 13v4"/><path d="M8.5 20.5h7"/><path d="M9.5 17h5v3.5h-5z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    'arrow-left': '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
    'chevron-left': '<path d="m14.5 6-6 6 6 6"/>',
    'chevron-up': '<path d="m6 14.5 6-6 6 6"/>',
    'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5v-3a3.5 3.5 0 0 1 7 0v3"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 1.5"/><path d="M9.5 2.5h5"/>',
    refresh: '<path d="M20 11.5A8 8 0 0 0 6 6.3L4 8.5"/><path d="M4 3.5v5h5"/><path d="M4 12.5a8 8 0 0 0 14 5.2l2-2.2"/><path d="M20 20.5v-5h-5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    play: '<path d="M7.5 5v14l11-7z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    chip: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.6v.1"/>',
    alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5"/><path d="M12 17.2v.1"/>',
    sort: '<path d="M8 4.5v15"/><path d="m4.5 8 3.5-3.5L11.5 8"/><path d="M16 19.5v-15"/><path d="m12.5 16 3.5 3.5 3.5-3.5"/>',
    select: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m8 12 3 3 5-6"/>',
    scale: '<path d="M12 4v16.5"/><path d="M7 20.5h10"/><path d="M5.5 7.5h13"/><path d="m5.5 7.5-3 6a3 3 0 0 0 6 0z"/><path d="m18.5 7.5-3 6a3 3 0 0 0 6 0z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    crosshair: '<circle cx="12" cy="12" r="7.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
    percent: '<path d="M18.5 5.5l-13 13"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    gauge: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="m12 17 4-5.5"/><path d="M3.5 17h2M18.5 17h2"/>',
    grid: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17"/>',
    trend: '<path d="m3.5 17 6-6 4 4 7-7"/><path d="M15 8h5.5v5.5"/>',
    exam: '<path d="M6 3.5h12v17l-6-3.5-6 3.5z"/><path d="m9 10 2.2 2.2L15 8.5"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6"/><path d="M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>',
    grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    first: '<path d="M6 5v14"/><path d="M18 6 9 12l9 6z"/>',
    last: '<path d="M18 5v14"/><path d="m6 6 9 6-9 6z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>'
  };
  const icon = (name, cls = '') => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

  // -------------------------------------------- fichas, avatares, anillos
  // Colores de las fichas de casino por denominación: blanca, roja, azul, verde, negra, morada, naranja
  const CHIPS = [['#ebe7dc', '#2a5ea5', '#1d2b3d'], ['#b8322b', '#f1ede4', '#ffffff'], ['#25589c', '#f1ede4', '#ffffff'], ['#1c7445', '#f1ede4', '#ffffff'], ['#1d1d1f', '#e9e1cf', '#ffffff'], ['#62409a', '#f1ede4', '#ffffff'], ['#c98a1d', '#fbf3df', '#2b1b00']];
  function chip(content, idx, cls = '') {
    const [c, s, t] = CHIPS[((idx % CHIPS.length) + CHIPS.length) % CHIPS.length];
    return `<span class="chip ${cls}" style="--c:${c};--s:${s};--t:${t}">${content}</span>`;
  }
  const levelChip = (n, cls = '') => chip(n, n - 1, cls);
  function avatar(name, me) {
    const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `<span class="avatar${me ? ' me' : ''}" style="--h:${hashStr(name) % 360}" aria-hidden="true">${initials}</span>`;
  }
  function ring(p, tone = '') {
    const r = 52, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="${r}"/><circle class="ring-val ${tone}" cx="60" cy="60" r="${r}" style="--c:${c.toFixed(1)};stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - Math.max(0, Math.min(1, p)))).toFixed(1)}"/></svg>`;
  }
  // Cuenta animada de 0 al valor final en los elementos con data-count
  function countUp(scope) {
    scope.querySelectorAll('[data-count]').forEach(el => {
      const end = +el.dataset.count, suffix = el.dataset.suffix || '';
      const fmt = v => Math.round(v).toLocaleString('es-ES') + suffix;
      if (reduceMotion() || !end) { el.textContent = fmt(end); return; }
      el.textContent = fmt(0);
      const t0 = performance.now(), dur = 800;
      const step = t => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // ------------------------------------------------------------ cartas
  function card(c, o = {}) {
    const cls = ['card'];
    if (o.small) cls.push('sm'); if (o.mini) cls.push('mini'); if (o.hl) cls.push('hl'); if (o.dim) cls.push('dim');
    if (o.deal) cls.push('deal'); else if (o.flip) cls.push('flip');
    const st = o.delay != null ? ` style="animation-delay:${o.delay}ms"` : '';
    if (o.back) return `<div class="${cls.join(' ')} back"${st} aria-label="Carta boca abajo"></div>`;
    const r = PK.rankOf(c), s = PK.suitOf(c);
    cls.push('s' + s);
    return `<div class="${cls.join(' ')}"${st} role="img" aria-label="${PK.cardName(c)}"><span class="cr">${PK.rankLabel(r)}</span><span class="cs">${SYM[s]}</span><span class="cc">${SYM[s]}</span></div>`;
  }
  function cards(arr, o = {}) {
    return `<div class="cards${o.mini ? ' mini-row' : ''}">${arr.map((c, i) => card(c, Object.assign({}, o, { delay: o.deal ? i * 90 + (o.delayBase || 0) : null }))).join('')}</div>`;
  }
  const cardsInline = arr => arr.map(c => `<span class="ci s${PK.suitOf(c)}">${PK.rankLabel(PK.rankOf(c))}${SYM[PK.suitOf(c)]}</span>`).join(' ');
  // Texto con [[término]] y **negrita**
  function rich(t) {
    return String(t)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[\[(.+?)\]\]/g, (_, term) => `<button class="term" type="button" data-term="${term}">${term}</button>`);
  }

  // ---------------------------------------------------- tabla 13×13
  const POS_COLORS = { UTG: 'c-utg', MP: 'c-mp', CO: 'c-co', BTN: 'c-btn', SB: 'c-sb', BB: 'c-bb' };
  function chart(pos, o = {}) {
    let html = `<div class="chart${o.compact ? ' compact' : ''}" role="table" aria-label="Tabla de manos iniciales${pos === 'ALL' ? '' : ' desde ' + pos}">`;
    let k = 0;
    for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
      const l = PK.gridLabel(i, j);
      let cls = 'fold';
      if (pos === 'ALL') {
        const first = PK.POSITION_ORDER.find(p => p !== 'BB' && PK.OPEN_SETS[p].has(l));
        cls = first ? POS_COLORS[first] : 'fold';
      } else if (PK.OPEN_SETS[pos].has(l)) cls = POS_COLORS[pos];
      if (o.highlight === l) cls += ' target';
      html += `<div class="cell ${cls}" title="${l}" style="animation-delay:${(i + j) * 12}ms">${l}</div>`;
      k++;
    }
    html += '</div>';
    if (pos === 'ALL') html += `<div class="legend">${['UTG', 'MP', 'CO', 'BTN', 'SB'].map(p => `<span><i class="${POS_COLORS[p]}"></i>Desde ${p}</span>`).join('')}<span><i class="fold"></i>Tirar</span></div>`;
    else html += `<div class="legend"><span><i class="${POS_COLORS[pos]}"></i>${pos === 'BB' ? 'Defender ante subida del botón' : 'Abrir desde ' + pos} (${Math.round(PK.rangePercent(PK.OPEN_SETS[pos]) * 100)} %)</span><span><i class="fold"></i>Tirar</span></div>`;
    return html;
  }
  function chartWidget(initial) {
    const el = document.createElement('div');
    el.className = 'chart-widget';
    const tabs = ['ALL', 'UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    const draw = pos => {
      el.innerHTML = `<div class="tabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" aria-selected="${t === pos}" class="tab${t === pos ? ' on' : ''}" data-p="${t}">${t === 'ALL' ? 'Todas' : t}</button>`).join('')}</div>${chart(pos)}`;
    };
    el.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) draw(b.dataset.p); });
    draw(initial || 'ALL');
    return el;
  }
  // Mesa de 6 con la posición marcada
  function seatMap(pos) {
    const order = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
    const xy = [[50, 88], [12, 70], [12, 28], [50, 11], [88, 28], [88, 70]];
    return `<div class="seatmap">${order.map((p, i) => `<span class="sm-seat${p === pos ? ' on' : ''}" style="left:${xy[i][0]}%;top:${xy[i][1]}%">${p}</span>`).join('')}<span class="sm-dealer" style="left:50%;top:68%">D</span></div>`;
  }
  function visual(v) {
    if (!v) return null;
    const el = document.createElement('div');
    el.className = 'visual';
    if (v.ranking) {
      el.innerHTML = `<ol class="ranking">${PK.RANKING_EXAMPLES.map(([n, c, d]) => `<li><div><b>${n}</b><small>${d}</small></div>${cards(PK.parseCards(c), { mini: true })}</li>`).join('')}</ol>`;
    } else if (v.cards) {
      el.innerHTML = cards(PK.parseCards(v.cards), { deal: true }) + (v.caption ? `<div class="caption">${v.caption}</div>` : '');
    } else if (v.hands) {
      el.innerHTML = `<div class="hands-row">${v.hands.map(([c, l]) => `<div>${cards(PK.parseCards(c), { small: true, deal: true })}<div class="caption">${l}</div></div>`).join('')}</div>`;
    } else if (v.hole || v.board) {
      el.innerHTML = `<div class="mini-felt">${v.board ? `<div class="label">Mesa</div>${cards(PK.parseCards(v.board), { small: true, deal: true })}` : ''}${v.hole ? `<div class="label">Tu mano</div>${cards(PK.parseCards(v.hole), { small: true, deal: true, delayBase: 300 })}` : ''}</div>` + (v.caption ? `<div class="caption">${v.caption}</div>` : '');
    } else if (v.chart) {
      el.appendChild(chartWidget(v.chart));
    } else if (v.positions) {
      el.innerHTML = seatMap(null) + '<div class="caption">D es el botón. Le siguen SB, BB, UTG, MP y CO en el sentido de las agujas del reloj.</div>';
    } else if (v.streets) {
      el.innerHTML = `<div class="streets">${[['Preflop', 0], ['Flop', 3], ['Turn', 4], ['River', 5]].map(([n, k]) => `<div>${n}<div class="cards mini-row">${[0, 1, 2, 3, 4].map(i => i < k ? '<div class="card mini back up"></div>' : '<div class="card mini slot"></div>').join('')}</div></div>`).join('')}</div>`;
    } else if (v.actions) {
      el.innerHTML = `<div class="action-demo">${[['Pasar', 'check'], ['Apostar', 'bet'], ['Igualar', 'call'], ['Subir', 'raise'], ['Retirarse', 'fold'], ['All-in', 'all-in']].map(([a, b]) => `<span>${a}<small>${b}</small></span>`).join('')}</div>`;
    } else if (v.html) {
      el.innerHTML = v.html;
    } else if (v.link) {
      el.innerHTML = `<a class="btn primary" href="${v.link.href}">${v.link.label} ${icon('arrow-right')}</a>`;
    }
    return el;
  }

  // ------------------------------------------------------- avisos y ventanas
  function toast(html, kind = '', iconName = null, lead = '') {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast-' + kind : '');
    t.innerHTML = (lead || (iconName ? icon(iconName) : '')) + `<div>${html}</div>`;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2700);
    setTimeout(() => t.remove(), 3100);
  }
  function modal(content, o = {}) {
    closeModal(true);
    const m = document.createElement('div');
    m.className = 'modal-back'; m.id = 'modal';
    m.innerHTML = `<div class="modal${o.wide ? ' wide' : ''}" role="dialog" aria-modal="true"${o.label ? ` aria-label="${o.label}"` : ''}><button class="icon-btn close" type="button" aria-label="Cerrar">${icon('x')}</button><div class="modal-body"></div></div>`;
    const body = m.querySelector('.modal-body');
    if (typeof content === 'string') body.innerHTML = content; else body.appendChild(content);
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('.close')) closeModal(); });
    document.body.appendChild(m);
    document.body.classList.add('no-scroll');
    m.querySelector('.close').focus({ preventScroll: true });
    return body;
  }
  function closeModal(instant) {
    const m = document.getElementById('modal');
    if (!m) return;
    m.removeAttribute('id');
    document.body.classList.remove('no-scroll');
    if (instant || reduceMotion()) { m.remove(); return; }
    m.classList.add('closing');
    setTimeout(() => m.remove(), 180);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ------------------------------------------------------------ glosario
  const letterOf = t => t[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  function openGlossary(focus) {
    const terms = Object.keys(PK.GLOSSARY).sort((a, b) => a.localeCompare(b, 'es'));
    const el = document.createElement('div');
    el.innerHTML = `<h2>Glosario</h2><p class="muted">${terms.length} términos de póker explicados en una frase.</p>
      <div class="search-wrap">${icon('search')}<input class="search" type="search" id="gloss-search" placeholder="Buscar término o definición" aria-label="Buscar en el glosario"></div><dl class="glossary"></dl>`;
    const dl = el.querySelector('dl'), inp = el.querySelector('input');
    const draw = () => {
      const f = inp.value.trim().toLowerCase();
      const list = terms.filter(t => !f || t.toLowerCase().includes(f) || PK.GLOSSARY[t].toLowerCase().includes(f));
      let last = '', html = '';
      list.forEach(t => {
        const L = letterOf(t);
        if (L !== last) { html += `<div class="g-letter">${L}</div>`; last = L; }
        html += `<div class="g-item${t === focus ? ' focus' : ''}"><dt>${t}</dt><dd>${PK.GLOSSARY[t]}</dd></div>`;
      });
      dl.innerHTML = html || '<p class="muted">Ningún término coincide con la búsqueda.</p>';
    };
    inp.oninput = draw;
    draw();
    modal(el, { label: 'Glosario' });
    if (focus) { const it = el.querySelector('.focus'); if (it) it.scrollIntoView({ block: 'center' }); }
    else setTimeout(() => inp.focus(), 60);
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('.term');
    if (!t) return;
    e.preventDefault();
    const key = Object.keys(PK.GLOSSARY).find(k => k.toLowerCase() === t.dataset.term.toLowerCase());
    if (!key) return;
    document.querySelectorAll('.term-pop').forEach(x => x.remove());
    const pop = document.createElement('div');
    pop.className = 'term-pop';
    pop.innerHTML = `<b>${key}</b><p>${PK.GLOSSARY[key]}</p><button class="link" type="button">Abrir el glosario</button>`;
    document.body.appendChild(pop);
    const r = t.getBoundingClientRect();
    const w = Math.min(300, innerWidth - 32);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(16, Math.min(innerWidth - w - 16, r.left + r.width / 2 - w / 2)) + 'px';
    pop.style.top = (r.bottom + scrollY + 8) + 'px';
    pop.querySelector('button').onclick = () => { pop.remove(); openGlossary(key); };
    setTimeout(() => document.addEventListener('click', function h(ev) { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', h); } }), 0);
  });

  // --------------------------------------------------------------- tema
  // Quien muestra la página (por ejemplo, el visor de artefactos) puede fijar data-theme en
  // <html>. En modo automático se respeta ese valor; si no hay ninguno, manda el sistema.
  const docEl = document.documentElement;
  let hostTheme = docEl.getAttribute('data-theme');
  let lastWritten = hostTheme;
  const chosenTheme = () => (S.settings.theme === 'auto' ? hostTheme : S.settings.theme);
  function applySettings() {
    const th = chosenTheme();
    lastWritten = th || null;
    if (th) docEl.setAttribute('data-theme', th); else docEl.removeAttribute('data-theme');
    document.body.classList.toggle('four-color', !!S.settings.fourColor);
    updateHeader();
  }
  if (root.MutationObserver) {
    new MutationObserver(() => {
      const v = docEl.getAttribute('data-theme');
      if (v === lastWritten) return;          // cambio hecho por la propia app
      hostTheme = v;
      applySettings();
    }).observe(docEl, { attributes: true, attributeFilter: ['data-theme'] });
  }
  const isDark = () => { const th = chosenTheme(); return th === 'dark' || (!th && !!root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches); };

  // Tarjeta del jugador (barra lateral y barra superior) y botones de tema y sonido
  function updateHeader() {
    const l = playerLevel(S.xp), a = xpForLevel(l), b = xpForLevel(l + 1);
    const p = Math.round((S.xp - a) / (b - a) * 100);
    document.querySelectorAll('[data-player]').forEach(box => {
      if (!box.querySelector('[data-f]')) {
        box.innerHTML = `<div class="pc-row"><span>Nivel <b data-f="lvl"></b></span><span class="pc-streak" title="Días seguidos practicando">${icon('flame')}<b data-f="streak"></b></span></div>
          <div class="xp" role="progressbar" aria-label="Experiencia hasta el siguiente nivel" aria-valuemin="0" aria-valuemax="100"><i data-f="bar"></i></div>
          <div class="pc-xp"><span data-f="xp"></span> XP · siguiente nivel a <span data-f="next"></span></div>`;
      }
      box.querySelector('[data-f=lvl]').textContent = l;
      box.querySelector('[data-f=streak]').textContent = S.days.streak || 0;
      box.querySelector('[data-f=xp]').textContent = S.xp.toLocaleString('es-ES');
      box.querySelector('[data-f=next]').textContent = b.toLocaleString('es-ES');
      box.querySelector('[data-f=bar]').style.width = p + '%';
      box.querySelector('.xp').setAttribute('aria-valuenow', p);
    });
    document.querySelectorAll('[data-act=sound]').forEach(btn => {
      btn.innerHTML = icon(S.settings.sound ? 'volume' : 'mute');
      btn.setAttribute('aria-label', S.settings.sound ? 'Desactivar el sonido' : 'Activar el sonido');
      btn.title = S.settings.sound ? 'Sonido activado' : 'Sonido desactivado';
    });
    const dark = isDark();
    document.querySelectorAll('[data-act=theme]').forEach(btn => {
      btn.innerHTML = icon(dark ? 'sun' : 'moon');
      btn.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btn.title = dark ? 'Modo claro' : 'Modo oscuro';
    });
    document.querySelectorAll('[data-mistakes]').forEach(el => { el.textContent = S.mistakes.length; el.hidden = !S.mistakes.length; });
  }

  Object.assign(PK, { touchDay, addXP, award, daily, dailyProgress, gameLevel, availableGames, difficulty, recordGame, playerLevel, xpForLevel, today, reduceMotion, BADGE_ICONS });
  PK.UI = { card, cards, cardsInline, rich, chart, chartWidget, seatMap, visual, toast, modal, closeModal, openGlossary, applySettings, updateHeader, isDark, icon, chip, levelChip, badgeChip, avatar, ring, countUp };
})(typeof window !== 'undefined' ? window : globalThis);
