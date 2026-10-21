/* =========================================================================
   Aplicación: rutas y pantallas (inicio, curso, niveles, lecciones,
   entrenamiento, exámenes, mesa, escenarios, historial, progreso y ajustes).
   ========================================================================= */
(function (root) {
  'use strict';
  const PK = root.PK;
  const S = PK.S, UI = PK.UI, icon = UI.icon;
  const $ = (s, el = document) => el.querySelector(s);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const levelById = n => PK.LEVELS.find(l => l.id === +n);
  const isUnlocked = n => +n <= S.unlocked;
  const fmt = n => Math.round(n).toLocaleString('es-ES');
  const pct = x => Math.round(x * 100) + ' %';
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;

  // Pregunta tipo test (lecciones, exámenes, test inicial)
  PK.GAMES.mcq = {
    id: 'mcq', title: 'Pregunta', hidden: true,
    hint() { return null; },
    render(el, q, ui) {
      el.appendChild(h('p', 'q', UI.rich(q.q)));
      const order = PK.shuffle(q.o.map((_, i) => i));
      const wrap = h('div', 'choices');
      order.forEach(i => {
        const b = h('button', 'btn choice', `<span>${UI.rich(q.o[i])}</span>`);
        b.type = 'button';
        b.onclick = () => {
          wrap.querySelectorAll('button').forEach(x => { x.disabled = true; });
          [...wrap.children].forEach((x, k) => { if (order[k] === q.a) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
          ui.answer(i === q.a, UI.rich(q.e || ''));
        };
        wrap.appendChild(b);
      });
      el.appendChild(wrap);
    }
  };

  // ============================================================ piezas comunes
  function crumbs(items) {
    return `<nav class="crumbs" aria-label="Ruta">${items.map((it, i) => i < items.length - 1 ? `<a href="${it[1]}">${it[0]}</a>${icon('chevron-right')}` : `<span aria-current="page">${it[0]}</span>`).join('')}</nav>`;
  }
  function pageHead(title, lead, o = {}) {
    return `<header class="page-head"><div>${o.eyebrow ? `<p class="eyebrow">${o.eyebrow}</p>` : ''}<h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>${o.aside || ''}</header>`;
  }
  function emptyState(ic, title, text, actions = '') {
    return `<div class="empty"><span class="empty-ic">${icon(ic)}</span><h2>${title}</h2><p class="muted">${text}</p><div class="row-btns">${actions}</div></div>`;
  }
  const lessonsDone = L => L.lessons.filter(x => S.lessonsDone[L.id + '-' + x.id]).length;
  function levelState(L) {
    if (!isUnlocked(L.id)) return 'locked';
    if (S.passed[L.id]) return 'passed';
    return lessonsDone(L) ? 'current' : 'open';
  }
  const STATE_PILL = {
    passed: `<span class="pill pill-good">${icon('check')}Superado</span>`,
    current: '<span class="pill pill-accent">En curso</span>',
    open: '<span class="pill">Disponible</span>',
    locked: `<span class="pill">${icon('lock')}Bloqueado</span>`
  };
  // Siguiente paso del curso: primera lección pendiente o el examen del nivel actual
  function nextStep() {
    for (const L of PK.LEVELS) {
      if (!isUnlocked(L.id)) break;
      if (S.passed[L.id]) continue;
      const i = L.lessons.findIndex(x => !S.lessonsDone[L.id + '-' + x.id]);
      if (i >= 0) {
        const ls = L.lessons[i];
        return { L, href: `#/leccion/${L.id}/${ls.id}`, title: ls.title, meta: `Lección ${i + 1} de ${L.lessons.length} · ${plural(ls.steps.length, 'paso')}`, cta: i === 0 && !lessonsDone(L) ? 'Empezar' : 'Continuar' };
      }
      return { L, href: `#/examen/${L.id}`, title: `Examen del nivel ${L.id}`, meta: `${L.exam.length} preguntas · necesitas un 80 %`, cta: 'Hacer el examen' };
    }
    return null;
  }
  const ART = { 1: 'As Kh', 2: 'Qs Qd', 3: 'Ah Jh', 4: 'Kd Ks', 5: 'Tc 9c', 6: 'Ad 5c' };
  function gameTile(id) {
    const G = PK.GAMES[id], st = S.games[id], locked = PK.gameLevel(id) > S.unlocked;
    const t = st ? st.right + st.wrong : 0;
    const meta = locked ? `<span>${icon('lock')} Se desbloquea en el nivel ${PK.gameLevel(id)}</span>`
      : t ? `<span>${pct(st.right / t)} de aciertos</span><span>Récord ${fmt(st.best || 0)}</span>` : '<span>Sin jugar todavía</span>';
    return `<a class="tile${locked ? ' locked' : ''}" href="#/juego/${id}"><span class="tile-ic">${icon(locked ? 'lock' : G.icon)}</span><h3>${G.title}</h3><p>${G.desc}</p><div class="tile-meta">${meta}</div></a>`;
  }
  function linkTile(href, ic, title, text, meta = '') {
    return `<a class="tile" href="${href}"><span class="tile-ic">${icon(ic)}</span><h3>${title}</h3><p>${text}</p>${meta ? `<div class="tile-meta">${meta}</div>` : ''}</a>`;
  }

  // ========================================================== motor de rondas
  function runner(el, o) {
    const st = { i: 0, score: 0, streak: 0, best: 0, right: 0, results: [] };
    let timerId = null;
    el.classList.add('runner');
    const step = () => {
      clearInterval(timerId);
      if (st.i >= o.total) return finish();
      const item = o.getItem(st.i);
      const G = PK.GAMES[item.game];
      const q = item.q;
      const hintTxt = G.hint && G.hint(q);
      let hintUsed = false, answered = false, timeLeft = 0;
      el.innerHTML = '';
      const head = h('header', 'run-head', `
        <div class="run-top"><h1 class="run-title">${o.title}</h1><span class="run-count num">${st.i + 1} / ${o.total}</span></div>
        <div class="segments" style="--n:${o.total}">${Array.from({ length: o.total }, (_, k) => `<i class="${k < st.results.length ? (st.results[k].correct ? 'ok' : 'ko') : k === st.i ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="run-meta">
          ${o.mode === 'game' ? `<span class="stat" data-s="score">${icon('star')}<b>${fmt(st.score)}</b> puntos</span><span class="stat${st.streak >= 3 ? ' hot' : ''}" data-s="streak">${icon('flame')}Racha <b>${st.streak}</b></span>` : `<span class="stat">${icon('check')}<b>${st.right}</b> aciertos</span>`}
          ${item.d ? `<span class="stat" title="Dificultad ${item.d} de 3">Dificultad <span class="diff">${[1, 2, 3].map(k => `<i class="${k <= item.d ? 'on' : ''}"></i>`).join('')}</span></span>` : ''}
          <span class="run-tools">${hintTxt ? `<button type="button" class="chipbtn" data-t="hint">${icon('bulb')}Pista</button>` : ''}${o.mode === 'game' ? `<button type="button" class="chipbtn${S.settings.timer ? ' on' : ''}" data-t="timer" aria-pressed="${!!S.settings.timer}">${icon('timer')}Contrarreloj</button>` : ''}</span>
        </div>
        ${o.mode === 'game' && S.settings.timer ? '<div class="timer"><i></i></div>' : ''}`);
      el.appendChild(head);
      const body = h('div', 'q-body');
      el.appendChild(body);
      const hintBox = h('div', 'hint-box');
      hintBox.hidden = true;
      el.appendChild(hintBox);
      const fb = h('section', 'feedback');
      fb.setAttribute('aria-live', 'polite');
      el.appendChild(fb);
      head.addEventListener('click', e => {
        const t = e.target.closest('[data-t]'); if (!t) return;
        if (t.dataset.t === 'hint' && !answered) { hintUsed = true; hintBox.hidden = false; hintBox.innerHTML = `${icon('bulb')}<div>${hintTxt}</div>`; t.disabled = true; }
        if (t.dataset.t === 'timer') { S.settings.timer = !S.settings.timer; PK.save(); if (!answered) step(); }
      });
      const ui = {
        answer(correct, html, extra = {}) {
          if (answered) return;
          answered = true; clearInterval(timerId);
          body.classList.add('answered');
          let pts = 0;
          if (correct) {
            st.streak++; st.best = Math.max(st.best, st.streak); st.right++;
            pts = 10 + 5 * ((item.d || 1) - 1) + Math.min(st.streak, 10) + (timeLeft > 0 ? Math.ceil(timeLeft / 5) : 0);
            if (st.streak >= 10) PK.award('racha10');
          } else { st.streak = 0; if (extra.partial) pts = 3; }
          if (hintUsed) pts = Math.floor(pts / 2);
          st.score += pts;
          st.results.push({ correct, item });
          if (o.onAnswer) o.onAnswer(item, correct);
          PK.Sound.play(correct ? 'right' : 'wrong');
          const seg = head.querySelectorAll('.segments i')[st.i];
          if (seg) seg.className = (correct ? 'ok' : 'ko') + ' new';
          const sc = head.querySelector('[data-s=score]'), sk = head.querySelector('[data-s=streak]');
          if (sc && pts) { sc.querySelector('b').textContent = fmt(st.score); sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump'); }
          if (sk) { sk.querySelector('b').textContent = st.streak; sk.classList.toggle('hot', st.streak >= 3); }
          const tone = correct ? 'ok' : extra.partial ? 'partial' : 'ko';
          fb.className = 'feedback show ' + tone;
          fb.innerHTML = `<div class="fb-head">${icon(correct ? 'check' : extra.partial ? 'info' : 'x')}<span>${correct ? 'Correcto' : extra.partial ? 'Casi' : 'No es correcto'}</span>${pts && o.mode === 'game' ? `<span class="pts">+${pts}</span>` : ''}</div>
            <div class="fb-body">${html || ''}</div>
            <div class="fb-foot"><span class="hint-key"><kbd>Intro</kbd> para seguir</span></div>`;
          const last = st.i + 1 >= o.total;
          const nb = h('button', 'btn primary next', last ? `Ver resultado ${icon('arrow-right')}` : `Siguiente ${icon('arrow-right')}`);
          nb.type = 'button';
          nb.onclick = () => { st.i++; step(); };
          fb.querySelector('.fb-foot').appendChild(nb);
          setTimeout(() => fb.scrollIntoView({ behavior: PK.reduceMotion() ? 'auto' : 'smooth', block: 'nearest' }), 60);
          nb.focus({ preventScroll: true });
        }
      };
      try { G.render(body, q, ui); } catch (err) { console.error(err); body.innerHTML = '<p class="muted">No se ha podido generar este ejercicio. Pasa al siguiente.</p>'; }
      if (o.mode === 'game' && S.settings.timer) {
        const total = 30; timeLeft = total;
        const bar = $('.timer i', head), track = $('.timer', head);
        timerId = setInterval(() => {
          timeLeft -= 0.25;
          if (bar) bar.style.transform = `scaleX(${Math.max(0, timeLeft / total)})`;
          if (track) track.classList.toggle('low', timeLeft <= 8);
          if (timeLeft <= 0) { timeLeft = 0; body.classList.add('locked'); ui.answer(false, 'Se ha acabado el tiempo. Si prefieres pensar con calma, desactiva el contrarreloj.'); }
        }, 250);
      }
    };
    const finish = () => {
      clearInterval(timerId);
      const total = o.total, p = total ? st.right / total : 0;
      const res = o.onEnd ? o.onEnd(st, p) : {};
      const tone = p >= 0.8 ? '' : p >= 0.5 ? 'warn' : 'bad';
      el.innerHTML = `<div class="summary">
        <div class="ring-wrap">${UI.ring(p, tone)}<div class="ring-num"><span data-count="${Math.round(p * 100)}" data-suffix=" %">${Math.round(p * 100)} %</span></div></div>
        <h2>${res.title || 'Ronda terminada'}</h2>
        <div class="summary-stats"><div><b>${st.right}/${total}</b><span>aciertos</span></div>${o.mode === 'game' ? `<div><b data-count="${st.score}">${fmt(st.score)}</b><span>puntos</span></div><div><b>${st.best}</b><span>mejor racha</span></div>` : ''}</div>
        ${res.html || ''}
        <div class="row-btns">${res.buttons || ''}</div></div>`;
      UI.countUp(el);
    };
    const keys = e => {
      if (!document.body.contains(el) || document.getElementById('modal') || (e.target.matches && e.target.matches('input, textarea, select'))) return;
      if (e.key === 'Enter') {
        const nb = el.querySelector('.feedback.show .next') || el.querySelector('.q-body > .btn.primary:not(:disabled)');
        if (nb) { e.preventDefault(); nb.click(); }
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const b = el.querySelectorAll('.q-body .choices .choice')[+e.key - 1];
        if (b && !b.disabled) { e.preventDefault(); b.click(); }
      }
    };
    document.addEventListener('keydown', keys);
    step();
    return { stop() { clearInterval(timerId); document.removeEventListener('keydown', keys); } };
  }

  // ================================================================ pantallas
  const pages = {};
  let cleanup = null;

  pages.home = el => {
    const d = PK.daily(), n = nextStep();
    const badges = Object.keys(S.badges).length;
    const first = !S.xp && !Object.keys(S.lessonsDone).length;
    const date = cap(new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
    const dailyHref = d.type === 'game' ? '#/juego/' + d.game : d.type === 'lesson' ? (n ? n.href : '#/curso') : '#/mesa';
    let cont;
    if (!n) {
      cont = `<article class="panel continue"><div class="continue-top"><div><p class="eyebrow">Curso completado</p><h2>Has superado los seis niveles</h2><p class="muted">Ponte a prueba en la mesa sin ayudas o vuelve a los escenarios guiados.</p></div></div>
        <div class="cta-row"><a class="btn primary" href="#/mesa">Ir a la mesa ${icon('arrow-right')}</a><a class="btn ghost" href="#/escenarios">Escenarios</a></div></article>`;
    } else {
      const done = lessonsDone(n.L), tot = n.L.lessons.length;
      cont = `<article class="panel continue">
        <div class="continue-top">${UI.levelChip(n.L.id, 'lg')}<div><p class="eyebrow">Nivel ${n.L.id} · ${n.L.title}</p><h2>${n.title}</h2><p class="muted">${n.meta}</p></div></div>
        <div class="continue-progress"><div class="bar"><i style="width:${done / tot * 100}%"></i></div><span class="num">${done}/${tot} lecciones</span></div>
        <div class="cta-row"><a class="btn primary" href="${n.href}">${n.cta} ${icon('arrow-right')}</a><a class="btn ghost" href="#/nivel/${n.L.id}">Ver el nivel</a></div>
        <div class="continue-art" aria-hidden="true">${PK.parseCards(ART[n.L.id]).map(c => UI.card(c)).join('')}</div>
      </article>`;
    }
    el.innerHTML = `
      ${pageHead(first ? 'Bienvenido a la Escuela de Póker' : 'Hola de nuevo', first ? 'Aprende Texas Hold\'em No Limit desde cero: lecciones de pocos minutos, ejercicios con puntuación y partidas contra bots con un entrenador que explica cada decisión.' : 'Sigue con el curso o entrena una habilidad concreta.', {
        eyebrow: date,
        aside: `<div class="head-stats"><div class="stat-inline"><b data-count="${S.xp}">${fmt(S.xp)}</b><span>XP · nivel ${PK.playerLevel(S.xp)}</span></div><div class="stat-inline"><b data-count="${S.days.streak || 0}">${S.days.streak || 0}</b><span>días de racha</span></div><div class="stat-inline"><b data-count="${badges}">${badges}</b><span>de ${Object.keys(PK.BADGES).length} insignias</span></div></div>`
      })}
      ${!S.placementDone && S.unlocked === 1 ? `<div class="notice">${icon('compass')}<div><b>¿Ya sabes jugar?</b> Haz el test inicial de 12 preguntas y empieza en el nivel que te corresponde.</div><a class="btn small" href="#/test">Hacer el test</a></div>` : ''}
      <section class="grid grid-2">
        ${cont}
        <article class="panel daily${d.done ? ' done' : ''}">
          <div class="daily-head">${icon('calendar')}<span>Reto diario</span><span class="pill pill-brass">+50 XP</span></div>
          <p class="daily-text">${d.text}</p>
          <div class="daily-prog"><div class="bar brass"><i style="width:${Math.min(100, d.progress / d.target * 100)}%"></i></div><span class="num">${d.progress}/${d.target}</span></div>
          ${d.done ? `<p class="daily-done">${icon('check')} Completado. Mañana tendrás otro.</p>` : `<a class="btn" href="${dailyHref}">Empezar</a>`}
        </article>
      </section>
      <section class="section">
        <div class="sec-head"><h2>Curso</h2><a class="link" href="#/curso">Ver el temario completo</a></div>
        ${courseList()}
      </section>
      <section class="section">
        <div class="sec-head"><h2>Practicar</h2></div>
        <div class="tiles stagger">
          ${linkTile('#/mesa', 'table', 'Mesa contra bots', 'Cash o torneo, de 2 a 6 jugadores, con el entrenador si lo quieres.')}
          ${linkTile('#/escenarios', 'flag', 'Escenarios guiados', 'Situaciones preparadas para practicar un concepto concreto.')}
          ${linkTile('#/errores', 'refresh', 'Repasa tus errores', 'Vuelve a los ejercicios que fallaste.', `<span>${plural(S.mistakes.length, 'pendiente')}</span>`)}
          ${linkTile('#/historial', 'history', 'Historial de manos', 'Repite tus últimas manos paso a paso con todas las cartas.', `<span>${plural(S.history.length, 'mano')}</span>`)}
        </div>
      </section>`;
  };
  function courseList() {
    return `<div class="course stagger">${PK.LEVELS.map(L => {
      const st = levelState(L), done = lessonsDone(L), tot = L.lessons.length;
      return `<a class="course-row ${st}" href="#/nivel/${L.id}">
        ${UI.levelChip(L.id)}
        <span class="cr-main"><b>${L.title}</b><small>${L.intro}</small></span>
        <span class="cr-prog"><span class="bar"><i style="width:${done / tot * 100}%"></i></span><span class="num">${done}/${tot}</span></span>
        <span class="cr-state">${STATE_PILL[st]}</span>
        ${icon('chevron-right', 'go')}
      </a>`;
    }).join('')}</div>`;
  }

  pages.course = el => {
    el.innerHTML = `${pageHead('Curso', 'Seis niveles, de las reglas a la gestión del riesgo. Cada nivel termina con un examen: con un 80 % de aciertos se desbloquea el siguiente, y los niveles superados se pueden repetir.')}
      ${!S.placementDone && S.unlocked === 1 ? `<div class="notice">${icon('compass')}<div><b>¿Ya tienes experiencia?</b> El test inicial desbloquea los niveles que ya dominas.</div><a class="btn small" href="#/test">Hacer el test</a></div>` : ''}
      <div class="syllabus stagger">${PK.LEVELS.map(L => {
        const st = levelState(L), locked = st === 'locked';
        const best = S.examBest[L.id];
        return `<article class="panel syl ${st}">
          <header class="syl-head">${UI.levelChip(L.id, 'lg')}<div><p class="eyebrow">Nivel ${L.id}</p><h2>${L.title}</h2><p class="muted">${L.intro}</p></div>${STATE_PILL[st]}</header>
          <div class="syl-body">
            <ol class="syl-lessons">${L.lessons.map((ls, i) => {
              const done = S.lessonsDone[L.id + '-' + ls.id];
              const tick = `<span class="tick">${done ? icon('check') : i + 1}</span>`;
              return `<li class="${done ? 'done' : ''}">${tick}${locked ? `<span>${ls.title}</span>` : `<a href="#/leccion/${L.id}/${ls.id}">${ls.title}</a>`}</li>`;
            }).join('')}<li>${`<span class="tick">${icon('exam')}</span>`}${locked ? '<span>Examen final</span>' : `<a href="#/examen/${L.id}">Examen final</a>`}${best != null ? `<span class="num muted">${pct(best)}</span>` : ''}</li></ol>
            ${locked ? '' : `<a class="btn small" href="#/nivel/${L.id}">Abrir el nivel ${icon('arrow-right')}</a>`}
          </div>
        </article>`;
      }).join('')}</div>`;
  };

  pages.level = (el, [n]) => {
    const L = levelById(n);
    if (!L) return go('#/');
    if (!isUnlocked(L.id)) {
      el.innerHTML = crumbs([['Curso', '#/curso'], ['Nivel ' + L.id]]) + emptyState('lock', `Nivel ${L.id}: ${L.title}`, `Aprueba el examen del nivel ${L.id - 1} con al menos un 80 % para desbloquearlo, o haz el test inicial si ya sabes jugar.`,
        `<a class="btn primary" href="#/nivel/${L.id - 1}">Ir al nivel ${L.id - 1}</a><a class="btn" href="#/test">Test inicial</a>`);
      return;
    }
    const done = lessonsDone(L), tot = L.lessons.length, st = levelState(L), best = S.examBest[L.id];
    const scen = (L.practice.scenarios || []).map(id => [id, PK.SCENARIOS[id]]);
    el.innerHTML = `${crumbs([['Curso', '#/curso'], ['Nivel ' + L.id]])}
      <header class="level-head">${UI.levelChip(L.id, 'xl')}<div>
        <p class="eyebrow">Nivel ${L.id} ${STATE_PILL[st]}</p><h1>${L.title}</h1><p class="lead">${L.intro}</p>
        <div class="level-meta"><span>${icon('book')}${plural(tot, 'lección', 'lecciones')} · ${done} hechas</span><span>${icon('target')}${plural(L.games.length, 'minijuego')}</span><span>${icon('exam')}Examen de ${L.exam.length} preguntas</span></div>
      </div></header>
      <div class="level-grid">
        <section>
          <div class="sec-head"><h2>Lecciones</h2><span class="num muted">${done}/${tot}</span></div>
          <div class="rows stagger">${L.lessons.map((ls, i) => {
            const ok = S.lessonsDone[L.id + '-' + ls.id], qs = ls.steps.filter(s => s.q).length;
            return `<a class="row" href="#/leccion/${L.id}/${ls.id}"><span class="step-num${ok ? ' done' : ''}">${ok ? icon('check') : i + 1}</span><span class="row-main"><b>${ls.title}</b><small>${plural(ls.steps.length, 'paso')} · ${plural(qs, 'pregunta')}</small></span>${icon('chevron-right', 'go')}</a>`;
          }).join('')}</div>
        </section>
        <section>
          <div class="sec-head"><h2>Minijuegos</h2></div>
          <div class="tiles one-col stagger">${L.games.map(gameTile).join('')}</div>
          <div class="sec-head"><h2>Partida de práctica</h2></div>
          <div class="rows stagger">${scen.map(([id, s]) => `<a class="row" href="#/escenario/${id}"><span class="row-ic">${icon('flag')}</span><span class="row-main"><b>${s.title}</b><small>${s.goal}</small></span>${icon('chevron-right', 'go')}</a>`).join('')}
            <a class="row" href="#/mesa/${L.id}"><span class="row-ic">${icon('table')}</span><span class="row-main"><b>${L.practice.free.label}</b><small>Con el entrenador activado para aplicar lo aprendido</small></span>${icon('chevron-right', 'go')}</a></div>
        </section>
      </div>
      <section class="panel exam-panel">
        <div class="exam-info"><span class="exam-ic">${icon('exam')}</span><div><h2>Examen final</h2><p class="muted">${L.exam.length} preguntas. Necesitas un 80 % para ${L.id < 6 ? `desbloquear el nivel ${L.id + 1}` : 'completar el curso'}.</p></div></div>
        ${best != null ? `<div class="exam-score"><b class="${best >= 0.8 ? 'pos' : ''}">${pct(best)}</b><small>tu mejor nota</small></div>` : ''}
        <a class="btn primary" href="#/examen/${L.id}">${S.passed[L.id] ? 'Repetir el examen' : 'Empezar el examen'} ${icon('arrow-right')}</a>
      </section>`;
  };

  pages.lesson = (el, [n, id]) => {
    const L = levelById(n);
    const ls = L && L.lessons.find(x => x.id === id);
    if (!ls || !isUnlocked(L.id)) return go('#/nivel/' + n);
    const total = ls.steps.length;
    el.innerHTML = `${crumbs([['Curso', '#/curso'], ['Nivel ' + L.id, '#/nivel/' + L.id], [ls.title]])}
      <div class="lesson">
        <header class="lesson-head"><h1>${ls.title}</h1><span class="num muted" data-step></span></header>
        <div class="lesson-steps" style="--n:${total}">${ls.steps.map(() => '<i></i>').join('')}</div>
        <div class="lesson-slot"></div>
        <div class="lesson-nav"></div>
      </div>`;
    const slot = $('.lesson-slot', el), nav = $('.lesson-nav', el);
    let k = 0, dir = 'next';
    const draw = () => {
      const s = ls.steps[k];
      $('[data-step]', el).textContent = `Paso ${k + 1} de ${total}`;
      el.querySelectorAll('.lesson-steps i').forEach((b, i) => { b.className = i < k ? 'done' : i === k ? 'on' : ''; });
      const cardEl = h('article', `lesson-card enter-${dir}`, `<div class="lesson-text">${UI.rich(s.x)}</div>`);
      const vis = UI.visual(s.v);
      if (vis) { const fig = h('div', 'figure'); fig.appendChild(vis); cardEl.appendChild(fig); }
      if (s.q) {
        const qz = h('div', 'quiz', `<div class="quiz-label">${icon('check')}Comprueba que lo has entendido</div>`);
        const fb = h('section', 'feedback');
        PK.GAMES.mcq.render(qz, s.q, {
          answer(ok, html) {
            fb.className = 'feedback show ' + (ok ? 'ok' : 'ko');
            fb.innerHTML = `<div class="fb-head">${icon(ok ? 'check' : 'x')}<span>${ok ? 'Correcto' : 'No es esa'}</span></div><div class="fb-body">${html}</div>`;
            PK.Sound.play(ok ? 'right' : 'wrong');
            if (ok) PK.addXP(2);
            const nb = $('[data-n=next]', nav); nb.disabled = false; nb.focus({ preventScroll: true });
          }
        });
        qz.appendChild(fb);
        cardEl.appendChild(qz);
      }
      slot.replaceChildren(cardEl);
      const lastStep = k === total - 1;
      nav.innerHTML = `${k > 0 ? `<button type="button" class="btn" data-n="prev">${icon('arrow-left')} Anterior</button>` : '<span></span>'}
        <button type="button" class="btn primary" data-n="next" ${s.q ? 'disabled' : ''}>${lastStep ? `Terminar la lección ${icon('check')}` : `Siguiente ${icon('arrow-right')}`}</button>`;
    };
    nav.addEventListener('click', e => {
      const b = e.target.closest('[data-n]'); if (!b || b.disabled) return;
      if (b.dataset.n === 'prev') { k--; dir = 'prev'; draw(); return; }
      if (k < total - 1) { k++; dir = 'next'; draw(); root.scrollTo({ top: 0, behavior: PK.reduceMotion() ? 'auto' : 'smooth' }); return; }
      const key = L.id + '-' + ls.id, firstTime = !S.lessonsDone[key];
      S.lessonsDone[key] = true;
      PK.award('primerPaso');
      PK.dailyProgress('lesson');
      PK.addXP(firstTime ? 20 : 5);
      const nextL = L.lessons[L.lessons.indexOf(ls) + 1];
      el.innerHTML = `${crumbs([['Curso', '#/curso'], ['Nivel ' + L.id, '#/nivel/' + L.id], [ls.title]])}
        <div class="panel done-panel"><span class="done-check">${icon('check')}</span><h2>Lección completada</h2><p class="muted">${ls.title} · +${firstTime ? 20 : 5} XP</p>
        <div class="row-btns">${nextL ? `<a class="btn primary" href="#/leccion/${L.id}/${nextL.id}">Siguiente: ${nextL.title} ${icon('arrow-right')}</a>` : `<a class="btn primary" href="#/juego/${L.games[0]}">Practicar con «${PK.GAMES[L.games[0]].title}» ${icon('arrow-right')}</a>`}<a class="btn" href="#/nivel/${L.id}">Volver al nivel</a></div></div>`;
    });
    draw();
  };

  pages.games = el => {
    el.innerHTML = pageHead('Entrenamiento', 'Rondas de 10 ejercicios con dificultad progresiva. Puedes pedir una pista o activar el contrarreloj. Responde con las teclas 1–4 e <kbd>Intro</kbd>.') +
      PK.LEVELS.map(L => {
        const ids = Object.keys(PK.GAMES).filter(g => !PK.GAMES[g].hidden && PK.gameLevel(g) === L.id);
        if (!ids.length) return '';
        return `<section class="section"><div class="sec-head"><h2>Nivel ${L.id} · ${L.title}</h2></div><div class="tiles stagger">${ids.map(gameTile).join('')}</div></section>`;
      }).join('');
  };

  pages.game = (el, [id]) => {
    const G = PK.GAMES[id];
    if (!G || G.hidden) return go('#/minijuegos');
    if (PK.gameLevel(id) > S.unlocked) {
      el.innerHTML = crumbs([['Entrenamiento', '#/minijuegos'], [G.title]]) + emptyState('lock', G.title, `Se desbloquea al llegar al nivel ${PK.gameLevel(id)}.`, '<a class="btn" href="#/minijuegos">Volver al entrenamiento</a>');
      return;
    }
    if (G.tool) {
      el.innerHTML = `${crumbs([['Entrenamiento', '#/minijuegos'], [G.title]])}${pageHead(G.title, G.desc)}<div id="tool"></div>`;
      PK.renderRiskSim($('#tool', el));
      return;
    }
    el.innerHTML = crumbs([['Entrenamiento', '#/minijuegos'], [G.title]]);
    const wrap = h('div');
    el.appendChild(wrap);
    const r = runner(wrap, {
      title: G.title, total: 10, mode: 'game',
      getItem(i) { const d = i < 3 ? 1 : i < 7 ? 2 : 3; return { game: id, d, q: G.gen(d) }; },
      onAnswer(item, ok) { PK.recordGame(id, ok, ok ? null : item.q); },
      onEnd(st) {
        const g = S.games[id]; g.plays = (g.plays || 0) + 1;
        const record = st.score > (g.best || 0); if (record) g.best = st.score;
        PK.addXP(Math.round(st.score / 3));
        PK.save();
        return { title: record ? 'Nuevo récord' : 'Ronda terminada', html: `<p>${G.desc}</p>`, buttons: `<a class="btn primary" href="#/juego/${id}?r=${Date.now()}">Jugar otra ronda ${icon('refresh')}</a><a class="btn" href="#/minijuegos">Otros ejercicios</a>` };
      }
    });
    cleanup = () => r.stop();
  };

  pages.exam = (el, [n]) => {
    const L = levelById(n);
    if (!L || !isUnlocked(L.id)) return go('#/curso');
    const need = Math.ceil(L.exam.length * 0.8);
    el.innerHTML = `${crumbs([['Curso', '#/curso'], ['Nivel ' + L.id, '#/nivel/' + L.id], ['Examen']])}
      <div class="summary">${UI.levelChip(L.id, 'xl')}<p class="eyebrow">Nivel ${L.id} · ${L.title}</p><h1>Examen final</h1>
      <p>${L.exam.length} preguntas. Necesitas ${need} aciertos (80 %) para ${L.id < 6 ? `desbloquear el nivel ${L.id + 1}` : 'completar el curso'}. No hay pistas ni contrarreloj.</p>
      <div class="row-btns"><button type="button" class="btn primary big" data-go>Empezar ${icon('arrow-right')}</button><a class="btn big" href="#/nivel/${L.id}">Volver al nivel</a></div></div>`;
    $('[data-go]', el).onclick = () => {
      el.innerHTML = crumbs([['Curso', '#/curso'], ['Nivel ' + L.id, '#/nivel/' + L.id], ['Examen']]);
      const wrap = h('div'); el.appendChild(wrap);
      const items = PK.shuffle(L.exam.map(it => it.game ? { game: it.game, d: it.d, q: PK.GAMES[it.game].gen(it.d) } : { game: 'mcq', q: it }));
      const r = runner(wrap, {
        title: `Examen · Nivel ${L.id}`, total: items.length, mode: 'exam',
        getItem: i => items[i],
        onAnswer(item, ok) {
          if (item.game !== 'mcq') PK.recordGame(item.game, ok, ok ? null : item.q);
          else if (!ok) { S.mistakes.unshift({ game: 'mcq', q: item.q, ts: Date.now() }); PK.save(); UI.updateHeader(); }
        },
        onEnd(st, p) {
          S.examBest[L.id] = Math.max(S.examBest[L.id] || 0, p);
          const pass = p >= 0.8;
          if (pass) {
            const firstPass = !S.passed[L.id];
            S.passed[L.id] = true;
            if (L.id < 6) S.unlocked = Math.max(S.unlocked, L.id + 1);
            PK.award('primerExamen');
            if (PK.LEVELS.every(l => S.passed[l.id])) PK.award('maestro');
            PK.addXP(firstPass ? 100 : 20);
          }
          PK.save();
          return pass
            ? { title: 'Examen aprobado', html: L.id < 6 ? `<p>Has desbloqueado el nivel ${L.id + 1}: <b>${levelById(L.id + 1).title}</b>.</p>` : '<p>Has completado los seis niveles. Ahora toca aplicarlo en la mesa.</p>', buttons: L.id < 6 ? `<a class="btn primary" href="#/nivel/${L.id + 1}">Ir al nivel ${L.id + 1} ${icon('arrow-right')}</a><a class="btn" href="#/nivel/${L.id}">Volver</a>` : `<a class="btn primary" href="#/mesa">Ir a la mesa ${icon('arrow-right')}</a>` }
            : { title: 'Todavía no', html: `<p>Necesitas ${need} aciertos. Repasa las lecciones o entrena con los minijuegos del nivel y vuelve a intentarlo.</p>`, buttons: `<a class="btn primary" href="#/examen/${L.id}?r=${Date.now()}">Repetir el examen ${icon('refresh')}</a><a class="btn" href="#/errores">Repasar errores</a><a class="btn" href="#/nivel/${L.id}">Volver al nivel</a>` };
        }
      });
      cleanup = () => r.stop();
    };
  };

  pages.errors = el => {
    if (!S.mistakes.length) {
      el.innerHTML = pageHead('Repasa tus errores', '') + emptyState('check', 'No tienes errores pendientes', 'Cuando falles un ejercicio aparecerá aquí para que lo vuelvas a intentar.', '<a class="btn primary" href="#/minijuegos">Ir al entrenamiento</a>');
      return;
    }
    const byGame = {};
    S.mistakes.forEach(m => { byGame[m.game] = (byGame[m.game] || 0) + 1; });
    el.innerHTML = `${pageHead('Repasa tus errores', `Tienes ${plural(S.mistakes.length, 'ejercicio fallado', 'ejercicios fallados')}. Cada uno que resuelvas sale de la lista.`)}
      <div class="rows stagger">${Object.entries(byGame).sort((a, b) => b[1] - a[1]).map(([g, c]) => `<div class="row static"><span class="row-ic">${icon(g === 'mcq' ? 'exam' : PK.GAMES[g].icon)}</span><span class="row-main"><b>${g === 'mcq' ? 'Preguntas de lecciones y exámenes' : PK.GAMES[g].title}</b></span><span class="num muted">${c}</span></div>`).join('')}</div>
      <div class="row-btns" style="justify-content:flex-start;margin-top:18px"><button type="button" class="btn primary big" data-go>Empezar el repaso ${icon('arrow-right')}</button></div>`;
    $('[data-go]', el).onclick = () => {
      el.innerHTML = crumbs([['Repaso', '#/errores'], ['En curso']]);
      const list = S.mistakes.slice(0, 10);
      const wrap = h('div'); el.appendChild(wrap);
      const r = runner(wrap, {
        title: 'Repaso de errores', total: list.length, mode: 'review',
        getItem: i => ({ game: list[i].game, q: list[i].q, ts: list[i].ts }),
        onAnswer(item, ok) {
          if (ok) {
            S.mistakes = S.mistakes.filter(m => m.ts !== item.ts);
            if (++S.counters.reviewSolved >= 5) PK.award('repaso');
            PK.addXP(5);
          }
          if (item.game !== 'mcq') { const g = S.games[item.game] = S.games[item.game] || { right: 0, wrong: 0, best: 0 }; if (ok) g.right++; else g.wrong++; }
          PK.save(); UI.updateHeader();
        },
        onEnd() { return { title: 'Repaso terminado', html: `<p>${S.mistakes.length ? `Quedan ${plural(S.mistakes.length, 'ejercicio')} por repasar.` : 'Has vaciado la lista de errores.'}</p>`, buttons: `${S.mistakes.length ? `<a class="btn primary" href="#/errores?r=${Date.now()}">Seguir repasando</a>` : ''}<a class="btn" href="#/">Ir al inicio</a>` }; }
      });
      cleanup = () => r.stop();
    };
  };

  pages.placement = el => {
    el.innerHTML = `${crumbs([['Curso', '#/curso'], ['Test inicial']])}
      <div class="summary"><span class="empty-ic">${icon('compass')}</span><h1>Test inicial</h1><p>12 preguntas de los niveles 1 a 4. Si aciertas todas las de un nivel, lo damos por superado y empiezas en el siguiente. Siempre podrás repetirlos.</p>
      <div class="row-btns"><button type="button" class="btn primary big" data-go>Empezar ${icon('arrow-right')}</button><a class="btn big" href="#/">Ahora no</a></div></div>`;
    $('[data-go]', el).onclick = () => {
      el.innerHTML = crumbs([['Curso', '#/curso'], ['Test inicial']]);
      const wrap = h('div'); el.appendChild(wrap);
      const items = PK.PLACEMENT.map(q => ({ game: 'mcq', q, lvl: q.lvl }));
      const r = runner(wrap, {
        title: 'Test inicial', total: items.length, mode: 'exam', getItem: i => items[i],
        onEnd(st) {
          let start = 1;
          for (let l = 1; l <= 4; l++) {
            const of = st.results.filter(x => x.item.lvl === l);
            if (of.length && of.every(x => x.correct)) start = l + 1; else break;
          }
          S.placementDone = true;
          if (start > S.unlocked) {
            for (let l = 1; l < start; l++) S.passed[l] = S.passed[l] || 'test';
            S.unlocked = start;
          }
          PK.save();
          return { title: start > 1 ? `Empiezas en el nivel ${start}` : 'Empieza por los fundamentos', html: `<p>${start > 1 ? `Dominas los niveles 1 a ${start - 1}. Puedes repasarlos cuando quieras.` : 'Para saltar un nivel hay que acertar todas sus preguntas. El nivel 1 te pondrá al día enseguida.'}</p>`, buttons: `<a class="btn primary" href="#/nivel/${start}">Ir al nivel ${start} ${icon('arrow-right')}</a>` };
        }
      });
      cleanup = () => r.stop();
    };
  };

  // ---------------------------------------------------------------- mesa
  const HANDS_PER_LEVEL = 6;
  pages.setup = (el, [lvl]) => {
    const L = lvl ? levelById(lvl) : null;
    const pre = L ? L.practice.free : null;
    const n0 = pre ? pre.players : 6;
    const profs = Object.entries(PK.PROFILES);
    el.innerHTML = `${L ? crumbs([['Curso', '#/curso'], ['Nivel ' + L.id, '#/nivel/' + L.id], ['Práctica']]) : ''}
      ${pageHead('Mesa de práctica', pre ? `Práctica del nivel ${L.id}: ${pre.label}.` : 'Juega Texas Hold\'em No Limit contra bots con fichas ficticias. Con el entrenador activado verás tu equity, las pot odds y una valoración de cada decisión.')}
      <form class="setup-grid" id="setup-form">
        <section class="panel form-sec">
          <h2>Formato</h2>
          <div class="mode-cards">
            <label class="mode-card"><input type="radio" name="mode" value="cash" ${pre && pre.tournament ? '' : 'checked'}><span><b>Cash</b><small>Ciegas fijas y sin recompras: la partida termina si te quedas sin fichas.</small></span></label>
            <label class="mode-card"><input type="radio" name="mode" value="tour" ${pre && pre.tournament ? 'checked' : ''}><span><b>Torneo</b><small>Las ciegas suben cada ${HANDS_PER_LEVEL} manos. Gana quien se quede con todas las fichas.</small></span></label>
          </div>
          <div class="field"><span>Jugadores en la mesa</span><div class="seg" id="n-seg" role="group" aria-label="Jugadores">${[2, 3, 4, 5, 6].map(k => `<button type="button" data-n="${k}" class="${k === n0 ? 'on' : ''}" aria-pressed="${k === n0}">${k}</button>`).join('')}</div></div>
          <div class="field-row">
            <label class="field"><span>Fichas iniciales</span><select name="stack" id="f-stack">${[500, 1000, 2000, 5000].map(v => `<option value="${v}" ${v === 1000 ? 'selected' : ''}>${fmt(v)}</option>`).join('')}</select></label>
            <label class="field"><span>Ciegas (cash)</span><select name="blinds" id="f-blinds"><option value="5/10" selected>5 / 10</option><option value="10/20">10 / 20</option><option value="25/50">25 / 50</option></select></label>
          </div>
        </section>
        <section class="panel form-sec">
          <h2>Rivales</h2>
          <div class="bots" id="bots"></div>
          <p class="muted tiny">Los bots deciden según la fuerza de su mano, su posición, el tamaño del bote y algo de azar. Nunca ven tus cartas y juegan algo mejor a medida que avanzas en el curso.</p>
        </section>
        <section class="panel" style="grid-column:1/-1">
          <label class="setting"><span><b>Modo entrenador</b><small>Fuerza de tu mano, equity estimada, pot odds, medidor de riesgo y valoración de cada decisión. Sin él juegas sin ayudas, pero la revisión de la mano sigue valorando tus decisiones.</small></span><input type="checkbox" class="toggle" name="coach" id="f-coach" ${S.settings.coach ? 'checked' : ''}></label>
        </section>
        <div class="form-actions"><button type="button" class="btn primary big" id="go">Sentarse a jugar ${icon('arrow-right')}</button></div>
      </form>
      <section class="section"><div class="sec-head"><h2>Perfiles de los bots</h2></div>
        <div class="rows stagger">${profs.map(([k, p]) => `<div class="row static">${UI.avatar(p.name)}<span class="row-main"><b>${p.name}</b><small>${p.desc}</small></span><span class="pill">${p.style}</span><span class="profile-tag">${p.open == null ? 'Abre según posición' : `Abre ≈ ${Math.round(p.open * 100)} %`}</span></div>`).join('')}</div>
      </section>`;
    $('form', el).addEventListener('submit', e => e.preventDefault());
    let n = n0;
    const drawBots = () => {
      $('#bots', el).innerHTML = Array.from({ length: n - 1 }, (_, i) => {
        const def = pre && pre.bots[i] ? pre.bots[i] : 'random';
        return `<label class="bot-sel">Asiento ${i + 2}<select data-b="${i}" id="f-bot-${i}"><option value="random" ${def === 'random' ? 'selected' : ''}>Al azar</option>${profs.map(([k, p]) => `<option value="${k}" ${def === k ? 'selected' : ''}>${p.name} · ${p.style}</option>`).join('')}</select></label>`;
      }).join('');
    };
    drawBots();
    $('#n-seg', el).onclick = e => {
      const b = e.target.closest('[data-n]'); if (!b) return;
      n = +b.dataset.n;
      el.querySelectorAll('#n-seg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      drawBots();
    };
    $('#go', el).onclick = () => {
      const f = $('form', el);
      const [sb, bb] = f.blinds.value.split('/').map(Number);
      S.settings.coach = f.coach.checked; PK.save();
      PK.pendingCfg = { players: n, bots: [...el.querySelectorAll('[data-b]')].map(s => s.value), stack: +f.stack.value, sb, bb, tournament: f.mode.value === 'tour' };
      go('#/jugar');
    };
  };

  pages.scenarios = el => {
    el.innerHTML = pageHead('Escenarios guiados', 'Situaciones preparadas para practicar un concepto concreto con el entrenador: un proyecto de color, una c-bet, un all-in con stack corto…') +
      `<div class="rows stagger">${Object.entries(PK.SCENARIOS).map(([id, s]) => {
        const locked = s.level > S.unlocked;
        return `<a class="row${locked ? ' locked' : ''}" href="#/escenario/${id}">${UI.levelChip(s.level, 'sm')}<span class="row-main"><b>${s.title}</b><small>${locked ? `Disponible en el nivel ${s.level}` : s.desc}</small></span>${icon(locked ? 'lock' : 'chevron-right', 'go')}</a>`;
      }).join('')}</div>`;
  };
  pages.scenario = (el, [id]) => {
    const sc = PK.SCENARIOS[id];
    if (!sc) return go('#/escenarios');
    if (sc.level > S.unlocked) {
      el.innerHTML = crumbs([['Escenarios', '#/escenarios'], [sc.title]]) + emptyState('lock', sc.title, `Disponible al llegar al nivel ${sc.level}.`, '<a class="btn" href="#/escenarios">Volver</a>');
      return;
    }
    const street = { flop: 'Flop', turn: 'Turn', river: 'River' }[sc.startStreet] || 'Preflop';
    el.innerHTML = `${crumbs([['Escenarios', '#/escenarios'], [sc.title]])}
      <div class="summary">${UI.levelChip(sc.level, 'lg')}<p class="eyebrow">Escenario · nivel ${sc.level}</p><h1>${sc.title}</h1><p>${sc.desc}</p>
      <div class="summary-stats"><div><b>${sc.players.length}</b><span>jugadores</span></div><div><b>${sc.sb}/${sc.bb}</b><span>ciegas</span></div><div><b>${street}</b><span>empieza en</span></div></div>
      <p class="goal">${icon('target')}<span><b>Objetivo:</b> ${sc.goal}</span></p>
      <div class="row-btns"><button type="button" class="btn primary big" data-go>Jugar el escenario ${icon('arrow-right')}</button></div></div>`;
    $('[data-go]', el).onclick = () => { PK.pendingCfg = { scenario: id }; go('#/jugar'); };
  };

  pages.play = el => {
    const cfg = PK.pendingCfg;
    if (!cfg) return go('#/mesa');
    el.classList.add('wide');
    el.innerHTML = `<div class="play-bar"><a class="btn ghost small" href="${cfg.scenario ? '#/escenarios' : '#/mesa'}">${icon('arrow-left')} Salir</a><span class="grow"></span>
      <label class="coach-switch"><input type="checkbox" class="toggle" id="coach-t" ${S.settings.coach ? 'checked' : ''}> Entrenador</label>
      <a class="btn small" href="#/historial">${icon('history')} Historial</a></div><div id="table"></div>`;
    $('#coach-t', el).onchange = e => { S.settings.coach = e.target.checked; PK.save(); PK.Play.render(); };
    PK.Play.start($('#table', el), cfg);
    cleanup = () => { PK.Play.stop(); el.classList.remove('wide'); };
  };

  pages.history = el => {
    if (!S.history.length) {
      el.innerHTML = pageHead('Historial de manos', '') + emptyState('cards', 'Todavía no has jugado ninguna mano', 'Cada mano que juegues en la mesa se guarda aquí para que puedas repetirla paso a paso.', '<a class="btn primary" href="#/mesa">Ir a la mesa</a>');
      return;
    }
    el.innerHTML = pageHead('Historial de manos', `Tus últimas ${S.history.length} manos. Ábrelas para repetirlas paso a paso con todas las cartas descubiertas y tus decisiones valoradas.`) +
      `<div class="hist">
        <div class="hist-row head"><span>Mano</span><span>Tus cartas</span><span>Resultado</span><span>Tus decisiones</span><span></span></div>
        ${S.history.map((r, i) => {
          const st = r.log[0], hero = st.players[r.heroSeat];
          const ds = Object.values(r.decisions || {});
          const cnt = k => ds.filter(d => d.rating === k).length;
          const pills = [['Buena', 'good'], ['Dudosa', 'warn'], ['Error', 'bad']].map(([k, c]) => cnt(k) ? `<span class="pill pill-${c}">${cnt(k)} ${k === 'Error' ? (cnt(k) > 1 ? 'errores' : 'error') : (k.toLowerCase() + (cnt(k) > 1 ? 's' : ''))}</span>` : '').join('');
          return `<button type="button" class="hist-row" data-i="${i}">
            <span class="when"><b>${r.title || 'Mano #' + st.handNo}</b><small>${new Date(r.ts).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} · ${st.players.filter(p => p.inHand).length} jugadores</small></span>
            <span class="cards-col">${UI.cards(hero.hole, { mini: true })}</span>
            <span class="net ${r.net > 0 ? 'pos' : r.net < 0 ? 'neg' : ''}">${r.net > 0 ? '+' : ''}${fmt(r.net)}</span>
            <span class="decs">${pills || '<span class="muted tiny">Sin decisiones</span>'}</span>
            ${icon('chevron-right', 'go')}
          </button>`;
        }).join('')}
      </div>`;
    el.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) PK.openReview(S.history[+b.dataset.i]); });
  };

  pages.progress = el => {
    const P = S.play, lvl = PK.playerLevel(S.xp);
    const nLessons = PK.LEVELS.reduce((s, l) => s + l.lessons.length, 0);
    const gameRows = Object.keys(PK.GAMES).filter(g => !PK.GAMES[g].hidden && !PK.GAMES[g].tool).map(g => {
      const s = S.games[g] || { right: 0, wrong: 0 }, t = s.right + s.wrong;
      return { g, t, acc: t ? s.right / t : null, wrong: s.wrong };
    });
    const topErr = gameRows.filter(r => r.wrong).sort((a, b) => b.wrong - a.wrong).slice(0, 3);
    const kinds = Object.entries(P.errorKinds || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const decisions = P.good + P.doubt + P.bad;
    const vpip = P.hands ? P.vpip / P.hands : null, pfr = P.hands ? P.pfr / P.hands : null;
    const af = P.calls ? P.bets / P.calls : (P.bets ? 5 : null);
    const gauge = (title, val, shown, max, band, unit, text) => `<article class="panel gauge">
      <div class="gauge-top"><span>${title}</span><b>${shown}</b></div>
      <div class="g-track"><span class="g-band" style="left:${band[0] / max * 100}%;width:${(band[1] - band[0]) / max * 100}%"></span>${val != null ? `<i class="g-mark" style="left:${Math.min(100, val / max * 100)}%"></i>` : ''}</div>
      <div class="g-scale"><span>0${unit}</span><span>Zona sana ${band[0]}–${band[1]}${unit}</span><span>${max}${unit}</span></div>
      <p>${text}</p></article>`;
    el.innerHTML = `${pageHead('Progreso', 'Tu avance en el curso, tus aciertos por tipo de ejercicio y tus números en la mesa.')}
      <div class="kpis stagger">
        <article class="panel kpi"><span>Nivel de jugador</span><b data-count="${lvl}">${lvl}</b><small>${fmt(S.xp)} XP · siguiente a ${fmt(PK.xpForLevel(lvl + 1))}</small></article>
        <article class="panel kpi"><span>Racha de días</span><b data-count="${S.days.streak || 0}">${S.days.streak || 0}</b><small>Mejor racha: ${S.days.best || 0}</small></article>
        <article class="panel kpi"><span>Niveles superados</span><b>${Object.keys(S.passed).length}/6</b><small>Exámenes con un 80 % o más</small></article>
        <article class="panel kpi"><span>Lecciones</span><b>${Object.keys(S.lessonsDone).length}/${nLessons}</b><small>Completadas al menos una vez</small></article>
      </div>
      <div class="grid grid-2 section">
        <section class="panel panel-pad"><div class="sec-head"><h2>Aciertos por ejercicio</h2></div>
          <div class="bars">${gameRows.map(r => `<div class="bar-row"><span>${icon(PK.GAMES[r.g].icon)}${PK.GAMES[r.g].title}</span><span class="bar"><i class="${r.acc != null && r.acc < 0.6 ? 'low' : ''}" style="width:${r.acc == null ? 0 : r.acc * 100}%"></i></span><b>${r.acc == null ? '—' : pct(r.acc)}</b></div>`).join('')}</div>
        </section>
        <section class="panel panel-pad"><div class="sec-head"><h2>Errores más frecuentes</h2></div>
          ${topErr.length || kinds.length ? `<ul class="err-list">${topErr.map(r => `<li>${icon(PK.GAMES[r.g].icon)}<span>${PK.GAMES[r.g].title}</span><span class="num">${r.wrong}</span></li>`).join('')}${kinds.map(([k, v]) => `<li>${icon('table')}<span>Mesa: ${k}</span><span class="num">${v}</span></li>`).join('')}</ul>
            <a class="btn small" href="#/errores">${icon('refresh')} Repasar (${S.mistakes.length})</a>` : '<p class="muted">Aún no hay datos. Los fallos de los ejercicios y de la mesa aparecerán aquí.</p>'}
        </section>
      </div>
      <section class="section"><div class="sec-head"><h2>En la mesa</h2><span class="muted tiny num">${plural(P.hands, 'mano jugada', 'manos jugadas')} · ${P.won} ganadas</span></div>
        <div class="gauges stagger">
          ${gauge('VPIP', vpip == null ? null : vpip * 100, vpip == null ? '—' : pct(vpip), 60, [18, 30], ' %', 'Porcentaje de manos en las que pones fichas voluntariamente. Por encima del 35 % juegas demasiadas.')}
          ${gauge('PFR', pfr == null ? null : pfr * 100, pfr == null ? '—' : pct(pfr), 60, [14, 25], ' %', 'Porcentaje de manos en las que subes antes del flop. Debería acercarse a tu VPIP.')}
          ${gauge('Agresividad', af, af == null ? '—' : (P.calls ? af.toFixed(1) : '∞'), 5, [1.5, 3.5], '', '(Apuestas + subidas) ÷ pagos después del flop. Por debajo de 1 eres pasivo.')}
        </div>
        ${decisions ? `<article class="panel panel-pad section" style="margin-top:12px"><div class="sec-head"><h2>Valoración de tus decisiones</h2><span class="num muted tiny">${decisions} decisiones</span></div>
          <div class="split-bar">${[['good', P.good], ['doubt', P.doubt], ['bad', P.bad]].filter(x => x[1]).map(([k, v]) => `<i class="s-${k}" style="width:${v / decisions * 100}%"></i>`).join('')}</div>
          <div class="split-legend" style="margin-top:10px"><span><i class="s-good" style="background:var(--good)"></i>Buenas ${pct(P.good / decisions)}</span><span><i style="background:var(--warn)"></i>Dudosas ${pct(P.doubt / decisions)}</span><span><i style="background:var(--bad)"></i>Errores ${pct(P.bad / decisions)}</span></div>
        </article>` : ''}
      </section>
      <section class="section"><div class="sec-head"><h2>Insignias</h2><span class="num muted tiny">${Object.keys(S.badges).length} de ${Object.keys(PK.BADGES).length}</span></div>
        <div class="badges stagger">${Object.entries(PK.BADGES).map(([k, b]) => `<div class="badge ${S.badges[k] ? 'on' : 'off'}" title="${b.desc}">${UI.badgeChip(k, 'lg')}<b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>
      </section>`;
  };

  pages.settings = el => {
    const s = S.settings;
    el.innerHTML = `${pageHead('Ajustes', 'Tu progreso se guarda solo en este dispositivo, sin registro.')}
      <form id="settings-form" class="grid">
        <section class="panel">
          <div class="setting plain"><span><b>Tema</b><small>«Automático» sigue la configuración de tu sistema.</small></span><div class="seg" id="theme" role="group" aria-label="Tema">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => `<button type="button" data-v="${v}" class="${s.theme === v ? 'on' : ''}" aria-pressed="${s.theme === v}">${l}</button>`).join('')}</div></div>
          <label class="setting"><span><b>Baraja de cuatro colores</b><small>Picas negras, corazones rojos, diamantes azules y tréboles verdes. ${UI.cardsInline(['As', 'Kh', 'Qd', 'Jc'].map(PK.cardFromStr))}</small></span><input type="checkbox" class="toggle" id="four" ${s.fourColor ? 'checked' : ''}></label>
          <label class="setting"><span><b>Sonido</b><small>Cartas, fichas y avisos.</small></span><input type="checkbox" class="toggle" id="snd" ${s.sound ? 'checked' : ''}></label>
          <label class="setting"><span><b>Modo entrenador en la mesa</b><small>Muestra equity, pot odds, medidor de riesgo y la valoración de cada decisión.</small></span><input type="checkbox" class="toggle" id="coach" ${s.coach ? 'checked' : ''}></label>
          <label class="setting"><span><b>Contrarreloj en el entrenamiento</b><small>30 segundos por ejercicio, con puntos extra si respondes rápido.</small></span><input type="checkbox" class="toggle" id="timer" ${s.timer ? 'checked' : ''}></label>
        </section>
        <section class="panel">
          <div class="setting plain"><span><b>Atajos de teclado</b><small>Mesa: <kbd>F</kbd> retirarse · <kbd>C</kbd> pasar o igualar · <kbd>R</kbd> subir. Ejercicios: <kbd>1</kbd>–<kbd>4</kbd> para responder e <kbd>Intro</kbd> para seguir.</small></span></div>
          <div class="setting plain"><span><b>Borrar el progreso</b><small>Elimina XP, niveles, insignias, estadísticas e historial de este dispositivo.</small></span><button type="button" class="btn danger" id="reset">Borrar todo</button></div>
        </section>
        <p class="notice">${icon('info')}<span>Aquí solo se juega con fichas ficticias. Si algún día juegas con dinero real, ponte límites y no persigas las pérdidas. En España puedes pedir ayuda en el 900 200 225 (Jugar Bien).</span></p>
      </form>`;
    $('form', el).addEventListener('submit', e => e.preventDefault());
    $('#theme', el).onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; s.theme = b.dataset.v; PK.save(); UI.applySettings(); el.querySelectorAll('#theme button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); };
    $('#four', el).onchange = e => { s.fourColor = e.target.checked; PK.save(); UI.applySettings(); };
    $('#snd', el).onchange = e => { s.sound = e.target.checked; PK.save(); UI.updateHeader(); PK.Sound.play('chip'); };
    $('#coach', el).onchange = e => { s.coach = e.target.checked; PK.save(); };
    $('#timer', el).onchange = e => { s.timer = e.target.checked; PK.save(); };
    $('#reset', el).onclick = () => {
      const body = UI.modal(`<h2>¿Borrar todo el progreso?</h2><p class="muted" style="margin:8px 0 18px">Perderás XP, niveles, insignias, estadísticas e historial de manos. No se puede deshacer.</p><div class="row-btns" style="justify-content:flex-end"><button type="button" class="btn" id="no">Cancelar</button><button type="button" class="btn danger" id="yes">Sí, borrar</button></div>`, { label: 'Borrar el progreso' });
      $('#yes', body).onclick = () => { PK.resetProgress(); UI.closeModal(); UI.toast('Progreso borrado', '', 'check'); go('#/'); };
      $('#no', body).onclick = () => UI.closeModal();
    };
  };

  // ================================================================== rutas
  const ROUTES = [
    [/^#?\/?$/, 'home', 'home'], [/^#\/curso$/, 'course', 'course'], [/^#\/nivel\/(\d)$/, 'level', 'course'],
    [/^#\/leccion\/(\d)\/([\w-]+)$/, 'lesson', 'course'], [/^#\/examen\/(\d)$/, 'exam', 'course'], [/^#\/test$/, 'placement', 'course'],
    [/^#\/minijuegos$/, 'games', 'games'], [/^#\/juego\/(\w+)$/, 'game', 'games'], [/^#\/errores$/, 'errors', 'errors'],
    [/^#\/mesa(?:\/(\d))?$/, 'setup', 'setup'], [/^#\/jugar$/, 'play', 'setup'], [/^#\/escenarios$/, 'scenarios', 'scenarios'],
    [/^#\/escenario\/(\w+)$/, 'scenario', 'scenarios'], [/^#\/historial$/, 'history', 'history'], [/^#\/progreso$/, 'progress', 'progress'],
    [/^#\/ajustes$/, 'settings', 'settings']
  ];
  // La ruta se guarda aparte del hash: así la navegación funciona también dentro de un
  // marco incrustado (por ejemplo, el visor de artefactos), donde el hash puede no cambiar.
  const isRoute = h => /^#\/?/.test(h || '') && !/^#[^/]/.test(h || '');
  let route = isRoute(location.hash) && location.hash ? location.hash : '#/';
  function go(hash) {
    route = hash;
    try {
      if (location.hash !== hash) { location.hash = hash; if (location.hash === hash) return; }
    } catch (e) { /* el entorno no deja cambiar el hash */ }
    render();
  }
  function syncNav(name) {
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === name));
    const ind = $('.nav-indicator'), on = $('.side-nav .nav-item.on');
    if (!ind) return;
    if (on) { ind.style.transform = `translateY(${on.offsetTop}px)`; ind.classList.add('on'); } else ind.classList.remove('on');
  }
  function animateView(main) {
    [...main.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 8)));
    main.querySelectorAll('.stagger').forEach(list => [...list.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 12))));
    main.classList.add('view');
    UI.countUp(main);
  }
  function render() {
    if (cleanup) { try { cleanup(); } catch (e) { /* */ } cleanup = null; }
    PK.Play.stop();
    UI.closeModal(true);
    document.querySelectorAll('.term-pop').forEach(x => x.remove());
    const hash = route.split('?')[0] || '#/';
    const main = $('#main');
    main.className = 'main';
    main.innerHTML = '';
    for (const [re, name, nav] of ROUTES) {
      const m = hash.match(re);
      if (!m) continue;
      pages[name](main, m.slice(1).filter(x => x != null));
      syncNav(nav);
      animateView(main);
      root.scrollTo(0, 0);
      UI.updateHeader();
      main.focus({ preventScroll: true });
      return;
    }
    go('#/');
  }
  root.addEventListener('hashchange', () => {
    const h = location.hash;
    if (h && !isRoute(h)) return;                   // anclas normales (p. ej. «Saltar al contenido»)
    route = h || '#/';
    render();
  });
  // Los enlaces internos navegan siempre con go(), sin depender de que el hash cambie
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute('href');
    e.preventDefault();
    if (isRoute(href)) go(href);
    else { const t = document.getElementById(href.slice(1)); if (t) t.focus(); }
  });

  // ================================================================ arranque
  function boot() {
    document.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); });
    UI.applySettings();
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'glossary') UI.openGlossary();
      if (a === 'sound') { S.settings.sound = !S.settings.sound; PK.save(); UI.updateHeader(); PK.Sound.play('chip'); }
      if (a === 'theme') { S.settings.theme = UI.isDark() ? 'light' : 'dark'; PK.save(); UI.applySettings(); }
    });
    if (root.matchMedia) root.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => UI.updateHeader());
    render();
  }
  // Si el visor recarga la página tras una actualización, se vuelve a la misma pantalla
  const hot = root.claude && root.claude.hot;
  try { if (hot && hot.snapshot) hot.snapshot(() => ({ route, cfg: PK.pendingCfg || null })); } catch (e) { /* sin recarga en caliente */ }
  function start(data) {
    if (data && data.route && isRoute(data.route)) route = data.route;
    if (data && data.cfg) PK.pendingCfg = data.cfg;
    boot();
  }
  const begin = () => (hot && hot.ready ? hot.ready(start) : start((hot && hot.data) || {}));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin); else begin();
})(window);
