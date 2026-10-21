/* =========================================================================
   Mesa de práctica contra bots: control de la partida, modo entrenador,
   animaciones de la mesa, revisión de manos y simulador de riesgo.
   ========================================================================= */
(function (root) {
  'use strict';
  const PK = root.PK = root.PK || {};
  const UI = () => PK.UI;
  const S = () => PK.S;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pct = x => Math.round(x * 100) + ' %';
  const fmt = n => Math.round(n).toLocaleString('es-ES');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  const TOUR_LEVELS = [[10, 20], [15, 30], [25, 50], [40, 80], [60, 120], [100, 200], [150, 300], [250, 500], [400, 800], [600, 1200]];
  const HANDS_PER_LEVEL = 6;
  const SEAT_XY = {
    2: [[50, 86], [50, 12]],
    3: [[50, 86], [11, 30], [89, 30]],
    4: [[50, 86], [8, 48], [50, 10], [92, 48]],
    5: [[50, 86], [8, 60], [22, 12], [78, 12], [92, 60]],
    6: [[50, 86], [7, 64], [13, 18], [50, 8], [87, 18], [93, 64]]
  };
  // Mesa vertical en pantallas estrechas
  const SEAT_XY_NARROW = {
    2: [[50, 87], [50, 10]],
    3: [[50, 87], [20, 22], [80, 22]],
    4: [[50, 87], [17, 50], [50, 9], [83, 50]],
    5: [[50, 87], [17, 62], [22, 15], [78, 15], [83, 62]],
    6: [[50, 87], [17, 66], [17, 26], [50, 8], [83, 26], [83, 66]]
  };
  const RATING_CLS = { Buena: 'good', Dudosa: 'doubt', Error: 'bad' };
  const RATING_PILL = { Buena: 'good', Dudosa: 'warn', Error: 'bad' };
  const CLS_NAMES = { monstruo: 'Monstruo', fuerte: 'Fuerte', media: 'Media', debil: 'Débil', proyecto: 'Proyecto' };
  const chipStack = k => `<span class="stack" aria-hidden="true">${'<i></i>'.repeat(Math.max(1, Math.min(4, k)))}</span>`;

  function describeEntry(e) {
    switch (e.type) {
      case 'sb': return `${e.name} pone la ciega pequeña (${fmt(e.amount)})`;
      case 'bb': return `${e.name} pone la ciega grande (${fmt(e.amount)})`;
      case 'fold': return `${e.name} se retira`;
      case 'check': return `${e.name} pasa`;
      case 'call': return `${e.name} iguala ${fmt(e.amount)}${e.allIn ? ' (all-in)' : ''}`;
      case 'bet': return `${e.name} apuesta ${fmt(e.amount)}${e.allIn ? ' (all-in)' : ''}`;
      case 'raise': return `${e.name} sube a ${fmt(e.amount)}${e.allIn ? ' (all-in)' : ''}`;
      case 'street': return `${PK.STREET_NAMES[e.street]}${e.runout ? ': todos all-in, se reparten las cartas' : ''}`;
      case 'refund': return `${e.name} recupera ${fmt(e.amount)} fichas que nadie igualó`;
      case 'win': return `${e.name} gana ${fmt(e.amount)} sin enseñar las cartas`;
      case 'showdown': return 'Showdown: ' + e.pots.map((p, i) => `${i ? 'bote secundario' : 'bote'} de ${fmt(p.amount)} para ${p.winners.map(s => e.names ? e.names[s] : 'J' + s).join(' y ')}${p.split ? ' (dividido)' : ''} con ${p.handName}`).join('; ');
      default: return '';
    }
  }
  function ratingCard(r, fresh) {
    const I = UI().icon;
    return `<div class="rating ${RATING_CLS[r.rating]}${fresh ? ' fresh' : ''}">
      <div class="r-top"><span class="pill pill-${RATING_PILL[r.rating]}">${r.rating}</span><b>${r.title}</b></div>
      <p>${r.text}</p>
      ${r.close ? `<p class="r-close">${I('scale')}<span>Jugada discutible: las dos opciones tienen argumentos.</span></p>` : ''}
      <p class="r-nums">${r.numbers}</p></div>`;
  }

  // ===================================================================== Play
  const Play = PK.Play = {
    T: null, cfg: null, el: null, token: 0, analysis: null, analysisP: null, lastRating: null, ratingShown: null, decisions: {},
    heroSeat: 0, scripts: {}, shownBoard: 0, shownHand: -1, tour: null, startStacks: [], ended: false, gameOver: null,
    prevBets: {}, amount: 0, acting: false, keyBound: false,

    start(el, cfg) {
      this.el = el; this.cfg = cfg; this.token++;
      this.lastRating = null; this.ended = false; this.gameOver = null; this.prevBets = {};
      const sc = cfg.scenario ? PK.SCENARIOS[cfg.scenario] : null;
      this.sc = sc;
      let players;
      if (sc) {
        players = sc.players.map(p => Object.assign({}, p));
      } else {
        const names = PK.shuffle(PK.BOT_NAMES.slice());
        const profs = Object.keys(PK.PROFILES);
        players = [{ name: 'Tú', isHuman: true, stack: cfg.stack }];
        for (let i = 1; i < cfg.players; i++) {
          const prof = (cfg.bots && cfg.bots[i - 1] && cfg.bots[i - 1] !== 'random') ? cfg.bots[i - 1] : PK.pick(profs);
          players.push({ name: names[i], profile: prof, stack: cfg.stack });
        }
      }
      const sb = sc ? sc.sb : (cfg.tournament ? TOUR_LEVELS[0][0] : cfg.sb);
      const bb = sc ? sc.bb : (cfg.tournament ? TOUR_LEVELS[0][1] : cfg.bb);
      this.T = new PK.Table({ sb, bb, players, button: sc ? sc.button : -1 });
      this.heroSeat = this.T.players.findIndex(p => p.isHuman);
      this.tour = cfg.tournament ? { level: 0, hands: 0 } : null;
      if (!this.keyBound) { document.addEventListener('keydown', e => this.onKey(e)); this.keyBound = true; }
      this.render();
      this.newHand();
    },
    stop() { this.token++; },

    newHand() {
      const T = this.T, sc = this.sc;
      this.decisions = {}; this.analysis = null; this.analysisP = null; this.ended = false; this.acting = false;
      if (this.gameOver) return this.render();
      if (this.tour) {
        if (this.tour.hands > 0 && this.tour.hands % HANDS_PER_LEVEL === 0 && this.tour.level < TOUR_LEVELS.length - 1) {
          this.tour.level++;
          [T.sb, T.bb] = TOUR_LEVELS[this.tour.level];
          UI().toast(`Suben las ciegas: <b>${T.sb}/${T.bb}</b>`, 'level', 'trend');
        }
        this.tour.hands++;
      }
      if (T.players[this.heroSeat].stack <= 0) return this.render();
      if (sc) {
        const P = s => PK.parseCards(s);
        const holes = {};
        Object.entries(sc.holes || {}).forEach(([k, v]) => { holes[k] = P(v); });
        T.players.forEach((p, i) => { p.stack = sc.players[i].stack; });
        T.startHand({ button: sc.button, rig: { holes, board: sc.board ? P(sc.board) : [] }, startStreet: sc.startStreet, contrib: sc.contrib });
        this.scripts = JSON.parse(JSON.stringify(sc.script || {}));
      } else {
        T.startHand();
        this.scripts = {};
      }
      this.startStacks = T.log[0].players.map(p => p.stack);
      this.shownBoard = 0;
      PK.Sound.play('deal');
      this.loop(this.token);
    },

    async loop(tok) {
      const T = this.T;
      this.render();
      while (!T.handOver && tok === this.token) {
        const p = T.players[T.toAct];
        if (p.isHuman) { this.prepareHuman(tok); return; }
        await sleep(this.sc ? 900 : 650 + Math.random() * 400);
        if (tok !== this.token) return;
        const scripted = this.scripts[p.seat] && this.scripts[p.seat].shift();
        const act = scripted || PK.botDecide(T, p.seat, { difficulty: PK.difficulty() });
        const street = T.street;
        T.act(act);
        PK.Sound.play(act.type === 'fold' ? 'fold' : act.type === 'check' ? 'tick' : 'chip');
        if (T.street !== street || T.handOver) { await this.collect(); if (tok !== this.token) return; }
        this.render();
      }
      if (tok === this.token && T.handOver) this.endHand();
    },

    prepareHuman(tok) {
      const T = this.T;
      this.analysis = null; this.acting = false;
      this.analysisP = PK.analyze(T, this.heroSeat).then(a => { if (tok === this.token) { this.analysis = a; this.renderCoach(); } return a; });
      this.render();
    },

    async humanAct(action) {
      const T = this.T, tok = this.token;
      if (T.handOver || T.toAct !== this.heroSeat || this.acting) return;
      this.acting = true;
      const box = this.el.querySelector('.actions');
      if (box) box.classList.add('busy');
      const A = this.analysis || await this.analysisP;
      if (tok !== this.token) return;
      const rating = PK.rate(T, this.heroSeat, A, action);
      rating.street = T.street;
      rating.equity = A.equity; rating.required = A.required;
      this.decisions[T.log.length] = rating;
      this.lastRating = rating;
      const st = S().play;
      if (rating.rating === 'Buena') { st.good++; PK.dailyProgress('good'); if (st.good >= 20) PK.award('buenJuicio'); }
      else if (rating.rating === 'Dudosa') st.doubt++;
      else { st.bad++; st.errorKinds[rating.title] = (st.errorKinds[rating.title] || 0) + 1; }
      PK.save();
      const street = T.street;
      T.act(action);
      PK.Sound.play(action.type === 'fold' ? 'fold' : action.type === 'check' ? 'tick' : 'chip');
      if (T.street !== street || T.handOver) await this.collect();
      if (tok !== this.token) return;
      this.loop(tok);
    },

    // Las apuestas de la calle se deslizan hacia el bote
    collect() {
      const chips = this.el ? this.el.querySelectorAll('.felt .bet') : [];
      if (!chips.length || PK.reduceMotion()) return Promise.resolve();
      chips.forEach(c => { c.classList.remove('chip-in'); c.classList.add('collect'); });
      return sleep(420);
    },

    endHand() {
      if (this.ended) return;
      this.ended = true;
      const T = this.T, hero = T.players[this.heroSeat];
      const net = hero.stack - this.startStacks[this.heroSeat];
      const st = S().play;
      const pre = T.log.filter(e => e.seat === this.heroSeat && e.street === 'preflop');
      st.hands++;
      if (pre.some(e => e.type === 'call' || e.type === 'raise' || e.type === 'bet')) st.vpip++;
      if (pre.some(e => e.type === 'raise')) st.pfr++;
      T.log.filter(e => e.seat === this.heroSeat && e.street !== 'preflop').forEach(e => { if (e.type === 'bet' || e.type === 'raise') st.bets++; if (e.type === 'call') st.calls++; });
      if (net > 0) { st.won++; PK.award('primerBote'); }
      if (T.result.showdown && T.result.hands[this.heroSeat]) {
        const cat = PK.category(T.result.hands[this.heroSeat].score);
        if (cat >= 6) PK.award('primerFull');
        if (cat === 5) PK.award('primerColor');
      }
      PK.dailyProgress('hands');
      PK.touchDay();
      const names = T.players.map(p => p.name);
      const rec = { id: Date.now(), ts: Date.now(), heroSeat: this.heroSeat, names, log: JSON.parse(JSON.stringify(T.log)), decisions: this.decisions, net, title: this.sc ? this.sc.title : null, bb: T.bb };
      S().history.unshift(rec);
      if (S().history.length > 30) S().history.length = 30;
      PK.save();
      if (net > 0) PK.Sound.play('win');
      PK.addXP(this.sc ? 15 : 3);
      // Sin recompras: la partida acaba cuando te quedas sin fichas o cuando solo queda un jugador
      if (!this.sc) {
        const alive = T.players.filter(p => p.stack > 0);
        if (hero.stack <= 0) this.gameOver = 'lose';
        else if (alive.length === 1) { this.gameOver = 'win'; if (this.tour) PK.award('superviviente'); }
      }
      this.lastRecord = rec;
      this.render();
    },

    // Etiqueta de la última acción de cada jugador en la calle actual
    actionLabels() {
      const T = this.T, out = {};
      if (T.handOver) return out;
      T.log.forEach(e => {
        if (e.seat == null) return;
        if (e.type === 'fold') out[e.seat] = { t: 'Fuera', c: 'fold' };
        else if (e.street === T.street) {
          const t = { check: 'Pasa', call: `Iguala ${fmt(e.amount)}`, bet: `Apuesta ${fmt(e.amount)}`, raise: `Sube a ${fmt(e.amount)}`, sb: 'Ciega peq.', bb: 'Ciega gr.' }[e.type];
          if (t) out[e.seat] = { t, c: e.type };
        }
      });
      T.players.forEach(p => { if (p.inHand && p.allIn && !p.folded) out[p.seat] = { t: 'All-in', c: 'allin' }; });
      return out;
    },

    // ------------------------------------------------------------- dibujo
    render() {
      if (!this.el || !this.T) return;
      const T = this.T, n = T.players.length;
      const narrow = this.el.clientWidth < 600;
      const xy = (narrow ? SEAT_XY_NARROW : SEAT_XY)[n];
      const posOf = seat => xy[(seat - this.heroSeat + n) % n];
      const showAll = T.handOver && T.result && T.result.showdown;
      const board = T.board;
      const newFrom = this.shownHand === T.handNo ? this.shownBoard : 0;
      const animHole = this.holeAnimHand !== T.handNo;
      const flipNow = showAll && this.flipHand !== T.handNo;
      const flyNow = T.handOver && T.result && this.flyHand !== T.handNo;
      this.holeAnimHand = T.handNo; this.shownHand = T.handNo;
      if (showAll) this.flipHand = T.handNo;
      if (T.handOver) this.flyHand = T.handNo;
      if (board.length > this.shownBoard) PK.Sound.play('deal');
      this.shownBoard = board.length;
      const labels = this.actionLabels();
      const last = [...T.log].reverse().find(e => e.seat != null && ['fold', 'check', 'call', 'bet', 'raise'].includes(e.type));
      const I = UI().icon;

      const seats = T.players.map(p => {
        const [x, y] = posOf(p.seat);
        const pos = T.positions[p.seat];
        const isTurn = !T.handOver && T.toAct === p.seat;
        const prof = p.profile ? PK.PROFILES[p.profile] : null;
        let cardsHTML = '';
        if (p.inHand && p.hole.length && (p.isHuman || !p.folded)) {
          const reveal = p.isHuman || (showAll && !p.folded && T.result.hands[p.seat]);
          const winner = showAll && !p.folded && T.result.winnings[p.seat] > 0;
          const order = (p.seat - (T.sbSeat || 0) + n) % n;
          cardsHTML = `<div class="hole${p.folded ? ' folded' : ''}${winner ? ' winner' : ''}">${p.hole.map((c, i) => UI().card(c, {
            back: !reveal, small: !p.isHuman, deal: animHole, flip: !animHole && flipNow && reveal && !p.isHuman,
            delay: animHole ? i * n * 70 + order * 70 : flipNow ? i * 90 : null
          })).join('')}</div>`;
        }
        const lab = labels[p.seat];
        const won = T.handOver && T.result && T.result.winnings[p.seat];
        const handName = showAll && !p.folded && T.result.hands[p.seat] ? T.result.hands[p.seat].name : '';
        const plate = `<div class="plate">${UI().avatar(p.name, p.isHuman)}<div class="p-info"><div class="p-name">${p.name}${pos ? `<span class="p-pos">${pos}</span>` : ''}</div><div class="p-stack">${p.stack > 0 || p.inHand ? fmt(p.stack) : 'Eliminado'}</div>${prof ? `<div class="p-prof">${prof.name}</div>` : ''}</div>${T.button === p.seat ? '<span class="dealer" title="Botón">D</span>' : ''}${isTurn ? '<span class="p-timer" aria-hidden="true"></span>' : ''}</div>`;
        const tags = `${lab ? `<div class="p-act act-${lab.c}${last && last.seat === p.seat ? ' fresh' : ''}">${lab.t}</div>` : ''}${handName ? `<div class="p-hand">${handName}</div>` : ''}${won ? `<div class="p-win">+${fmt(won)}</div>` : ''}`;
        const inner = p.isHuman ? `${cardsHTML}<div class="seat-col">${plate}${tags}</div>` : `${cardsHTML}${plate}${tags}`;
        return `<div class="seat${p.isHuman ? ' me' : ''}${isTurn ? ' turn' : ''}${p.inHand && p.folded ? ' out' : ''}${!p.inHand ? ' empty' : ''}" style="left:${x}%;top:${y}%">${inner}</div>`;
      }).join('');

      const prev = this.prevBets, bets = {};
      const betChips = T.handOver ? '' : T.players.filter(p => p.bet > 0).map(p => {
        const [x, y] = posOf(p.seat);
        const grew = p.bet > (prev[p.seat] || 0);
        bets[p.seat] = p.bet;
        return `<div class="bet${grew ? ' chip-in' : ''}" style="left:${x + (50 - x) * 0.5}%;top:${y + (46 - y) * 0.52}%;--sx:${x}%;--sy:${y}%">${chipStack(p.bet >= T.bb * 10 ? 3 : p.bet >= T.bb * 3 ? 2 : 1)}<span>${fmt(p.bet)}</span></div>`;
      }).join('');
      this.prevBets = bets;
      const fly = flyNow && !PK.reduceMotion() ? Object.keys(T.result.winnings).map(s => { const [x, y] = posOf(+s); return `<div class="fly" style="--tx:${x}%;--ty:${y}%">${chipStack(3)}</div>`; }).join('') : '';

      const potNow = T.handOver ? 0 : T.pot();
      const center = `<div class="board">${board.map((c, i) => UI().card(c, { deal: i >= newFrom, delay: (i - newFrom) * (T.handOver ? 380 : 140) })).join('')}${Array(5 - board.length).fill('<div class="card slot"></div>').join('')}</div>
        <div class="pot${potNow ? '' : ' empty'}">${chipStack(Math.min(4, 1 + Math.floor(potNow / (T.bb * 15))))}<span>Bote</span><b>${fmt(potNow)}</b></div>
        ${T.handOver && T.result ? `<div class="result">${this.resultText()}</div>` : ''}`;
      const mode = this.sc ? `Escenario · <b>${this.sc.title}</b>` : this.tour ? `<b>Torneo</b> · nivel de ciegas <span class="num">${this.tour.level + 1}</span>` : '<b>Cash</b>';
      const coachOn = S().settings.coach;
      this.el.innerHTML = `<div class="table-top"><span>${mode} · ciegas <span class="num">${T.sb}/${T.bb}</span></span><span>Mano <span class="num">${T.handNo}</span> · ${PK.STREET_NAMES[T.street] || ''}</span></div>
        ${this.sc && !T.handOver ? `<div class="scenario-tip">${I('target')}<span><b>Objetivo:</b> ${this.sc.goal}</span></div>` : ''}
        <div class="table-layout${coachOn ? '' : ' no-coach'}">
          <div class="felt n${n}${narrow ? ' narrow' : ''}"><div class="felt-surface"><div class="bet-line"></div></div>${seats}${betChips}<div class="center">${center}</div>${fly}</div>
          <div class="actions"></div>
          <aside class="coach" aria-label="Entrenador"${coachOn ? '' : ' hidden'}></aside>
        </div>`;
      this.renderActions();
      this.renderCoach();
    },
    resultText() {
      const T = this.T, r = T.result;
      if (r.uncontested) { const w = T.players[r.pots[0].winners[0]]; return `<b>${w.name}</b> gana ${fmt(r.pots[0].amount)}: los demás se retiraron`; }
      return r.pots.map((p, i) => `${r.pots.length > 1 ? (i ? 'Bote secundario: ' : 'Bote principal: ') : ''}<b>${p.winners.map(s => T.players[s].name).join(' y ')}</b> ${p.split ? 'se reparten' : 'gana'} ${fmt(p.amount)} con ${p.handName}`).join('<br>');
    },
    renderActions() {
      const T = this.T, box = this.el.querySelector('.actions');
      if (!box) return;
      const hero = T.players[this.heroSeat];
      const I = UI().icon;
      if (T.handOver) {
        let html = '<div class="after">';
        if (this.gameOver) {
          const place = T.players.filter(p => p.stack > 0).length + 1;
          const msg = this.gameOver === 'win'
            ? (this.tour ? 'Has ganado el torneo' : 'Te has quedado con todas las fichas de la mesa')
            : (this.tour ? `Has quedado eliminado en el puesto ${place}` : 'Te has quedado sin fichas. Fin de la partida.');
          html += `<div class="banner ${this.gameOver}">${msg}</div>`;
        }
        html += `<button type="button" class="btn" data-a="review">${I('search')} Revisar la mano</button>`;
        if (this.sc) html += `<button type="button" class="btn primary" data-a="replay">${I('refresh')} Repetir el escenario</button><a class="btn" href="#/escenarios">Otros escenarios</a>`;
        else if (this.gameOver) html += `<button type="button" class="btn primary" data-a="restart">${this.tour ? 'Nuevo torneo' : 'Nueva partida'} ${I('refresh')}</button><a class="btn" href="#/mesa">Cambiar de mesa</a>`;
        else html += `<button type="button" class="btn primary" data-a="next">Siguiente mano ${I('arrow-right')}</button>`;
        html += '</div>';
        box.innerHTML = html;
        box.onclick = e => {
          const a = e.target.closest('[data-a]'); if (!a) return;
          const k = a.dataset.a;
          if (k === 'review') openReview(this.lastRecord);
          if (k === 'next') this.newHand();
          if (k === 'replay' || k === 'restart') this.start(this.el, this.cfg);
        };
        return;
      }
      if (T.toAct !== this.heroSeat) {
        box.innerHTML = `<div class="waiting">${T.toAct >= 0 ? `<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>Decide ${T.players[T.toAct].name}` : ''}</div>`;
        return;
      }
      const L = T.legal();
      const pot = T.pot();
      const presets = [];
      const frac = f => Math.round(L.currentBet + f * (pot + L.toCall));
      if (L.canRaise) {
        if (T.street === 'preflop' && L.currentBet <= T.bb) presets.push(['2,5 BB', Math.round(T.bb * 2.5)], ['3 BB', T.bb * 3], ['Bote', frac(1)]);
        else if (T.street === 'preflop') presets.push(['×3', L.currentBet * 3], ['Bote', frac(1)]);
        else presets.push(['⅓ bote', frac(1 / 3)], ['½ bote', frac(0.5)], ['⅔ bote', frac(2 / 3)], ['Bote', frac(1)]);
      }
      const initial = Math.min(L.maxTo, Math.max(L.minTo, presets.length ? presets[Math.min(1, presets.length - 1)][1] : L.minTo));
      box.innerHTML = `
        <div class="act-row">
          ${L.canCheck ? '' : '<button type="button" class="act act-fold" data-a="fold"><span>Retirarse</span><small>Fold</small><kbd>F</kbd></button>'}
          ${L.canCheck ? '<button type="button" class="act act-check" data-a="check"><span>Pasar</span><small>Check</small><kbd>C</kbd></button>'
            : `<button type="button" class="act act-call" data-a="call"><span>Igualar <b>${fmt(L.callAmt)}</b></span><small>${L.callAmt >= hero.stack ? 'Call all-in' : 'Call'}</small><kbd>C</kbd></button>`}
          ${L.canRaise ? `<button type="button" class="act act-raise" data-a="raise"><span>${L.isBet ? 'Apostar' : 'Subir a'} <b class="amt">${fmt(initial)}</b></span><small>${L.isBet ? 'Bet' : 'Raise'}</small><kbd>R</kbd></button>` : ''}
        </div>
        ${L.canRaise ? `<div class="sizing">
          <div class="presets">${presets.filter(p => p[1] >= L.minTo && p[1] < L.maxTo).map(p => `<button type="button" class="chipbtn" data-v="${p[1]}">${p[0]}</button>`).join('')}<button type="button" class="chipbtn allin" data-v="${L.maxTo}">All-in</button></div>
          <div class="size-input"><input type="range" id="raise-range" min="${L.minTo}" max="${L.maxTo}" step="${Math.max(1, Math.round(T.bb / 2))}" value="${initial}" aria-label="Cantidad de la subida"><input type="number" id="raise-num" min="${L.minTo}" max="${L.maxTo}" value="${initial}" aria-label="Cantidad exacta"></div>
          <div class="muted tiny">Mínimo ${fmt(L.minTo)} · máximo ${fmt(L.maxTo)} (all-in)</div>
        </div>` : ''}
        <div class="risk"></div>`;
      const range = box.querySelector('#raise-range'), num = box.querySelector('#raise-num');
      const amtEl = box.querySelector('.amt');
      const setAmt = v => {
        this.amount = Math.max(L.minTo, Math.min(L.maxTo, Math.round(+v || L.minTo)));
        if (range) range.value = this.amount;
        if (num && document.activeElement !== num) num.value = this.amount;
        if (amtEl) amtEl.textContent = this.amount >= L.maxTo ? `${fmt(this.amount)} · all-in` : fmt(this.amount);
        box.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', +b.dataset.v === this.amount));
        this.renderRisk(this.amount);
      };
      if (range) { range.oninput = () => setAmt(range.value); num.oninput = () => setAmt(num.value); num.onchange = () => { num.value = this.amount; }; }
      box.onclick = e => {
        const v = e.target.closest('[data-v]');
        if (v) { setAmt(+v.dataset.v); return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        const k = a.dataset.a;
        if (k === 'raise') this.humanAct(this.amount >= L.maxTo ? { type: 'allin' } : { type: 'raise', amount: this.amount });
        else this.humanAct({ type: k });
      };
      setAmt(initial);
    },
    onKey(e) {
      if (!this.el || !document.body.contains(this.el) || !this.T || (e.target.matches && e.target.matches('input, textarea, select')) || document.getElementById('modal')) return;
      const T = this.T;
      if (T.handOver) {
        if (e.key === 'Enter') { const b = this.el.querySelector('.after .btn.primary'); if (b) { e.preventDefault(); b.click(); } }
        return;
      }
      if (T.toAct !== this.heroSeat) return;
      const L = T.legal(), k = e.key.toLowerCase();
      if (k === 'f' && !L.canCheck) this.humanAct({ type: 'fold' });
      else if (k === 'c') this.humanAct({ type: L.canCheck ? 'check' : 'call' });
      else if (k === 'r' && L.canRaise) this.humanAct(this.amount >= L.maxTo ? { type: 'allin' } : { type: 'raise', amount: this.amount });
    },
    // Medidor de riesgo: qué parte del stack arriesgas y cuánto puedes ganar
    renderRisk(raiseTo) {
      const box = this.el.querySelector('.risk');
      if (!box) return;
      if (!S().settings.coach) { box.innerHTML = ''; return; }
      const T = this.T, p = T.players[this.heroSeat], L = T.legal();
      const lines = [];
      const meter = (amt, label) => {
        const r = PK.riskLevel(amt, p.stack + p.bet);
        const others = T.players.filter(o => o !== p && o.inHand && !o.folded);
        const maxMatch = Math.max(0, ...others.map(o => Math.min(o.stack + o.bet, amt + p.bet) - o.bet));
        const canWin = T.pot() + Math.min(maxMatch, amt);
        lines.push(`<div class="meter ${r.color}"><span class="mlabel">${label}</span><span class="mbar"><i style="width:${Math.min(100, r.frac * 100)}%"></i></span><span>Arriesgas <b>${fmt(amt)}</b> (${pct(r.frac)} de tu stack) · puedes ganar <b>${fmt(canWin)}</b></span></div>`);
      };
      if (L.toCall > 0) meter(L.callAmt, 'Igualar');
      if (L.canRaise && raiseTo) meter(raiseTo - p.bet, L.isBet ? 'Apostar' : 'Subir');
      box.innerHTML = lines.join('');
    },
    renderCoach() {
      const box = this.el && this.el.querySelector('.coach');
      if (!box) return;
      if (!S().settings.coach) { box.hidden = true; return; }
      box.hidden = false;
      const T = this.T, A = this.analysis, I = UI().icon;
      let html = `<header class="coach-head">${I('user')}<span>Entrenador</span>${A && !T.handOver && T.toAct === this.heroSeat ? `<small>${PK.STREET_NAMES[A.street]}</small>` : ''}</header>`;
      if (!T.handOver && T.toAct === this.heroSeat) {
        if (!A) html += '<div class="skel" aria-label="Analizando la mano"><i></i><i></i><i></i></div>';
        else {
          const tone = A.toCall > 0 ? (A.equity >= A.required + 0.03 ? 'good' : A.equity >= A.required - 0.03 ? 'doubt' : 'bad') : (A.equity >= 0.55 ? 'good' : A.equity >= 0.35 ? 'doubt' : 'bad');
          const dr = A.draws;
          const draws = [dr.flushDraw && 'color (9 outs)', dr.oesd && 'escalera abierta (8)', dr.gutshot && 'escalera interna (4)'].filter(Boolean).join(' + ');
          html += `<div class="metrics"><div class="metric ${tone}"><span>Equity estimada</span><b>${pct(A.equity)}</b></div><div class="metric"><span>${A.toCall > 0 ? 'Necesitas (pot odds)' : 'Para pagar'}</span><b>${A.toCall > 0 ? pct(A.required) : '—'}</b></div></div>
            <div class="eqbar" role="img" aria-label="Equity ${pct(A.equity)}${A.toCall > 0 ? ', necesitas ' + pct(A.required) : ''}"><i style="width:${A.equity * 100}%"></i>${A.toCall > 0 ? `<b style="left:${A.required * 100}%"></b>` : ''}</div>
            <dl class="facts">
              <div><dt>Tu mano</dt><dd>${A.made || `${A.label} · top ${Math.round(A.pct * 100)} %`}</dd></div>
              ${A.cls ? `<div><dt>Fuerza</dt><dd><span class="pill cls-${A.cls.cls}">${CLS_NAMES[A.cls.cls]}</span></dd></div>` : ''}
              ${draws ? `<div><dt>Proyectos</dt><dd>${draws}</dd></div>` : ''}
            </dl>
            ${A.cls ? `<p class="coach-why">${A.cls.why}</p>` : ''}
            <p class="coach-foot">Contra ${A.opps.map(o => `${T.players[o.seat].name} (${o.pct >= 1 ? 'cualquier mano' : '≈ top ' + Math.round(o.pct * 100) + ' %'})`).join(', ')}: rango estimado según sus acciones.${A.toCall > 0 ? ` Pagas ${fmt(A.callAmt)} para ganar ${fmt(A.pot)}: ${fmt(A.callAmt)} ÷ ${fmt(A.pot + A.callAmt)} = ${pct(A.required)}.` : ''}</p>`;
        }
      } else if (!T.handOver) html += '<p class="coach-idle">Mientras los rivales deciden, piensa qué manos encajan con lo que hacen.</p>';
      else html += '<p class="coach-idle">Mano terminada. Ábrela en «Revisar la mano» para repasar cada decisión con todas las cartas a la vista.</p>';
      if (this.lastRating) {
        html += ratingCard(this.lastRating, this.ratingShown !== this.lastRating);
        this.ratingShown = this.lastRating;
      }
      box.innerHTML = html;
    }
  };

  // ============================================================== revisión
  function openReview(rec) {
    if (!rec) return;
    const I = UI().icon;
    const steps = rec.log.map((e, i) => Object.assign({ idx: i }, e)).filter(e => e.type !== 'start');
    const start = rec.log[0];
    const names = start.players.map(p => p.name);
    const nDec = Object.keys(rec.decisions || {}).length;
    let k = 0;
    const el = document.createElement('div');
    el.className = 'review';
    let tl = steps[0] && steps[0].type !== 'street' ? '<li class="rv-street">Preflop</li>' : '';
    steps.forEach((e, j) => {
      const dec = rec.decisions[e.idx];
      if (e.type === 'street') tl += `<li class="rv-street">${PK.STREET_NAMES[e.street]}</li>`;
      else tl += `<li><button type="button" class="rv-ev${e.seat === rec.heroSeat ? ' mine' : ''}" data-k="${j}"><span>${describeEntry(Object.assign({ names }, e))}</span>${dec ? `<span class="pill pill-${RATING_PILL[dec.rating]}">${dec.rating}</span>` : ''}</button></li>`;
    });
    el.innerHTML = `<h2>Revisión de la mano${rec.title ? ' · ' + rec.title : ''}</h2>
      <p>Mano ${start.handNo} · ${start.players.filter(p => p.inHand).length} jugadores · resultado <b class="${rec.net > 0 ? 'pos' : rec.net < 0 ? 'neg' : ''}">${rec.net > 0 ? '+' : ''}${fmt(rec.net)}</b> · ${plural(nDec, 'decisión tuya valorada', 'decisiones tuyas valoradas')}</p>
      <div class="rv-grid">
        <div class="rv-left">
          <div class="rv-felt"></div>
          <div class="rv-players"></div>
          <div class="rv-step" aria-live="polite"></div>
          <div class="rv-dec"></div>
          <div class="rv-ctrl"><button type="button" class="btn small" data-m="first" aria-label="Primer paso">${I('first')}</button><button type="button" class="btn small" data-m="prev">${I('chevron-left')} Anterior</button><button type="button" class="btn small primary" data-m="next">Siguiente ${I('chevron-right')}</button><button type="button" class="btn small" data-m="last" aria-label="Último paso">${I('last')}</button></div>
        </div>
        <ol class="rv-timeline" aria-label="Acciones de la mano">${tl}</ol>
      </div>`;
    const draw = () => {
      const e = steps[k];
      const snap = [...steps.slice(0, k + 1)].reverse().find(x => x.stacks) || {};
      const folded = snap.folded || [];
      const board = snap.board || [];
      $(el, '.rv-felt').innerHTML = `<div class="label">Mesa</div><div class="cards">${board.map(c => UI().card(c, { small: true })).join('')}${Array(5 - board.length).fill('<div class="card sm slot"></div>').join('')}</div><div class="pot">${chipStack(2)}<span>Bote</span><b>${fmt(snap.pot || 0)}</b></div>`;
      $(el, '.rv-players').innerHTML = start.players.filter(p => p.inHand).map(p => `<div class="rv-p${folded[p.seat] ? ' out' : ''}${e.seat === p.seat ? ' active' : ''}${p.seat === rec.heroSeat ? ' me' : ''}">${UI().cards(p.hole, { mini: true })}<span class="rv-name">${p.name}<small>${p.pos || ''}</small></span><span class="rv-stack">${fmt(snap.stacks ? snap.stacks[p.seat] : p.stack)}</span></div>`).join('');
      $(el, '.rv-step').innerHTML = `<span class="muted tiny num">Paso ${k + 1} de ${steps.length}</span><p>${describeEntry(Object.assign({ names }, e))}</p>`;
      const dec = rec.decisions[e.idx];
      $(el, '.rv-dec').innerHTML = dec ? ratingCard(dec, true) : '';
      el.querySelectorAll('.rv-ev').forEach(b => b.classList.toggle('on', +b.dataset.k === k));
      const on = el.querySelector('.rv-ev.on');
      if (on) on.scrollIntoView({ block: 'nearest' });
      el.querySelector('[data-m=prev]').disabled = k === 0;
      el.querySelector('[data-m=next]').disabled = k === steps.length - 1;
    };
    const move = m => { k = m === 'first' ? 0 : m === 'last' ? steps.length - 1 : m === 'prev' ? Math.max(0, k - 1) : Math.min(steps.length - 1, k + 1); draw(); };
    el.addEventListener('click', ev => {
      const b = ev.target.closest('[data-m]'); if (b) return move(b.dataset.m);
      const t = ev.target.closest('[data-k]'); if (t) { k = +t.dataset.k; draw(); }
    });
    const keys = ev => {
      if (!document.body.contains(el)) return document.removeEventListener('keydown', keys);
      if (ev.key === 'ArrowRight') { ev.preventDefault(); move('next'); }
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); move('prev'); }
    };
    document.addEventListener('keydown', keys);
    UI().modal(el, { wide: true, label: 'Revisión de la mano' });
    draw();
  }
  const $ = (root, s) => root.querySelector(s);
  PK.openReview = openReview;
  PK.describeEntry = describeEntry;

  // ===================================================== simulador de riesgo
  PK.renderRiskSim = function (el) {
    const I = UI().icon;
    el.innerHTML = `<div class="sim">
      <section class="panel panel-pad sim-controls">
        <p>Imagina que pagas el mismo all-in muchas veces seguidas. Elige un caso o ajusta los valores y mira cómo evolucionan las fichas de cinco jugadores que toman exactamente esa decisión.</p>
        <div class="presets">
          <button type="button" class="chipbtn" data-p="40,100,200">Buena: 40 % de equity, necesitas 33 %</button>
          <button type="button" class="chipbtn" data-p="25,100,200">Mala: 25 % de equity, necesitas 33 %</button>
          <button type="button" class="chipbtn" data-p="50,100,100">A la par: 50 %</button>
          <button type="button" class="chipbtn" data-p="80,100,100">Favorito: 80 %</button>
        </div>
        <div class="sim-form">
          <label class="field" for="i-eq"><span>Tu equity: <output id="o-eq">40 %</output></span><input id="i-eq" type="range" min="1" max="99" value="40"></label>
          <label class="field" for="i-pay"><span>Pagas</span><input id="i-pay" type="number" value="100" min="1"></label>
          <label class="field" for="i-win"><span>Para ganar</span><input id="i-win" type="number" value="200" min="1"></label>
          <label class="field" for="i-n"><span>Repeticiones</span><select id="i-n"><option value="100">100</option><option value="1000" selected>1.000</option><option value="5000">5.000</option></select></label>
        </div>
        <div class="sim-req" id="sim-req"></div>
        <div><button type="button" class="btn primary" id="sim-run">${I('refresh')} Simular de nuevo</button></div>
      </section>
      <section class="panel sim-chart">
        <div class="chart-head"><h2>Fichas acumuladas en cada decisión</h2>
          <div class="series-legend">${[1, 2, 3, 4, 5].map(i => `<span><i style="background:var(--series-${i})"></i>Jugador ${i}</span>`).join('')}<span><i class="ev"></i>Valor esperado</span></div></div>
        <div class="plot"><canvas id="sim-canvas" role="img" aria-label="Evolución de las fichas de cinco jugadores"></canvas><div class="plot-tip" hidden></div></div>
      </section>
      <section class="panel"><div class="table-scroll" id="sim-table"></div></section>
      <p class="note" id="sim-note"></p>
    </div>`;
    const q = s => el.querySelector(s);
    const cv = q('#sim-canvas'), tip = q('.plot-tip');
    let runs = [], ev = 0, N = 1000, hover = null;
    const upd = () => {
      const e = +q('#i-eq').value / 100, pay = +q('#i-pay').value, win = +q('#i-win').value;
      q('#o-eq').textContent = Math.round(e * 100) + ' %';
      const req = pay / (pay + win), v = e * win - (1 - e) * pay;
      q('#sim-req').innerHTML = `Equity necesaria: <b>${pct(req)}</b> · valor esperado por decisión: <b class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${v.toFixed(1)}</b> fichas → ${v >= 0 ? '<b class="pos">buena decisión</b>' : '<b class="neg">mala decisión</b>'}`;
    };
    const run = () => {
      PK.award('estadistico');
      const e = +q('#i-eq').value / 100, pay = Math.max(1, +q('#i-pay').value), win = Math.max(1, +q('#i-win').value);
      N = +q('#i-n').value;
      ev = e * win - (1 - e) * pay;
      runs = [];
      for (let r = 0; r < 5; r++) {
        let chips = 0, maxDD = 0, peak = 0, worst = 0, cur = 0;
        const path = [0];
        for (let i = 0; i < N; i++) {
          if (Math.random() < e) { chips += win; cur = 0; } else { chips -= pay; cur++; worst = Math.max(worst, cur); }
          peak = Math.max(peak, chips); maxDD = Math.max(maxDD, peak - chips);
          path.push(chips);
        }
        runs.push({ path, maxDD, worst });
      }
      hover = null; tip.hidden = true;
      drawChart(cv, runs, ev, N, null);
      const at = (r, i) => r.path[Math.min(i, N)];
      q('#sim-table').innerHTML = `<table class="sim-table"><thead><tr><th>Jugador</th><th>Tras 10</th><th>Tras 100</th><th>Al final (${fmt(N)})</th><th>Peor caída</th><th>Peor racha</th></tr></thead><tbody>
        ${runs.map((r, i) => `<tr><td><i style="background:var(--series-${i + 1})"></i>Jugador ${i + 1}</td><td class="${at(r, 10) < 0 ? 'neg' : ''}">${fmt(at(r, 10))}</td><td class="${at(r, 100) < 0 ? 'neg' : ''}">${fmt(at(r, 100))}</td><td class="${r.path[N] < 0 ? 'neg' : 'pos'}">${fmt(r.path[N])}</td><td>${fmt(r.maxDD)}</td><td>${r.worst} seguidas</td></tr>`).join('')}
        <tr><td><i style="background:var(--ink)"></i>Valor esperado</td><td>${fmt(ev * Math.min(10, N))}</td><td>${fmt(ev * Math.min(100, N))}</td><td>${fmt(ev * N)}</td><td>—</td><td>—</td></tr></tbody></table>`;
      const neg10 = runs.filter(r => at(r, 10) < 0).length;
      q('#sim-note').innerHTML = `${ev >= 0 ? `Aunque la decisión es buena, ${neg10 ? `${plural(neg10, 'jugador va', 'jugadores van')} perdiendo tras 10 repeticiones` : 'a corto plazo los resultados oscilan mucho'} y cualquiera puede encadenar varias derrotas. Con muchas repeticiones, las líneas se acercan a la del valor esperado.` : 'Con valor esperado negativo puedes ganar a corto plazo por suerte, pero a la larga todas las líneas acaban bajando.'} <b>Juzga tus decisiones, no tus resultados.</b>`;
    };
    el.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { const [e, p, w] = b.dataset.p.split(','); q('#i-eq').value = e; q('#i-pay').value = p; q('#i-win').value = w; upd(); run(); }; });
    ['#i-eq', '#i-pay', '#i-win'].forEach(s => { q(s).oninput = upd; });
    q('#i-n').onchange = run;
    q('#sim-run').onclick = run;
    // Cruceta y tooltip al pasar el ratón
    const pad = { l: 64, r: 14, t: 12, b: 30 };
    cv.addEventListener('pointermove', e => {
      if (!runs.length) return;
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left;
      const i = Math.max(0, Math.min(N, Math.round((x - pad.l) / (r.width - pad.l - pad.r) * N)));
      hover = i;
      drawChart(cv, runs, ev, N, i);
      tip.hidden = false;
      tip.innerHTML = `<b>Decisión ${fmt(i)}</b>${runs.map((rr, k) => `<div><i style="background:var(--series-${k + 1})"></i><span>Jugador ${k + 1}</span><span>${fmt(rr.path[i])}</span></div>`).join('')}<div><i style="background:var(--ink)"></i><span>Esperado</span><span>${fmt(ev * i)}</span></div>`;
      const tw = tip.offsetWidth;
      tip.style.left = Math.min(r.width - tw - 8, Math.max(8, x + 14 > r.width - tw - 8 ? x - tw - 14 : x + 14)) + 'px';
    });
    cv.addEventListener('pointerleave', () => { hover = null; tip.hidden = true; if (runs.length) drawChart(cv, runs, ev, N, null); });
    const redraw = () => { if (!document.body.contains(el)) { ro.disconnect(); mo.disconnect(); return; } if (runs.length) drawChart(cv, runs, ev, N, hover); };
    const ro = new ResizeObserver(redraw); ro.observe(cv);
    const mo = new MutationObserver(redraw); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    upd(); run();
  };
  function niceTicks(min, max, count) {
    const span = max - min || 1;
    const raw = span / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return ticks;
  }
  function drawChart(cv, runs, ev, N, hover) {
    const dpr = root.devicePixelRatio || 1;
    const w = cv.clientWidth || 600, h = cv.clientHeight || 320;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const tok = n => css.getPropertyValue(n).trim();
    const muted = tok('--muted'), grid = tok('--line'), axis = tok('--line-strong'), ink = tok('--ink'), panel = tok('--panel');
    const font = tok('--font-display') || 'sans-serif';
    const all = runs.flatMap(r => r.path).concat([0, ev * N]);
    let min = Math.min(...all), max = Math.max(...all);
    if (max === min) max = min + 1;
    const padY = (max - min) * 0.06; min -= padY; max += padY;
    const pad = { l: 64, r: 14, t: 12, b: 30 };
    const X = i => pad.l + (w - pad.l - pad.r) * i / N, Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - min) / (max - min));
    c.clearRect(0, 0, w, h);
    c.font = `12px ${font}`; c.textBaseline = 'middle';
    // cuadrícula y ejes
    niceTicks(min, max, 5).forEach(v => {
      const y = Math.round(Y(v)) + 0.5;
      c.strokeStyle = v === 0 ? axis : grid; c.lineWidth = 1;
      c.beginPath(); c.moveTo(pad.l, y); c.lineTo(w - pad.r, y); c.stroke();
      c.fillStyle = muted; c.textAlign = 'right';
      c.fillText(Math.round(v).toLocaleString('es-ES'), pad.l - 8, y);
    });
    c.textAlign = 'center'; c.textBaseline = 'top';
    [0, 0.25, 0.5, 0.75, 1].forEach(f => { const i = Math.round(N * f); c.fillStyle = muted; c.fillText(i.toLocaleString('es-ES'), Math.min(w - pad.r - 14, Math.max(pad.l + 8, X(i))), h - pad.b + 8); });
    // series
    runs.forEach((r, k) => {
      c.strokeStyle = tok(`--series-${k + 1}`); c.lineWidth = 2; c.lineJoin = 'round';
      c.beginPath();
      const step = Math.max(1, Math.floor(N / 900));
      for (let i = 0; i <= N; i += step) { const x = X(i), y = Y(r.path[i]); i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.lineTo(X(N), Y(r.path[N]));
      c.stroke();
    });
    // valor esperado
    c.setLineDash([6, 5]); c.strokeStyle = ink; c.lineWidth = 2;
    c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(N), Y(ev * N)); c.stroke(); c.setLineDash([]);
    // cruceta
    if (hover != null) {
      const x = Math.round(X(hover)) + 0.5;
      c.strokeStyle = axis; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, pad.t); c.lineTo(x, h - pad.b); c.stroke();
      runs.forEach((r, k) => {
        c.fillStyle = tok(`--series-${k + 1}`); c.strokeStyle = panel; c.lineWidth = 2;
        c.beginPath(); c.arc(X(hover), Y(r.path[hover]), 4.5, 0, Math.PI * 2); c.fill(); c.stroke();
      });
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
