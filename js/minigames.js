/* =========================================================================
   Minijuegos. Cada uno define:
     gen(d)            → pregunta serializable (d = dificultad 1..3)
     render(el, q, ui) → pinta la pregunta; llama ui.answer(correcto, explicaciónHTML, {partial})
     hint(q)           → pista opcional
   ========================================================================= */
(function (root) {
  'use strict';
  const PK = root.PK = root.PK || {};
  const G = PK.GAMES = {};
  const U = () => PK.UI;
  const pct = x => (Math.round(x * 1000) / 10).toLocaleString('es-ES') + ' %';
  const rint = (a, b) => a + PK.fastInt(b - a + 1);
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function choiceButtons(el, opts, onPick) {
    const wrap = document.createElement('div');
    wrap.className = 'choices';
    opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'btn choice'; b.type = 'button'; b.innerHTML = `<span>${o}</span>`; b.dataset.i = i;
      b.onclick = () => { wrap.querySelectorAll('button').forEach(x => { x.disabled = true; }); onPick(i, b, wrap); };
      wrap.appendChild(b);
    });
    el.appendChild(wrap);
    return wrap;
  }
  function markChoices(wrap, correctIdx, picked) {
    wrap.querySelectorAll('button').forEach((b, i) => {
      if (i === correctIdx || (Array.isArray(correctIdx) && correctIdx.includes(i))) b.classList.add('right');
      else if (i === picked) b.classList.add('wrong');
    });
  }
  function div(html, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; return d; }

  // ============================================================ ¿Quién gana?
  G.whoWins = {
    id: 'whoWins', title: '¿Quién gana?', icon: 'trophy', level: 1,
    desc: 'Mira las manos y la mesa: elige la ganadora o indica si hay empate.',
    gen(d) {
      const n = d === 1 ? 2 : d === 2 ? rint(2, 3) : rint(3, 4);
      for (let tries = 0; tries < 400; tries++) {
        const cards = PK.dealRandom(5 + n * 2);
        const board = cards.slice(0, 5), holes = [];
        for (let i = 0; i < n; i++) holes.push(cards.slice(5 + i * 2, 7 + i * 2));
        const { scores, winners } = PK.winners(holes, board);
        const sorted = scores.slice().sort((a, b) => b - a);
        const sameCat = PK.category(sorted[0]) === PK.category(sorted[1]);
        if (d === 3 && !sameCat && tries < 300) continue;
        if (d === 2 && !sameCat && Math.random() < 0.5 && tries < 300) continue;
        // a veces forzamos situaciones de empate
        if (winners.length === 1 && d >= 2 && Math.random() < 0.08) continue;
        return { board, holes, winners, scores };
      }
    },
    hint(q) { return 'Busca primero la categoría de cada mano (pareja, color...). Si coincide, compara las cartas que la forman y luego los kickers.'; },
    render(el, q, ui) {
      const UI = U();
      el.appendChild(div(`<div class="label">Mesa</div>${UI.cards(q.board, { deal: true })}`, 'board-box'));
      const opts = q.holes.map((h, i) => `<div class="pl-label">Jugador ${i + 1}</div>${UI.cards(h, { small: false })}`);
      opts.push('Empate (bote dividido)');
      const correct = q.winners.length > 1 ? q.holes.length : q.winners[0];
      const wrap = choiceButtons(el, opts, (i) => {
        markChoices(wrap, correct, i);
        const lines = q.holes.map((h, k) => {
          const bf = PK.bestFive(h.concat(q.board));
          return `<div class="exp-row ${q.winners.includes(k) ? 'win' : ''}"><b>J${k + 1}:</b> ${bf.name} ${UI.cards(bf.cards, { mini: true })}</div>`;
        }).join('');
        const msg = q.winners.length > 1 ? 'Hay empate: las cinco cartas que juegan valen lo mismo.' : `Gana el jugador ${q.winners[0] + 1}.`;
        ui.answer(i === correct, `${msg}${lines}`);
      });
      wrap.classList.add('hands-choice');
    }
  };

  // ======================================================== Ordena las manos
  G.sortHands = {
    id: 'sortHands', title: 'Ordena las manos', icon: 'sort', level: 1,
    desc: 'Arrastra las jugadas de la más fuerte (arriba) a la más débil.',
    gen(d) {
      const k = d + 2;
      for (let tries = 0; tries < 300; tries++) {
        const hands = [];
        for (let i = 0; i < k; i++) hands.push(randomHandOfCategory(d === 3 && i > 0 && Math.random() < 0.6 ? PK.category(PK.evaluate(hands[0])) : PK.fastInt(9)));
        const scores = hands.map(h => PK.evaluate(h));
        if (new Set(scores).size < k) continue;
        // orden de presentación aleatorio, distinto del correcto
        const order = PK.shuffle(hands.map((_, i) => i));
        const correct = order.slice().sort((a, b) => scores[b] - scores[a]);
        if (order.join() === correct.join()) continue;
        return { hands: order.map(i => hands[i]), scores: order.map(i => scores[i]) };
      }
    },
    hint() { return 'Escalera real > escalera de color > póker > full > color > escalera > trío > doble pareja > pareja > carta alta.'; },
    render(el, q, ui) {
      const UI = U();
      const list = document.createElement('div');
      list.className = 'sort-list';
      q.hands.forEach((h, i) => {
        const it = document.createElement('div');
        it.className = 'sort-item'; it.dataset.i = i;
        it.innerHTML = `<span class="grip" aria-hidden="true">${PK.UI.icon('grip')}</span>${UI.cards(PK.bestFive(h).cards, { small: true })}<span class="sort-btns"><button type="button" class="icon-btn up" aria-label="Subir">${PK.UI.icon('chevron-up')}</button><button type="button" class="icon-btn down" aria-label="Bajar">${PK.UI.icon('chevron-down')}</button></span>`;
        list.appendChild(it);
      });
      el.appendChild(div('<div class="label">Más fuerte ↑</div>'));
      el.appendChild(list);
      el.appendChild(div('<div class="label">Más débil ↓</div>'));
      enableDragSort(list);
      list.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        const it = b.closest('.sort-item');
        if (b.classList.contains('up') && it.previousElementSibling) list.insertBefore(it, it.previousElementSibling);
        if (b.classList.contains('down') && it.nextElementSibling) list.insertBefore(it.nextElementSibling, it);
        PK.Sound && PK.Sound.play('tick');
      });
      const btn = document.createElement('button');
      btn.className = 'btn primary'; btn.type = 'button'; btn.textContent = 'Comprobar';
      btn.onclick = () => {
        btn.disabled = true;
        list.classList.add('locked');
        const cur = [...list.children].map(x => +x.dataset.i);
        const correct = q.hands.map((_, i) => i).sort((a, b) => q.scores[b] - q.scores[a]);
        const good = cur.join() === correct.join();
        [...list.children].forEach((x, pos) => x.classList.add(+x.dataset.i === correct[pos] ? 'right' : 'wrong'));
        const exp = correct.map((i, pos) => `<div class="exp-row">${pos + 1}. <b>${PK.describe(q.scores[i])}</b> ${UI.cards(PK.bestFive(q.hands[i]).cards, { mini: true })}</div>`).join('');
        ui.answer(good, `Orden correcto:${exp}`);
      };
      el.appendChild(btn);
    }
  };
  // Mano aleatoria de 5 cartas de una categoría dada
  function randomHandOfCategory(cat) {
    for (let t = 0; t < 4000; t++) {
      let h;
      if (cat >= 4 && cat !== 6 && cat !== 7) {
        const hi = rint(5, 14), s = PK.fastInt(4);
        if (cat === 4 || cat === 8) {
          h = [];
          for (let r = hi; r > hi - 5; r--) h.push(PK.makeCard(r === 1 ? 14 : r, cat === 8 ? s : PK.fastInt(4)));
          if (cat === 8 && hi === 14 && Math.random() < 0.7) { /* escalera real ocasional */ }
        } else {
          const ranks = PK.shuffle([...Array(13)].map((_, i) => i + 2)).slice(0, 5);
          h = ranks.map(r => PK.makeCard(r, s));
        }
      } else h = PK.dealRandom(5);
      if (PK.category(PK.evaluate(h)) === cat) return h;
      if (cat === 6 || cat === 7 || cat === 3 || cat === 2) {
        const r1 = rint(2, 14); let r2 = rint(2, 14); while (r2 === r1) r2 = rint(2, 14);
        const suits = PK.shuffle([0, 1, 2, 3]);
        const n1 = cat === 7 ? 4 : cat === 2 ? 2 : 3, n2 = cat === 6 ? 2 : cat === 2 ? 2 : 0;
        h = suits.slice(0, n1).map(s => PK.makeCard(r1, s)).concat(PK.shuffle([0, 1, 2, 3]).slice(0, n2).map(s => PK.makeCard(r2, s)));
        h = h.concat(PK.dealRandom(5 - h.length, h));
        if (PK.category(PK.evaluate(h)) === cat) return h;
      }
    }
    return PK.dealRandom(5);
  }

  // ========================================================== La mejor mano
  G.bestHand = {
    id: 'bestHand', title: 'La mejor mano', icon: 'select', level: 1,
    desc: 'De 7 cartas, selecciona las 5 que forman la mejor jugada.',
    gen(d) {
      for (let t = 0; t < 200; t++) {
        const cards = PK.dealRandom(7);
        const bf = PK.bestFive(cards);
        if (d === 1 && bf.cat < 1) continue;
        if (d >= 2 && bf.cat < 2 && t < 150) continue;
        if (d === 3 && bf.cat < 4 && t < 150) continue;
        return { cards, best: bf.score };
      }
    },
    hint(q) { return `Tu mejor jugada es: ${PK.catName(q.best)}.`; },
    render(el, q, ui) {
      const UI = U();
      const sel = new Set();
      const box = div(`<div class="label">Tus cartas: <b>${UI.cardsInline(q.cards.slice(0, 2))}</b> · Mesa: <b>${UI.cardsInline(q.cards.slice(2))}</b></div>`);
      el.appendChild(box);
      const row = document.createElement('div');
      row.className = 'cards selectable';
      q.cards.forEach((c, i) => {
        const cd = div(UI.card(c, {}));
        const node = cd.firstChild;
        if (i < 2) node.classList.add('hole-mark');
        node.onclick = () => {
          if (row.classList.contains('locked')) return;
          if (sel.has(i)) sel.delete(i); else if (sel.size < 5) sel.add(i);
          node.classList.toggle('selected', sel.has(i));
          btn.disabled = sel.size !== 5;
          counter.textContent = `${sel.size}/5 seleccionadas`;
          PK.Sound && PK.Sound.play('tick');
        };
        row.appendChild(node);
      });
      el.appendChild(row);
      const counter = div('0/5 seleccionadas', 'muted center');
      el.appendChild(counter);
      const btn = document.createElement('button');
      btn.className = 'btn primary'; btn.textContent = 'Comprobar'; btn.disabled = true;
      btn.onclick = () => {
        btn.disabled = true; row.classList.add('locked');
        const chosen = [...sel].map(i => q.cards[i]);
        const s = PK.evaluate(chosen);
        const bf = PK.bestFive(q.cards);
        const good = s === q.best;
        [...row.children].forEach((n, i) => { if (bf.cards.includes(q.cards[i])) n.classList.add('hl'); });
        ui.answer(good, `${good ? '' : `Elegiste: ${PK.describe(s)}. `}La mejor jugada es <b>${bf.name}</b>: ${UI.cards(bf.cards, { mini: true })}`);
      };
      el.appendChild(btn);
    }
  };

  // ==================================================== ¿Cuánto vale tu mano?
  const CLASSES = { monstruo: 'Monstruo', fuerte: 'Fuerte', media: 'Media', debil: 'Débil', proyecto: 'Proyecto' };
  G.handValue = {
    id: 'handValue', title: '¿Cuánto vale tu mano?', icon: 'scale', level: 2,
    desc: 'Clasifica tu mano en esta mesa: monstruo, fuerte, media, débil o proyecto.',
    gen(d) {
      const target = PK.pick(Object.keys(CLASSES));
      const boardLen = d === 1 ? 3 : d === 2 ? PK.pick([3, 4]) : PK.pick([3, 4, 5]);
      for (let t = 0; t < 1500; t++) {
        const c = PK.dealRandom(2 + (target === 'proyecto' ? Math.min(boardLen, 4) : boardLen));
        const hole = c.slice(0, 2), board = c.slice(2);
        const hc = PK.handClass(hole, board);
        if (hc.cls === target || t > 1400) return { hole, board, cls: hc.cls };
      }
    },
    hint(q) { return 'Pregúntate: ¿a cuántas manos razonables gano? ¿Uso mis cartas o la jugada está en la mesa? ¿Me falta una carta para color o escalera?'; },
    render(el, q, ui) {
      const UI = U();
      el.appendChild(div(`<div class="label">Mesa</div>${UI.cards(q.board, { deal: true })}<div class="label">Tu mano</div>${UI.cards(q.hole)}`, 'board-box'));
      const keys = Object.keys(CLASSES);
      const wrap = choiceButtons(el, keys.map(k => CLASSES[k]), i => {
        const correct = keys.indexOf(q.cls);
        markChoices(wrap, correct, i);
        const hc = PK.handClass(q.hole, q.board);
        const eq = PK.equity([{ cards: q.hole }, null], q.board, { iterations: 2500 }).equity[0];
        ui.answer(i === correct, `<span><span class="pill cls-${q.cls}">${CLASSES[q.cls]}</span> ${hc.name}. ${hc.why}</span><div class="muted">Equity contra una mano al azar: ${pct(eq)} (contra rivales que apuestan será menor).</div>`);
      });
      wrap.classList.add('row-choices');
    }
  };

  // ============================================================ Lee la mesa
  function boardDraws(board) {
    const suits = [0, 1, 2, 3].map(s => board.filter(c => PK.suitOf(c) === s).length);
    const maxSuit = Math.max(...suits);
    const ranks = new Set(board.map(PK.rankOf));
    let maxIn = 0;
    for (let h = 5; h <= 14; h++) {
      let cnt = 0;
      for (let r = h - 4; r <= h; r++) if (ranks.has(r === 1 ? 14 : r)) cnt++;
      maxIn = Math.max(maxIn, cnt);
    }
    const paired = ranks.size < board.length;
    const open = board.length < 5;
    return [
      { k: 'colorYa', label: 'Color ya posible', v: maxSuit >= 3 },
      { k: 'proyColor', label: 'Proyecto de color', v: open && maxSuit >= 2 },
      { k: 'escYa', label: 'Escalera ya posible', v: maxIn >= 3 },
      { k: 'proyEsc', label: 'Proyecto de escalera', v: open && maxIn >= 2 },
      { k: 'full', label: 'Full o póker posible (mesa doblada)', v: paired }
    ];
  }
  G.readBoard = {
    id: 'readBoard', title: 'Lee la mesa', icon: 'eye', level: 4,
    desc: 'Identifica la mejor mano posible (nuts) y los proyectos que permite la mesa.',
    gen(d) {
      const len = d === 1 ? 3 : d === 2 ? PK.pick([3, 4]) : PK.pick([4, 5]);
      const board = PK.dealRandom(len);
      const type = len === 5 || Math.random() < 0.5 ? 'nuts' : 'draws';
      if (type === 'draws') return { board, type };
      const nuts = PK.nutsOf(board);
      // distractores: siguientes manos posibles y alguna imposible
      const dead = new Set(board), names = new Map();
      for (let a = 0; a < 52; a++) if (!dead.has(a)) for (let b = a + 1; b < 52; b++) if (!dead.has(b)) {
        const s = PK.evaluate([a, b].concat(board));
        const nm = PK.describe(Math.floor(s / 4096) * 4096);
        if (!names.has(nm) || names.get(nm) < s) names.set(nm, s);
      }
      const nutsName = PK.describe(Math.floor(nuts.score / 4096) * 4096);
      const sorted = [...names.entries()].sort((x, y) => y[1] - x[1]).map(x => x[0]).filter(n => n !== nutsName);
      const opts = [nutsName].concat(sorted.slice(0, 2));
      const impossible = ['Escalera real', 'Póker de Ases', 'Color al As', 'Full de Ases y Reyes', 'Escalera al As'].filter(x => !names.has(x) && x !== nutsName);
      if (impossible.length) opts.push(PK.pick(impossible));
      while (opts.length < 4 && sorted[opts.length - 1]) opts.push(sorted[opts.length - 1]);
      const shuffled = PK.shuffle(opts.slice());
      const combo = nuts.combos[0];
      return { board, type, opts: shuffled, answer: shuffled.indexOf(nutsName), example: combo, nCombos: nuts.combos.length };
    },
    hint(q) { return q.type === 'nuts' ? 'Busca de arriba abajo en el ranking: ¿es posible escalera de color? ¿póker (mesa doblada)? ¿color (3 del mismo palo)? ¿escalera (3 cartas en 5 valores seguidos)?' : 'Color: hacen falta 2 del mismo palo en la mesa para proyectar (3 para que ya sea posible). Escalera: 2 cartas dentro de cinco valores seguidos para proyectar.'; },
    render(el, q, ui) {
      const UI = U();
      el.appendChild(div(`<div class="label">Mesa</div>${UI.cards(q.board, { deal: true })}`, 'board-box'));
      if (q.type === 'nuts') {
        el.appendChild(div('<p class="q">¿Cuál es la mejor mano posible (nuts)?</p>'));
        const wrap = choiceButtons(el, q.opts.map(esc), i => {
          markChoices(wrap, q.answer, i);
          ui.answer(i === q.answer, `Las nuts son <b>${q.opts[q.answer]}</b>, por ejemplo con ${UI.cards(q.example, { mini: true })}${q.nCombos > 1 ? ` (${q.nCombos} combinaciones)` : ''}.`);
        });
        return;
      }
      el.appendChild(div('<p class="q">Marca todo lo que permite esta mesa:</p>'));
      const draws = boardDraws(q.board);
      const form = document.createElement('div');
      form.className = 'checks';
      draws.forEach((dr, i) => {
        const l = document.createElement('label');
        l.className = 'check';
        l.innerHTML = `<input type="checkbox" data-i="${i}"> <span>${dr.label}</span>`;
        form.appendChild(l);
      });
      el.appendChild(form);
      const btn = document.createElement('button');
      btn.className = 'btn primary'; btn.textContent = 'Comprobar';
      btn.onclick = () => {
        btn.disabled = true;
        let good = true;
        form.querySelectorAll('input').forEach(inp => {
          const dr = draws[+inp.dataset.i];
          inp.disabled = true;
          if (inp.checked !== dr.v) good = false;
          inp.parentElement.classList.add(dr.v ? 'right' : (inp.checked ? 'wrong' : 'neutral'));
        });
        const yes = draws.filter(x => x.v).map(x => x.label);
        const tex = PK.boardTexture(q.board);
        ui.answer(good, `Esta mesa permite: <b>${yes.length ? yes.join(', ') : 'nada especial'}</b>. Textura: <b>${tex.label}</b>.`);
      };
      el.appendChild(btn);
    }
  };

  // ======================================================== Cazador de outs
  G.outsHunter = {
    id: 'outsHunter', title: 'Cazador de outs', icon: 'crosshair', level: 3,
    desc: 'Cuenta cuántas cartas te dan la victoria en la próxima carta. Ves las cartas del rival.',
    gen(d) {
      for (let t = 0; t < 3000; t++) {
        const len = d === 1 ? PK.pick([3, 4]) : PK.pick([3, 4]);
        const c = PK.dealRandom(4 + len);
        const hero = c.slice(0, 2), vil = c.slice(2, 4), board = c.slice(4);
        if (PK.evaluate(hero.concat(board)) >= PK.evaluate(vil.concat(board))) continue;
        const outs = PK.outsAgainst(hero, vil, board);
        const dr = PK.drawInfo(hero, board);
        if (outs.length < 2 || outs.length > 17) continue;
        if (d === 1 && !(dr.flushDraw || dr.oesd)) continue;
        if (d === 2 && !(dr.flushDraw || dr.oesd || dr.gutshot) && t < 2000) continue;
        return { hero, vil, board, outs };
      }
    },
    hint(q) {
      const dr = PK.drawInfo(q.hero, q.board);
      const parts = [];
      if (dr.flushDraw) parts.push('tienes proyecto de color (9 cartas del palo)');
      if (dr.oesd) parts.push('tienes escalera abierta (8)');
      if (dr.gutshot) parts.push('tienes escalera interna (4)');
      return (parts.length ? 'Pista: ' + parts.join(' y ') + '. ' : '') + 'No olvides cartas que te den pareja mayor, y descuenta las que también mejoran al rival.';
    },
    render(el, q, ui) {
      const UI = U();
      el.appendChild(div(`<div class="label">Mesa (${q.board.length === 3 ? 'flop' : 'turn'})</div>${UI.cards(q.board, { deal: true })}
        <div class="duo"><div><div class="label">Tú</div>${UI.cards(q.hero)}</div><div><div class="label">Rival</div>${UI.cards(q.vil)}</div></div>
        <div class="muted">Vas por detrás: ${PK.describe(PK.evaluate(q.hero.concat(q.board)))} contra ${PK.describe(PK.evaluate(q.vil.concat(q.board)))}.</div>`, 'board-box'));
      el.appendChild(div('<p class="q">¿Cuántas cartas de la próxima te dan la victoria?</p>'));
      const nwrap = document.createElement('div');
      nwrap.className = 'stepper';
      nwrap.innerHTML = '<button class="btn round" data-d="-1">−</button><output>8</output><button class="btn round" data-d="1">+</button>';
      let val = 8;
      nwrap.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; val = Math.max(0, Math.min(25, val + +b.dataset.d)); nwrap.querySelector('output').textContent = val; };
      el.appendChild(nwrap);
      const btn = document.createElement('button');
      btn.className = 'btn primary'; btn.textContent = 'Comprobar';
      btn.onclick = () => {
        btn.disabled = true; nwrap.querySelectorAll('button').forEach(b => { b.disabled = true; });
        const n = q.outs.length;
        const good = val === n;
        const remaining = 52 - 4 - q.board.length;
        ui.answer(good, `Tenías <b>${n} outs</b>${good ? '' : ` (dijiste ${val})`}: ${UI.cards(q.outs, { mini: true, hl: true })}
          <div class="muted">Probabilidad de ligar en la próxima carta: ${n}/${remaining} = ${pct(n / remaining)} (regla del 2: ≈ ${n * 2} %).</div>`, { partial: Math.abs(val - n) === 1 });
      };
      el.appendChild(btn);
    }
  };

  // ========================================================= ¿Pagar o tirar?
  G.callFold = {
    id: 'callFold', title: '¿Pagar o tirar?', icon: 'percent', level: 3,
    desc: 'Con el bote, la apuesta del rival y tu proyecto, decide y compara pot odds con equity.',
    gen(d) {
      for (let t = 0; t < 3000; t++) {
        const len = d === 1 ? 4 : d === 2 ? 3 : PK.pick([3, 4]);
        const c = PK.dealRandom(4 + len);
        const hero = c.slice(0, 2), vil = c.slice(2, 4), board = c.slice(4);
        if (PK.evaluate(hero.concat(board)) >= PK.evaluate(vil.concat(board))) continue;
        const dr = PK.drawInfo(hero, board);
        if (d < 3 && !(dr.flushDraw || dr.oesd || dr.gutshot)) continue;
        const pot = PK.pick([60, 80, 100, 120, 150, 200, 240, 300]);
        const frac = PK.pick([0.33, 0.5, 0.75, 1, 1.25, 2]);
        const bet = Math.round(pot * frac / 5) * 5;
        const eq = PK.equity([{ cards: hero }, { cards: vil }], board).equity[0];
        const req = bet / (pot + 2 * bet);
        if (Math.abs(eq - req) < 0.035) continue;
        return { hero, vil, board, pot, bet, eq, req, allIn: len === 3 };
      }
    },
    hint(q) { return `Pot odds: pagas ${q.bet} para ganar ${q.pot + q.bet}. Necesitas ${q.bet} ÷ ${q.pot + 2 * q.bet}. Cuenta tus outs y usa la regla del ${q.board.length === 3 ? '4' : '2'}.`; },
    render(el, q, ui) {
      const UI = U();
      el.appendChild(div(`<div class="label">Mesa (${q.board.length === 3 ? 'flop' : 'turn'})</div>${UI.cards(q.board, { deal: true })}
        <div class="duo"><div><div class="label">Tú</div>${UI.cards(q.hero)}</div><div><div class="label">Rival</div>${UI.cards([0, 0], { back: true })}</div></div>
        <div class="potline">Bote: <b>${q.pot}</b> · El rival ${q.allIn ? 'va <b>all-in</b> por' : 'apuesta'} <b>${q.bet}</b></div>`, 'board-box'));
      const wrap = choiceButtons(el, ['Pagar', 'Tirar'], i => {
        const correct = q.eq >= q.req ? 0 : 1;
        markChoices(wrap, correct, i);
        const outs = PK.outsAgainst(q.hero, q.vil, q.board).length;
        const rule = q.board.length === 3 ? outs * 4 : outs * 2;
        ui.answer(i === correct, `<div class="calc">
          <div>Pot odds: ${q.bet} ÷ (${q.pot} + ${q.bet} + ${q.bet}) = <b>${pct(q.req)}</b> de equity mínima</div>
          <div>Tu equity real contra su mano: <b>${pct(q.eq)}</b> (${outs} outs, regla del ${q.board.length === 3 ? '4' : '2'} ≈ ${rule} %)</div>
          <div>${q.eq >= q.req ? '→ Pagar es rentable a largo plazo.' : '→ Pagar pierde fichas a largo plazo: tira.'}</div></div>
          <div class="muted">El rival tenía ${UI.cards(q.vil, { mini: true })} (${PK.describe(PK.evaluate(q.vil.concat(q.board)))}).${q.allIn ? '' : ' Con más apuestas por venir, las implied odds pueden justificar pagar algo por debajo.'}</div>`);
      });
      wrap.classList.add('row-choices');
    }
  };

  // ======================================================= Adivina la equity
  const MATCHUPS = ['As Ah|Kd Kc', 'Qs Qh|Ad Kc', 'Ah Kh|7d 7c', '7s 7h|6d 5d', 'Ad Kc|Ah Qd', 'Js Ts|Ac 4d', 'Kh Qh|Ac 2s', '2s 2h|Ad Kd', 'As Ks|Qh Js', '9s 9h|Ts Jc', '8s 7s|Ac Kh', 'Ac Qd|Kh Kc'];
  G.guessEquity = {
    id: 'guessEquity', title: 'Adivina la equity', icon: 'gauge', level: 3,
    desc: 'Estima con el deslizador el % de victoria de tu mano. Puntúas según la cercanía.',
    gen(d) {
      if (d === 1) {
        if (Math.random() < 0.5) { const [a, b] = PK.pick(MATCHUPS).split('|'); return { hero: PK.parseCards(a), vil: PK.parseCards(b), board: [] }; }
        const c = PK.dealRandom(4); return { hero: c.slice(0, 2), vil: c.slice(2, 4), board: [] };
      }
      if (d === 2) { const c = PK.dealRandom(7); return { hero: c.slice(0, 2), vil: c.slice(2, 4), board: c.slice(4) }; }
      // contra un rango
      const ranges = [['UTG', 'Rango de apertura de UTG (~15 %)'], ['BTN', 'Rango de apertura del botón (~45 %)'], ['TOP5', 'Top 5 % (QQ+, AK)'], ['TOP25', 'Top 25 % de manos']];
      const [rk, rname] = PK.pick(ranges);
      const flop = Math.random() < 0.4;
      const c = PK.dealRandom(flop ? 5 : 2);
      return { hero: c.slice(0, 2), board: flop ? c.slice(2) : [], rangeKey: rk, rangeName: rname };
    },
    hint(q) { return q.rangeKey ? 'Contra un rango, piensa: ¿qué parte de sus manos te domina? AK, AA... ¿y cuántas son proyectos o cartas peores?' : 'Referencias: pareja contra dos cartas más altas ≈ 55 %; dominada (AK vs AQ) ≈ 70–30; pareja mayor vs menor ≈ 80–20.'; },
    rangeSpec(q) {
      const set = q.rangeKey === 'TOP5' ? PK.parseRange('QQ+, AKs, AKo') : q.rangeKey === 'TOP25' ? PK.topRange(0.25) : PK.OPEN_SETS[q.rangeKey];
      return { range: PK.rangeCombos(set) };
    },
    render(el, q, ui) {
      const UI = U();
      const vilHTML = q.rangeKey ? `<div class="range-name">${q.rangeName}</div>` : UI.cards(q.vil);
      el.appendChild(div(`${q.board.length ? `<div class="label">Flop</div>${UI.cards(q.board, { deal: true })}` : '<div class="label">Antes del flop (all-in)</div>'}
        <div class="duo"><div><div class="label">Tú</div>${UI.cards(q.hero)}</div><div><div class="label">Rival</div>${vilHTML}</div></div>`, 'board-box'));
      const s = div(`<p class="q">¿Qué % del bote te corresponde (equity)?</p><div class="slider-row"><input type="range" min="0" max="100" value="50" aria-label="Equity estimada"><output>50 %</output></div>`);
      el.appendChild(s);
      const range = s.querySelector('input'), out = s.querySelector('output');
      range.oninput = () => { out.textContent = range.value + ' %'; };
      const btn = document.createElement('button');
      btn.className = 'btn primary'; btn.textContent = 'Comprobar';
      const calc = q.eq != null ? Promise.resolve(q.eq) :
        PK.equityAsync([{ cards: q.hero }, q.rangeKey ? this.rangeSpec(q) : { cards: q.vil }], q.board, { iterations: q.board.length && !q.rangeKey ? 2000 : 24000 }).then(r => (q.eq = r.equity[0]));
      btn.onclick = async () => {
        btn.disabled = true; range.disabled = true;
        btn.textContent = 'Calculando…';
        const eq = await calc;
        const guess = +range.value / 100;
        const err = Math.abs(guess - eq) * 100;
        const tol = q.rangeKey ? 9 : 7;
        const good = err <= tol;
        const verdict = err <= 3 ? '<span class="pill pill-good">Excelente</span>' : err <= tol ? '<span class="pill pill-good">Bien</span>' : err <= 15 ? '<span class="pill pill-warn">Cerca</span>' : '';
        btn.textContent = 'Comprobar';
        ui.answer(good, `Equity real: <b>${pct(eq)}</b> · tu estimación: ${range.value} % (error de ${Math.round(err)} puntos) ${verdict}
          <div class="eq-bar"><span style="width:${eq * 100}%"></span><i style="left:${guess * 100}%"></i></div>`, { partial: !good && err <= 15 });
      };
      el.appendChild(btn);
    }
  };

  // ======================================================== ¿Abrir o tirar?
  const POS6 = ['UTG', 'MP', 'CO', 'BTN', 'SB'];
  G.openFold = {
    id: 'openFold', title: '¿Abrir o tirar?', icon: 'grid', level: 2,
    desc: 'Todos se retiran hasta ti. Con tu posición y tu mano, decide si abrir subiendo o tirar.',
    gen(d) {
      const pos = PK.pick(POS6);
      const set = PK.OPEN_SETS[pos];
      const inR = Math.random() < 0.5;
      let label;
      if (d === 3) {
        // manos en el borde: dentro o fuera de la tabla por poco
        const pctEdge = PK.rangePercent(set);
        const cands = PK.HAND_ORDER.filter(l => Math.abs(PK.handPercentile(l) - pctEdge) < 0.12 && set.has(l) === inR);
        label = PK.pick(cands.length ? cands : PK.HAND_ORDER);
      } else {
        const cands = PK.ALL_LABELS.filter(l => set.has(l) === inR && (d === 2 || Math.abs(PK.handPercentile(l) - PK.rangePercent(set)) > 0.15));
        label = PK.pick(cands.length ? cands : PK.ALL_LABELS);
      }
      const combo = PK.pick(PK.labelToCombos(label));
      return { pos, label, hole: combo, open: set.has(label) };
    },
    hint(q) { return `Desde ${q.pos} se abre aproximadamente un ${Math.round(PK.rangePercent(PK.OPEN_SETS[q.pos]) * 100)} % de las manos.`; },
    render(el, q, ui) {
      const UI = U();
      el.appendChild(div(`<div class="pos-badge">${q.pos}</div>${UI.seatMap(q.pos)}<div class="label">Tu mano (${q.label})</div>${UI.cards(q.hole, { deal: true })}`, 'board-box'));
      const wrap = choiceButtons(el, ['Abrir (subir)', 'Tirar'], i => {
        const correct = q.open ? 0 : 1;
        markChoices(wrap, correct, i);
        ui.answer(i === correct, `${q.label} ${q.open ? '<b>está</b>' : '<b>no está</b>'} en la tabla de apertura desde ${q.pos} (~${Math.round(PK.rangePercent(PK.OPEN_SETS[q.pos]) * 100)} % de manos).${UI.chart(q.pos, { highlight: q.label, compact: true })}`);
      });
      wrap.classList.add('row-choices');
    }
  };

  // ===================================================== Simulador de riesgo
  G.riskSim = { id: 'riskSim', title: 'Simulador de riesgo', icon: 'trend', level: 6, tool: true,
    desc: 'Repite 1000 veces una decisión y mira la evolución de tus fichas: decidir bien ≠ ganar hoy.' };

  // ----------------------------------------------- arrastrar para ordenar
  function enableDragSort(list) {
    let drag = null, ph = null, offY = 0;
    list.addEventListener('pointerdown', e => {
      const it = e.target.closest('.sort-item');
      if (!it || e.target.closest('button') || list.classList.contains('locked')) return;
      e.preventDefault();
      const r = it.getBoundingClientRect();
      offY = e.clientY - r.top;
      drag = it;
      ph = document.createElement('div');
      ph.className = 'sort-ph'; ph.style.height = r.height + 'px';
      it.after(ph);
      Object.assign(it.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', zIndex: 50 });
      it.classList.add('dragging');
      it.setPointerCapture(e.pointerId);
    });
    list.addEventListener('pointermove', e => {
      if (!drag) return;
      drag.style.top = (e.clientY - offY) + 'px';
      const items = [...list.querySelectorAll('.sort-item:not(.dragging)')];
      let placed = false;
      for (const it of items) {
        const r = it.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { list.insertBefore(ph, it); placed = true; break; }
      }
      if (!placed) list.appendChild(ph);
    });
    const end = () => {
      if (!drag) return;
      drag.classList.remove('dragging');
      drag.removeAttribute('style');
      list.insertBefore(drag, ph); ph.remove();
      drag = null; ph = null;
      PK.Sound && PK.Sound.play('tick');
    };
    list.addEventListener('pointerup', end);
    list.addEventListener('pointercancel', end);
  }
  PK.enableDragSort = enableDragSort;
})(typeof window !== 'undefined' ? window : globalThis);
