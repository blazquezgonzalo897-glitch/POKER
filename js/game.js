/* =========================================================================
   Mesa de Texas Hold'em No Limit: reglas de apuesta, botes secundarios,
   bots con perfiles y entrenador que valora las decisiones.
   ========================================================================= */
(function (root) {
  'use strict';
  const PK = root.PK = root.PK || {};
  const STREETS = ['preflop', 'flop', 'turn', 'river'];
  const STREET_NAMES = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' };
  const BOARD_COUNT = { preflop: 0, flop: 3, turn: 4, river: 5 };

  class Table {
    constructor(cfg) {
      this.sb = cfg.sb; this.bb = cfg.bb;
      this.players = cfg.players.map((p, i) => ({
        seat: i, name: p.name, stack: p.stack, isHuman: !!p.isHuman, profile: p.profile || null,
        hole: [], folded: true, allIn: false, bet: 0, totalBet: 0, acted: false, raiseRight: true, inHand: false, lastAction: null
      }));
      this.button = cfg.button != null ? cfg.button : -1;
      this.handNo = 0; this.board = []; this.fullBoard = []; this.street = null;
      this.toAct = -1; this.handOver = true; this.log = []; this.result = null; this.positions = {};
      this.currentBet = 0; this.lastRaise = 0;
    }
    // ------------------------------------------------------------ utilidades
    nextSeat(from, pred) {
      const n = this.players.length;
      for (let k = 1; k <= n; k++) { const s = (from + k + n) % n; if (pred(this.players[s])) return s; }
      return -1;
    }
    canAct(p) { return p.inHand && !p.folded && !p.allIn; }
    live() { return this.players.filter(p => p.inHand && !p.folded); }
    pot() { return this.players.reduce((s, p) => s + p.totalBet, 0); }
    // Bote sin contar las apuestas de la calle actual
    potCollected() { return this.players.reduce((s, p) => s + p.totalBet - p.bet, 0); }
    put(p, amt) {
      amt = Math.min(amt, p.stack);
      p.stack -= amt; p.bet += amt; p.totalBet += amt;
      if (p.stack === 0) p.allIn = true;
      return amt;
    }
    snapshot() {
      return { board: this.board.slice(), pot: this.pot(), stacks: this.players.map(p => p.stack), bets: this.players.map(p => p.bet), folded: this.players.map(p => p.folded) };
    }
    // ------------------------------------------------------------ nueva mano
    startHand(opts = {}) {
      const ready = this.players.filter(p => p.stack > 0);
      if (ready.length < 2) throw new Error('Hacen falta al menos dos jugadores con fichas');
      this.handNo++;
      this.players.forEach(p => Object.assign(p, { inHand: p.stack > 0, folded: !(p.stack > 0), hole: [], bet: 0, totalBet: 0, allIn: false, acted: false, raiseRight: true, lastAction: null }));
      if (opts.button != null) this.button = opts.button;
      else if (this.button < 0) this.button = ready[PK.secureInt(ready.length)].seat;
      else this.button = this.nextSeat(this.button, p => p.inHand);
      if (!this.players[this.button].inHand) this.button = this.nextSeat(this.button, p => p.inHand);
      const inHand = p => p.inHand;
      const heads = ready.length === 2;
      this.sbSeat = heads ? this.button : this.nextSeat(this.button, inHand);
      this.bbSeat = this.nextSeat(this.sbSeat, inHand);
      this.computePositions();

      // Baraja (Fisher-Yates con crypto). Las cartas "amañadas" solo se usan en escenarios guiados.
      const rig = opts.rig || {};
      const fixed = [];
      Object.values(rig.holes || {}).forEach(h => fixed.push(...h));
      (rig.board || []).forEach(c => fixed.push(c));
      const fixedSet = new Set(fixed);
      const deck = PK.shuffle(PK.makeDeck().filter(c => !fixedSet.has(c)));
      // Reparto: dos cartas a cada jugador empezando por la ciega pequeña
      const order = [];
      for (let s = this.sbSeat, k = 0; k < ready.length; k++, s = this.nextSeat(s, inHand)) order.push(s);
      order.forEach(s => { this.players[s].hole = rig.holes && rig.holes[s] ? rig.holes[s].slice() : [deck.pop()]; });
      order.forEach(s => { if (this.players[s].hole.length < 2) this.players[s].hole.push(deck.pop()); });
      this.fullBoard = (rig.board || []).slice();
      while (this.fullBoard.length < 5) this.fullBoard.push(deck.pop());

      this.board = []; this.handOver = false; this.result = null;
      this.currentBet = 0; this.lastRaise = this.bb;
      this.log = [{ type: 'start', handNo: this.handNo, button: this.button, sbSeat: this.sbSeat, bbSeat: this.bbSeat, sb: this.sb, bb: this.bb,
        players: this.players.map(p => ({ seat: p.seat, name: p.name, stack: p.stack, hole: p.hole.slice(), inHand: p.inHand, profile: p.profile, isHuman: p.isHuman, pos: this.positions[p.seat] })) }];

      if (opts.startStreet && opts.startStreet !== 'preflop') {
        // Escenario: la mano empieza en una calle posterior con un bote ya formado
        Object.entries(opts.contrib || {}).forEach(([s, a]) => { const p = this.players[s]; this.put(p, a); p.bet = 0; });
        this.street = opts.startStreet;
        this.board = this.fullBoard.slice(0, BOARD_COUNT[this.street]);
        this.log.push(Object.assign({ type: 'street', street: this.street }, this.snapshot()));
        this.toAct = this.nextSeat(this.button, p => this.canAct(p));
        return this;
      }
      this.street = 'preflop';
      this.postBlind(this.sbSeat, this.sb, 'sb');
      this.postBlind(this.bbSeat, this.bb, 'bb');
      this.currentBet = Math.max(this.bb, ...this.players.map(p => p.bet));
      this.toAct = heads ? this.sbSeat : this.nextSeat(this.bbSeat, p => this.canAct(p));
      // Si las ciegas dejan a todos all-in o sin nadie que decida
      if (this.toAct < 0 || !this.canAct(this.players[this.toAct])) this.advance(this.bbSeat);
      return this;
    }
    postBlind(seat, amt, kind) {
      const p = this.players[seat];
      const a = this.put(p, amt);
      this.log.push(Object.assign({ type: kind, street: 'preflop', seat, name: p.name, amount: a }, this.snapshot()));
    }
    computePositions() {
      const seats = [];
      for (let s = this.button, k = 0; k < this.players.filter(p => p.inHand).length; k++, s = this.nextSeat(s, p => p.inHand)) seats.push(s);
      const n = seats.length;
      this.positions = {};
      if (n === 2) { this.positions[seats[0]] = 'BTN'; this.positions[seats[1]] = 'BB'; return; }
      const extra = ['UTG', 'MP', 'CO'].slice(3 - (n - 3));
      const names = ['BTN', 'SB', 'BB'].concat(n > 6 ? Array(n - 6).fill('UTG').concat(['UTG', 'MP', 'CO']) : extra);
      seats.forEach((s, i) => { this.positions[s] = names[i]; });
    }
    // --------------------------------------------------------------- acciones
    legal() {
      const p = this.players[this.toAct];
      if (!p) return null;
      const toCall = Math.max(0, this.currentBet - p.bet);
      const callAmt = Math.min(toCall, p.stack);
      const opponentsWithChips = this.players.filter(o => o !== p && this.canAct(o)).length;
      const canRaise = p.raiseRight && p.stack > toCall && opponentsWithChips > 0;
      let minTo = this.currentBet + this.lastRaise;
      const maxTo = p.bet + p.stack;
      if (maxTo < minTo) minTo = maxTo;
      return { seat: p.seat, toCall, callAmt, canCheck: toCall === 0, canCall: toCall > 0, canRaise, minTo, maxTo, isBet: this.currentBet === 0, currentBet: this.currentBet, pot: this.pot() };
    }
    act(action) {
      if (this.handOver) throw new Error('La mano ha terminado');
      const p = this.players[this.toAct];
      const L = this.legal();
      const entry = { type: action.type, street: this.street, seat: p.seat, name: p.name, toCall: L.toCall, potBefore: this.pot(), stackBefore: p.stack, amount: 0 };
      let type = action.type;
      if (type === 'check' && !L.canCheck) type = 'fold';
      if ((type === 'raise' || type === 'bet' || type === 'allin') && !L.canRaise) type = L.canCheck ? 'check' : 'call';
      if (type === 'call' && L.canCheck) type = 'check';
      if (type === 'fold') {
        p.folded = true;
      } else if (type === 'check') {
        // nada
      } else if (type === 'call') {
        entry.amount = this.put(p, L.toCall);
      } else {
        let to = type === 'allin' ? L.maxTo : Math.round(action.amount);
        to = Math.max(L.minTo, Math.min(L.maxTo, to));
        if (to <= this.currentBet) {        // all-in que ni siquiera iguala: es un call
          type = 'call'; entry.amount = this.put(p, L.toCall);
        } else {
          const before = this.currentBet;
          this.put(p, to - p.bet);
          const raiseBy = to - before;
          const full = raiseBy >= this.lastRaise;
          if (full) this.lastRaise = raiseBy;
          this.currentBet = to;
          this.players.forEach(o => {
            if (o === p || !this.canAct(o)) return;
            o.acted = false;
            if (full) o.raiseRight = true;  // una subida incompleta no reabre la acción
          });
          type = before === 0 ? 'bet' : 'raise';
          entry.amount = to; entry.full = full;
        }
      }
      entry.type = type;
      entry.allIn = p.allIn;
      p.acted = true; p.raiseRight = false; p.lastAction = type;
      Object.assign(entry, this.snapshot());
      this.log.push(entry);
      this.advance(p.seat);
      return entry;
    }
    advance(fromSeat) {
      const live = this.live();
      if (live.length === 1) return this.finishUncontested(live[0]);
      const needs = o => this.canAct(o) && (!o.acted || o.bet < this.currentBet);
      if (this.players.some(needs)) { this.toAct = this.nextSeat(fromSeat, needs); return; }
      this.nextStreet();
    }
    nextStreet() {
      this.players.forEach(p => { p.bet = 0; p.acted = false; p.raiseRight = true; if (!p.folded) p.lastAction = null; });
      this.currentBet = 0; this.lastRaise = this.bb;
      if (this.street === 'river') return this.showdown();
      this.street = STREETS[STREETS.indexOf(this.street) + 1];
      this.board = this.fullBoard.slice(0, BOARD_COUNT[this.street]);
      const actors = this.players.filter(p => this.canAct(p));
      this.log.push(Object.assign({ type: 'street', street: this.street, runout: actors.length <= 1 }, this.snapshot()));
      if (actors.length <= 1) { this.toAct = -1; return this.nextStreet(); }
      this.toAct = this.nextSeat(this.button, p => this.canAct(p));
    }
    // Devuelve la apuesta que nadie ha igualado
    refundUncalled() {
      const sorted = this.players.filter(p => p.inHand).sort((a, b) => b.totalBet - a.totalBet);
      if (sorted.length < 2) return;
      const diff = sorted[0].totalBet - sorted[1].totalBet;
      if (diff > 0) {
        const p = sorted[0];
        p.totalBet -= diff; p.stack += diff; p.bet = Math.max(0, p.bet - diff);
        if (p.stack > 0) p.allIn = false;
        this.log.push({ type: 'refund', seat: p.seat, name: p.name, amount: diff, street: this.street });
      }
    }
    finishUncontested(winner) {
      this.refundUncalled();
      const amount = this.pot();
      winner.stack += amount;
      this.handOver = true; this.toAct = -1;
      this.result = { uncontested: true, pots: [{ amount, winners: [winner.seat], eligible: [winner.seat] }], winnings: { [winner.seat]: amount }, hands: {} };
      this.log.push(Object.assign({ type: 'win', seat: winner.seat, name: winner.name, amount }, this.snapshot()));
      return this.result;
    }
    // Reparte cada bote (principal y secundarios) entre los mejores jugadores elegibles
    static buildPots(players) {
      const contrib = players.map(p => p.totalBet);
      const live = players.filter(p => p.inHand && !p.folded);
      const levels = [...new Set(live.map(p => contrib[p.seat]))].filter(x => x > 0).sort((a, b) => a - b);
      const pots = [];
      let prev = 0;
      levels.forEach(lvl => {
        let amount = 0;
        players.forEach(p => { amount += Math.max(0, Math.min(contrib[p.seat], lvl) - prev); });
        pots.push({ amount, eligible: live.filter(p => contrib[p.seat] >= lvl).map(p => p.seat) });
        prev = lvl;
      });
      let extra = 0;
      players.forEach(p => { extra += Math.max(0, contrib[p.seat] - prev); });
      if (extra && pots.length) pots[pots.length - 1].amount += extra;
      return pots;
    }
    showdown() {
      this.street = 'showdown';
      this.board = this.fullBoard.slice();
      this.refundUncalled();
      const live = this.live();
      const hands = {};
      live.forEach(p => {
        const bf = PK.bestFive(p.hole.concat(this.board));
        hands[p.seat] = { score: bf.score, name: bf.name, best: bf.cards };
      });
      const pots = Table.buildPots(this.players);
      const winnings = {};
      const orderFromButton = [];
      for (let s = this.nextSeat(this.button, () => true), k = 0; k < this.players.length; k++, s = (s + 1) % this.players.length) orderFromButton.push(s);
      pots.forEach(pot => {
        const best = Math.max(...pot.eligible.map(s => hands[s].score));
        const ws = pot.eligible.filter(s => hands[s].score === best).sort((a, b) => orderFromButton.indexOf(a) - orderFromButton.indexOf(b));
        const share = Math.floor(pot.amount / ws.length);
        let rem = pot.amount - share * ws.length;
        ws.forEach(s => {
          const w = share + (rem > 0 ? 1 : 0); if (rem > 0) rem--;  // ficha sobrante al primero tras el botón
          winnings[s] = (winnings[s] || 0) + w; this.players[s].stack += w;
        });
        pot.winners = ws; pot.handName = hands[ws[0]].name; pot.split = ws.length > 1;
      });
      this.handOver = true; this.toAct = -1;
      this.result = { showdown: true, pots, winnings, hands };
      this.log.push(Object.assign({ type: 'showdown', pots, winnings, hands }, this.snapshot()));
      return this.result;
    }
    // Información de cada jugador para la revisión de manos
    preflopActions(seat) { return this.log.filter(e => e.street === 'preflop' && e.seat === seat && ['call', 'raise', 'bet', 'check', 'fold'].includes(e.type)); }
    raisesThisStreet() { return this.log.filter(e => e.street === this.street && (e.type === 'raise' || e.type === 'bet')).length; }
  }

  // ======================================================= rangos estimados
  // A partir de las acciones públicas, rango aproximado de cada rival vivo.
  function estimateRanges(table, heroSeat) {
    const out = [];
    table.players.forEach(o => {
      if (o.seat === heroSeat || !o.inHand || o.folded) return;
      const acts = table.preflopActions(o.seat);
      const raises = acts.filter(a => a.type === 'raise').length;
      const allPreRaises = table.log.filter(e => e.street === 'preflop' && e.type === 'raise');
      const myFirstRaiseIdx = allPreRaises.findIndex(e => e.seat === o.seat);
      const called = acts.some(a => a.type === 'call' && a.toCall > table.bb * 0.6 && allPreRaises.length);
      let pct = 1;
      if (raises >= 2 || myFirstRaiseIdx >= 1) pct = 0.07;
      else if (raises === 1) pct = Math.max(0.12, PK.rangePercent(PK.OPEN_SETS[table.positions[o.seat]] || PK.OPEN_SETS.CO));
      else if (called) pct = 0.35;
      // Postflop: apostar o subir fuerte estrecha algo el rango
      const aggr = table.log.filter(e => e.seat === o.seat && e.street !== 'preflop' && (e.type === 'bet' || e.type === 'raise')).length;
      if (aggr && pct === 1) pct = 0.6;
      out.push({ seat: o.seat, pct, spec: pct >= 1 ? null : { range: PK.rangeCombos(PK.topRange(pct)) } });
    });
    return out;
  }
  function heroEquity(table, seat, iterations = 600) {
    const p = table.players[seat];
    const opps = estimateRanges(table, seat);
    const r = PK.equity([{ cards: p.hole }].concat(opps.map(o => o.spec)), table.board, { iterations });
    return { equity: r.equity[0], opps };
  }

  // ================================================================== bots
  const PROFILES = {
    novato:     { name: 'Novato',     style: 'Loose · pasivo', desc: 'Lo paga casi todo y casi nunca sube.', open: 0.55, limp: 0.6, threebet: 0.02, callRaise: 0.5, valueT: 0.82, betSize: 0.5, bluff: 0.04, semibluff: 0.1, cbet: 0.35, callLoose: 0.18, bluffRaise: 0.01, noise: 0.12, pushMult: 1.2 },
    roca:       { name: 'Roca',       style: 'Tight · pasivo', desc: 'Muy conservador: solo juega manos fuertes.', open: 0.11, limp: 0, threebet: 0.025, callRaise: 0.07, valueT: 0.74, betSize: 0.6, bluff: 0.02, semibluff: 0.15, cbet: 0.4, callLoose: -0.07, bluffRaise: 0.0, noise: 0.05, pushMult: 0.6 },
    agresivo:   { name: 'Agresivo',   style: 'Loose · agresivo', desc: 'Sube y apuesta a menudo.', open: 0.34, limp: 0, threebet: 0.09, callRaise: 0.18, valueT: 0.6, betSize: 0.75, bluff: 0.22, semibluff: 0.6, cbet: 0.75, callLoose: 0.02, bluffRaise: 0.08, noise: 0.06, pushMult: 1.3 },
    maniaco:    { name: 'Maníaco',    style: 'Muy loose · muy agresivo', desc: 'Farolea muchísimo y juega casi todo.', open: 0.72, limp: 0.1, threebet: 0.2, callRaise: 0.45, valueT: 0.52, betSize: 1.0, bluff: 0.45, semibluff: 0.8, cbet: 0.9, callLoose: 0.1, bluffRaise: 0.2, noise: 0.1, pushMult: 2.2 },
    equilibrado:{ name: 'Equilibrado',style: 'Tight · agresivo', desc: 'Juego sólido y difícil de explotar.', open: null, limp: 0, threebet: 0.05, callRaise: 0.16, valueT: 0.66, betSize: 0.66, bluff: 0.12, semibluff: 0.5, cbet: 0.6, callLoose: 0.0, bluffRaise: 0.04, noise: 0.03, pushMult: 1 }
  };
  const BOT_NAMES = ['Lucía', 'Mateo', 'Sofía', 'Hugo', 'Valeria', 'Leo', 'Carmen', 'Diego', 'Irene', 'Pablo', 'Nora', 'Álex'];

  function roundTo(x, step) { return Math.max(step, Math.round(x / step) * step); }

  function botDecide(table, seat, opts = {}) {
    const p = table.players[seat];
    const L = table.legal();
    const prof = PROFILES[p.profile] || PROFILES.equilibrado;
    const d = opts.difficulty != null ? opts.difficulty : 0.5;
    const noiseAmp = prof.noise * (1.5 - d);
    const rnd = Math.random;
    const bb = table.bb;
    const pos = table.positions[seat];
    const othersStacks = table.players.filter(o => o !== p && o.inHand && !o.folded).map(o => o.stack + o.bet);
    const eff = Math.min(p.stack + p.bet, Math.max(...othersStacks, 0));
    const effBB = eff / bb;
    const pot = table.pot();
    const step = Math.max(1, Math.round(bb / 2));
    const raiseTo = to => ({ type: 'raise', amount: Math.max(L.minTo, Math.min(L.maxTo, roundTo(to, step))) });
    const commit = to => (to - p.bet) >= p.stack * 0.55 ? { type: 'allin' } : raiseTo(to);
    const passive = () => (L.canCheck ? { type: 'check' } : { type: 'fold' });

    if (table.street === 'preflop') {
      const label = PK.handLabel(p.hole[0], p.hole[1]);
      const pct = PK.handPercentile(label) + (rnd() - 0.5) * noiseAmp * 0.5;
      const raises = table.log.filter(e => e.street === 'preflop' && e.type === 'raise').length;
      const limpers = table.log.filter(e => e.street === 'preflop' && e.type === 'call').length;
      // Stack corto: push/fold
      if (effBB <= 13) {
        const posBonus = { BTN: 0.12, SB: 0.16, CO: 0.06, BB: 0.1 }[pos] || 0;
        const pushPct = Math.min(0.85, (0.12 + (13 - effBB) * 0.035 + posBonus) * prof.pushMult);
        if (raises === 0) {
          if (pct <= pushPct && L.canRaise) return { type: 'allin' };
          return passive();
        }
        const priceRatio = L.toCall / (pot + L.toCall);
        const callPct = Math.min(0.6, pushPct * 0.55 + (priceRatio < 0.35 ? 0.1 : 0));
        if (pct <= callPct * 0.6 && L.canRaise) return { type: 'allin' };
        if (pct <= callPct) return { type: 'call' };
        return passive();
      }
      if (raises === 0) {
        const openSet = prof.open == null ? (PK.OPEN_SETS[pos] || PK.OPEN_SETS.CO) : null;
        const opens = openSet ? openSet.has(label) : pct <= prof.open * (pos === 'BTN' || pos === 'CO' ? 1.15 : pos === 'UTG' ? 0.75 : 1);
        if (L.canCheck) { // ciega grande sin subidas
          if (pct <= 0.1 + prof.threebet && L.canRaise) return raiseTo(bb * (3 + limpers));
          return { type: 'check' };
        }
        if (opens && L.canRaise) {
          if (rnd() < prof.limp) return { type: 'call' };
          const size = p.profile === 'maniaco' ? 3 + rnd() * 2 : 2.5;
          return raiseTo(bb * (size + limpers));
        }
        if (p.profile === 'novato' && pct < 0.75 && L.toCall <= bb) return { type: 'call' };
        if (pos === 'SB' && L.toCall <= bb / 2 && pct < 0.5) return { type: 'call' };
        return { type: 'fold' };
      }
      // Ante una subida
      let tb = prof.threebet * (raises >= 2 ? 0.45 : 1);
      let cr = prof.callRaise * (raises >= 2 ? 0.45 : 1);
      const priceBB = L.toCall / bb;
      if (priceBB > 12) { cr *= 0.6; tb *= 0.8; }
      if (pos === 'BB' && priceBB <= 3) cr *= 1.6;
      if (pct <= tb && L.canRaise) return commit(table.currentBet * (raises >= 2 ? 2.3 : 3));
      if (pct <= tb + cr) return L.toCall >= p.stack ? (pct <= tb + cr * 0.5 ? { type: 'call' } : { type: 'fold' }) : { type: 'call' };
      if (L.canRaise && rnd() < prof.bluffRaise * 0.5) return commit(table.currentBet * 3);
      return passive();
    }

    // -------------------------------------------------------------- postflop
    const nOpp = table.live().length - 1;
    const { equity } = heroEquity(table, seat, 260);
    const draws = PK.drawInfo(p.hole, table.board);
    const hasDraw = draws.flushDraw || draws.oesd;
    const e = equity + (rnd() - 0.5) * noiseAmp;
    const multi = nOpp > 1 ? 0.05 * (nOpp - 1) : 0;
    const valueT = prof.valueT + multi;
    const potNoBets = table.potCollected();
    const required = L.toCall / (pot + L.toCall);
    const aggressorPre = (() => { const r = table.log.filter(x => x.street === 'preflop' && x.type === 'raise'); return r.length && r[r.length - 1].seat === seat; })();
    const tex = PK.boardTexture(table.board);

    if (L.canCheck) {
      if (e >= valueT && L.canRaise) {
        if (rnd() < 0.12 && table.street !== 'river') return { type: 'check' }; // trampa ocasional
        return commit(Math.max(bb, pot * prof.betSize * (0.85 + rnd() * 0.3)));
      }
      if (hasDraw && L.canRaise && table.street !== 'river' && rnd() < prof.semibluff) return commit(Math.max(bb, pot * 0.6));
      if (aggressorPre && table.street === 'flop' && nOpp === 1 && L.canRaise && rnd() < prof.cbet * (tex.wet ? 0.7 : 1.1)) return raiseTo(Math.max(bb, potNoBets * (tex.wet ? 0.6 : 0.4)));
      if (L.canRaise && rnd() < prof.bluff / (nOpp)) return commit(Math.max(bb, pot * (0.5 + rnd() * 0.5)));
      return { type: 'check' };
    }
    // Ante una apuesta
    if (e >= valueT + 0.12 && L.canRaise) return commit(table.currentBet * 2.6 + potNoBets * 0.3);
    const implied = hasDraw && table.street !== 'river' ? 0.05 : 0;
    if (e + implied + prof.callLoose >= required) {
      if (hasDraw && L.canRaise && rnd() < prof.semibluff * 0.25) return commit(table.currentBet * 2.8);
      return { type: 'call' };
    }
    if (L.canRaise && rnd() < prof.bluffRaise) return commit(table.currentBet * 3);
    return { type: 'fold' };
  }

  // ============================================================= entrenador
  function riskLevel(amount, stack) {
    const frac = stack > 0 ? amount / stack : 1;
    return { frac, color: frac < 0.15 ? 'verde' : frac < 0.4 ? 'amarillo' : 'rojo' };
  }
  // Análisis de la situación del jugador humano (asíncrono)
  async function analyze(table, seat) {
    const p = table.players[seat];
    const L = table.legal();
    const opps = estimateRanges(table, seat);
    const r = await PK.equityAsync([{ cards: p.hole }].concat(opps.map(o => o.spec)), table.board, { iterations: table.board.length ? 3000 : 2400, chunk: 600 });
    const eq = r.equity[0];
    const pot = table.pot();
    const required = L.toCall > 0 ? L.callAmt / (pot + L.callAmt) : 0;
    const made = table.board.length ? PK.bestFive(p.hole.concat(table.board)) : null;
    const label = PK.handLabel(p.hole[0], p.hole[1]);
    return {
      street: table.street, equity: eq, required, toCall: L.toCall, callAmt: L.callAmt, pot,
      stack: p.stack, label, pct: PK.handPercentile(label), position: table.positions[seat],
      made: made ? made.name : null, cls: table.board.length ? PK.handClass(p.hole, table.board) : null,
      draws: PK.drawInfo(p.hole, table.board), opps: opps.map(o => ({ seat: o.seat, pct: o.pct })), nOpp: opps.length,
      risk: riskLevel(L.callAmt || Math.min(p.stack, Math.round(pot * 0.66)), p.stack + p.bet)
    };
  }
  const pctS = x => Math.round(x * 100) + '%';
  // Valora la decisión: Buena, Dudosa o Error
  function rate(table, seat, A, action) {
    const L = table.legal();
    const p = table.players[seat];
    const e = A.equity, req = A.required;
    const type = action.type === 'allin' ? 'raise' : action.type;
    const to = action.type === 'allin' ? L.maxTo : action.amount;
    const add = type === 'call' ? L.callAmt : (type === 'raise' || type === 'bet') ? to - p.bet : 0;
    const res = { rating: 'Buena', title: '', text: '', numbers: '', close: false };
    const nums = [`Equity estimada ${pctS(e)}`];
    if (L.toCall > 0) nums.push(`necesitas ${pctS(req)} para pagar (pot odds)`);
    if (add > 0) nums.push(`arriesgas ${add} fichas (${pctS(add / (p.stack + p.bet))} de tu stack)`);
    res.numbers = nums.join(' · ');
    const hasDraw = A.draws.flushDraw || A.draws.oesd;
    const set = (rating, title, text, close = false) => Object.assign(res, { rating, title, text, close });

    if (A.street === 'preflop') {
      const raises = table.log.filter(x => x.street === 'preflop' && x.type === 'raise').length;
      const pos = A.position;
      const chart = PK.OPEN_SETS[pos] || PK.OPEN_SETS.BTN;
      const inChart = chart.has(A.label);
      const shortStack = (p.stack + p.bet) / table.bb <= 13;
      if (shortStack) {
        const pushOk = A.pct <= 0.15 + (13 - (p.stack + p.bet) / table.bb) * 0.035 + ({ BTN: 0.12, SB: 0.16, CO: 0.06 }[pos] || 0);
        if (type === 'raise') return add >= p.stack * 0.9 ? (pushOk ? set('Buena', 'All-in correcto', `Con stack corto (${Math.round((p.stack + p.bet) / table.bb)} ciegas) lo mejor es ir all-in o tirar. ${A.label} es suficiente.`) : set('Dudosa', 'All-in arriesgado', `${A.label} está en el límite para ir all-in con este stack.`)) : set('Dudosa', 'Con stack corto, mejor all-in', 'Con menos de 13 ciegas, subir pequeño te deja comprometido; suele ser mejor all-in o tirar.');
        if (type === 'fold') return pushOk && raises === 0 ? set('Dudosa', 'Podías ir all-in', `Con ${A.label} y stack corto, el all-in suele ser rentable desde ${pos}.`) : set('Buena', 'Buen fold', 'Mano demasiado débil para arriesgar el torneo.');
      }
      if (raises === 0) {
        if (L.canCheck) {
          if (type === 'check') return set('Buena', 'Ves el flop gratis', 'Desde la ciega grande, si nadie sube, pasar es correcto con la mayoría de manos.');
          return A.pct <= 0.15 ? set('Buena', 'Subida de valor', `${A.label} es de las mejores manos: subir para construir el bote está bien.`) : set('Dudosa', 'Subida opcional', 'Subir aquí no es un error, pero con esta mano pasar también está bien.', true);
        }
        if (type === 'raise') {
          if (inChart) return set('Buena', 'Apertura correcta', `${A.label} está en la tabla de apertura desde ${pos}.`);
          if (A.pct <= PK.rangePercent(chart) + 0.06) return set('Dudosa', 'Apertura marginal', `${A.label} queda justo fuera de la tabla desde ${pos}. Desde una posición más tardía sería una apertura normal.`, true);
          return set('Error', 'Mano demasiado débil', `${A.label} no está en la tabla de apertura desde ${pos}. Jugarla te pondrá en apuros fuera de posición.`);
        }
        if (type === 'call') return set(inChart ? 'Dudosa' : 'Error', 'Entrar pagando (limp)', inChart ? `Con ${A.label} es mejor subir: tomas la iniciativa y puedes ganar el bote ya.` : `${A.label} no está en la tabla desde ${pos}. Mejor tirarla que pagar.`);
        if (type === 'fold') {
          if (!inChart) return set('Buena', 'Buen fold', `${A.label} no está en la tabla de apertura desde ${pos}. Tirar manos flojas es la base del póker ganador.`);
          if (A.pct <= PK.rangePercent(chart) * 0.6) return set('Error', 'Tiraste una mano buena', `${A.label} es de las manos que se abren claramente desde ${pos}.`);
          return set('Dudosa', 'Fold demasiado prudente', `${A.label} está en la tabla de apertura desde ${pos}; podías subir.`, true);
        }
      }
      // ante subida
      const potOddsOk = e + (A.label.endsWith('s') || A.label.length === 2 ? 0.05 : 0) >= req;
      if (type === 'fold') {
        if (A.pct <= 0.03) return set('Error', 'Tiraste una mano premium', `${A.label} es de las mejores manos: ante una subida, sube de nuevo (3-bet) o paga.`);
        if (potOddsOk && e > req + 0.1) return set('Dudosa', 'Fold discutible', `Tu equity estimada (${pctS(e)}) supera la necesaria (${pctS(req)}). Pagar era razonable, aunque jugar fuera de posición cuesta.`, true);
        return set('Buena', 'Buen fold', `Ante una subida el rango del rival es fuerte. Con ${A.label} tu equity estimada es ${pctS(e)}.`);
      }
      if (type === 'raise') {
        if (A.pct <= 0.06) return set('Buena', '3-bet de valor', `${A.label} está entre las mejores manos: volver a subir es lo ideal.`);
        if (A.pct <= 0.15) return set('Dudosa', '3-bet agresivo', `Con ${A.label} pagar también es válido; resubir funciona mejor contra rivales que abren mucho.`, true);
        return set('Error', 'Resubida demasiado ligera', `${A.label} no es lo bastante fuerte para resubir: contra un rango de subida tienes ${pctS(e)} de equity.`);
      }
      if (type === 'call') {
        if (A.pct <= 0.03) return set('Dudosa', 'Pagar con una mano premium', `Con ${A.label} es mejor resubir para meter más dinero con ventaja.`, true);
        if (potOddsOk) return set('Buena', 'Pago correcto', `Necesitas ${pctS(req)} y tienes alrededor de ${pctS(e)}.`, Math.abs(e - req) < 0.04);
        return set('Error', 'Pago demasiado caro', `Necesitas ${pctS(req)} de equity y tu mano tiene ${pctS(e)} contra el rango del rival.`);
      }
      return res;
    }

    // ---------------------------------------------------------- postflop
    const strong = e >= 0.65;
    const betFrac = add / Math.max(1, A.pot);
    if (L.toCall > 0) {
      const margin = e - req;
      if (type === 'fold') {
        if (margin > 0.12) return set('Error', 'Fold con ventaja', `Tenías ${pctS(e)} de equity y solo necesitabas ${pctS(req)}. Pagar ganaba fichas a largo plazo.`);
        if (margin > 0.03) return set('Dudosa', 'Fold discutible', `Tu equity (${pctS(e)}) supera algo lo necesario (${pctS(req)}). Pagar era ligeramente mejor, aunque las estimaciones de rango tienen margen de error.`, true);
        if (margin > -0.04) return set('Buena', 'Decisión ajustada', `Muy igualado: necesitas ${pctS(req)} y tienes ${pctS(e)}. Pagar y tirar tienen sentido; tirar evita riesgo.`, true);
        return set('Buena', 'Buen fold', `Necesitabas ${pctS(req)} y solo tenías ${pctS(e)}.`);
      }
      if (type === 'call') {
        if (margin >= 0.03) return set('Buena', strong ? 'Pago correcto (¿subir?)' : 'Pago correcto', strong ? `Con ${pctS(e)} de equity pagar está bien, pero subir podía sacar más valor.` : `Tus ${pctS(e)} superan los ${pctS(req)} necesarios.`, strong);
        if (margin > -0.04) return set('Buena', 'Pago ajustado', `Necesitas ${pctS(req)} y tienes ${pctS(e)}: está en el límite. Pagar y tirar son razonables.`, true);
        if (hasDraw && table.street !== 'river' && margin > -0.1) return set('Dudosa', 'Pago por implied odds', `Las pot odds no alcanzan (${pctS(e)} frente a ${pctS(req)}), pero si ligas tu proyecto puedes ganar más fichas después (implied odds).`, true);
        return set('Error', 'Pago sin las odds', `Necesitas ${pctS(req)} de equity y tienes ${pctS(e)}. A la larga pierdes fichas.`);
      }
      if (type === 'raise') {
        if (strong) return set('Buena', 'Subida de valor', `Con ${pctS(e)} de equity subir hace crecer el bote cuando vas por delante.`);
        if (hasDraw && table.street !== 'river') return set('Buena', 'Semifarol', 'Subes con un proyecto: puedes ganar ya si el rival se retira, y si paga aún puedes ligar.', true);
        if (e >= req) return set('Dudosa', 'Subida discutible', `Con equity media (${pctS(e)}) pagar suele ser mejor: subiendo solo te pagan manos mejores.`, true);
        return set(add > p.stack * 0.5 ? 'Error' : 'Dudosa', 'Farol arriesgado', `Subir sin mano ni proyecto (${pctS(e)}) solo funciona si el rival se retira a menudo.`);
      }
    } else {
      if (type === 'check') {
        if (e >= 0.75) return set('Dudosa', 'Pierdes valor', `Con ${pctS(e)} de equity conviene apostar para que paguen manos peores. Pasar para tender una trampa es posible, pero arriesgado.`, true);
        if (hasDraw && table.street !== 'river') return set('Buena', 'Carta gratis', 'Pasar con proyecto te da una carta gratis. Apostar como semifarol también sería válido.', true);
        return set('Buena', 'Pasar está bien', 'Con una mano media o débil pasar controla el tamaño del bote.');
      }
      if (type === 'bet' || type === 'raise') {
        if (e >= 0.55) return betFrac > 1.5 && e < 0.8 ? set('Dudosa', 'Apuesta demasiado grande', 'Buena idea apostar, pero un tamaño tan grande solo lo pagan manos mejores.') : set('Buena', 'Apuesta de valor', `Con ${pctS(e)} de equity apostar gana fichas de manos peores.`);
        if (hasDraw && table.street !== 'river') return set('Buena', 'Semifarol', 'Apostar con proyecto: ganas si el rival se retira y tienes outs si paga.');
        if (A.nOpp === 1 && betFrac <= 0.75) return set('Dudosa', 'Farol', `Con ${pctS(e)} de equity esta apuesta es un farol. Contra un solo rival y con tamaño moderado puede funcionar, sobre todo en mesas secas.`, true);
        return set('Error', 'Farol caro', `Apostar fuerte con ${pctS(e)} de equity${A.nOpp > 1 ? ' contra varios rivales' : ''} pierde fichas: alguien suele tener algo.`);
      }
    }
    return res;
  }

  Object.assign(PK, { Table, STREETS, STREET_NAMES, PROFILES, BOT_NAMES, botDecide, estimateRanges, heroEquity, analyze, rate, riskLevel });
})(typeof window !== 'undefined' ? window : globalThis);
