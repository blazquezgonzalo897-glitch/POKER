// Comprobaciones del motor: node tests/run-tests.js
require('../js/core.js'); require('../js/preflop-data.js'); require('../js/game.js');
const PK = globalThis.PK;
let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✔ ' + name); }
  catch (e) { fail++; console.log('  ✘ ' + name + '\n      ' + e.message); }
}
function ok(c, msg) { if (!c) throw new Error(msg || 'falló'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ` esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); }
const C = s => PK.parseCards(s);
const ev = s => PK.evaluate(C(s));
const name = s => PK.describe(ev(s));

console.log('Evaluador de manos');
t('A-2-3-4-5 pierde contra 2-3-4-5-6', () => { ok(ev('Ah 2c 3d 4s 5h') < ev('2h 3c 4d 5s 6h')); eq(PK.category(ev('Ah 2c 3d 4s 5h')), 4); });
t('A-2-3-4-5 es escalera; Q-K-A-2-3 no', () => { eq(PK.category(ev('Ah 2c 3d 4s 5h')), 4); eq(PK.category(ev('Qh Kc Ad 2s 3h')), 0); });
t('Escalera al As gana a escalera al Rey', () => ok(ev('Th Jc Qd Ks Ah') > ev('9h Tc Jd Qs Kh')));
t('Color contra color: decide la carta más alta', () => ok(ev('Ah 9h 7h 4h 2h') > ev('Kh Qh Jh 9h 7h')));
t('Color contra color: si coincide, deciden las siguientes', () => {
  ok(ev('Ad Kd 9d 5d 3d') > ev('As Ks 9s 5s 2s'));
  ok(ev('Ad Kd 9d 6d 2d') > ev('As Ks 9s 5s 4s'));
  eq(ev('Ad Kd 9d 6d 2d'), ev('As Ks 9s 6s 2s'), 'colores idénticos empatan:');
});
t('Full contra full: decide primero el trío', () => { ok(ev('Kh Kd Kc 2s 2h') > ev('Qh Qd Qc As Ah')); ok(ev('Kh Kd Kc As Ah') > ev('Kh Kd Kc Qs Qh')); });
t('Misma doble pareja: decide el kicker', () => ok(ev('Ah Ad 8c 8s Kh') > ev('As Ac 8h 8d Qh')));
t('Pareja: deciden los kickers en orden', () => { ok(ev('9h 9d Ac 7s 3h') > ev('9s 9c Kh Qs Jh')); ok(ev('9h 9d Ac 7s 4h') > ev('9s 9c Ah 7d 3h')); });
t('Carta alta: compara las 5 cartas', () => ok(ev('Ah Jd 8c 6s 3h') > ev('As Jc 8h 6d 2h')));
t('Ranking completo de categorías', () => {
  const hands = ['As Ks Qs Js Ts', '9h 8h 7h 6h 5h', 'Qc Qd Qh Qs 2d', 'Jh Jd Jc 4s 4h', 'Kd Td 7d 4d 2d', '8s 7d 6c 5h 4s', '7h 7d 7c Ks 2h', '6h 6d 3c 3s Ah', 'Th Td Ac 5s 2h', 'Ah Qd 9c 6s 3h'];
  for (let i = 0; i < hands.length - 1; i++) ok(ev(hands[i]) > ev(hands[i + 1]), hands[i] + ' > ' + hands[i + 1]);
  eq(PK.catName(ev(hands[0])), 'Escalera real');
});
t('7 cartas: color y escalera a la vez → color', () => eq(PK.category(ev('Ah Kh 9h 5h 2h Qd Jc')), 5));
t('7 cartas: escalera de color dentro de 7', () => { eq(PK.category(ev('4h 5h 6h 7h 8h 9c Kh')), 8); eq(name('Ah 2h 3h 4h 5h Kd Kc'), 'Escalera de color al Cinco'); });
t('7 cartas: dos tríos → full con el trío mayor', () => eq(name('Kh Kd Kc 9s 9h 9d 2c'), 'Full de Reyes y Nueves'));
t('7 cartas: tres parejas → doble pareja mayor con mejor kicker', () => eq(name('Kh Kd 9c 9s 4h 4d Qc'), 'Doble pareja: Reyes y Nueves, kicker Dama'));
t('7 cartas: póker con mejor kicker disponible', () => eq(ev('7h 7d 7c 7s 2h Kd 3c'), ev('7h 7d 7c 7s Kd')));
t('7 cartas: escalera de 6 cartas usa la más alta', () => eq(name('4h 5d 6c 7s 8h 9d 2c'), 'Escalera al Nueve'));
t('La mesa juega para ambos → bote dividido', () => {
  const r = PK.winners([C('2c 3d'), C('4h 5s')], C('Ah Kd Qc Js Th'));
  eq(r.winners.length, 2);
});
t('Mesa doble pareja: kicker de la mano decide', () => {
  const r = PK.winners([C('Ac 3d'), C('Kh 5s')], C('8h 8d 4c 4s 2h'));
  eq(r.winners.join(), '0');
});
t('Mesa con color: nadie lo mejora → empate', () => {
  const r = PK.winners([C('2c 3d'), C('Kc 5s')], C('Ah Th 8h 6h 4h'));
  eq(r.winners.length, 2);
});
t('bestFive elige las 5 cartas correctas', () => {
  const b = PK.bestFive(C('Ah Kh 7h 2h 9c 9d 5h'));
  eq(b.cat, 5); ok(b.cards.every(c => PK.suitOf(c) === 1)); ok(!b.cards.includes(PK.cardFromStr('9c')));
});

console.log('Baraja y equity');
t('Baraja de 52 cartas distintas', () => { const d = PK.freshDeck(); eq(new Set(d).size, 52); });
t('Fisher-Yates uniforme (posición de cada carta)', () => {
  const counts = new Array(52).fill(0), N = 52000;
  for (let i = 0; i < N; i++) counts[PK.freshDeck()[0]]++;
  const exp = N / 52; ok(counts.every(c => Math.abs(c - exp) < exp * 0.2), 'desviación demasiado grande');
});
t('AA contra KK ≈ 82 %', () => { const r = PK.equity([{ cards: C('As Ah') }, { cards: C('Kd Kc') }], [], { iterations: 30000 }); ok(Math.abs(r.equity[0] - 0.82) < 0.015, r.equity[0]); });
t('Equity exacta en el turn (color + dos overcards: 15 outs de 44)', () => {
  const r = PK.equity([{ cards: C('Ah Kh') }, { cards: C('Qs Js') }], C('Qh 7h 2c 3d'));
  ok(r.exact); ok(Math.abs(r.equity[0] - 15 / 44) < 1e-9, r.equity[0]);
});
t('Outs: color + overcards contra pareja = 15; solo color contra set de 7 = 7', () => { eq(PK.outsAgainst(C('Ah Kh'), C('Qs Js'), C('Qh 7h 2c')).length, 15); eq(PK.outsAgainst(C('Ah Kh'), C('7s 7d'), C('Qh 7h 2c 3s')).length, 7); });
t('Equity contra rango funciona', () => { const r = PK.equity([{ cards: C('Ks Kh') }, { range: PK.rangeCombos(PK.parseRange('AA')) }], [], { iterations: 8000 }); ok(r.equity[0] < 0.25 && r.equity[0] > 0.12, r.equity[0]); });
t('Nuts: mesa monocolor', () => eq(PK.nutsOf(C('2h 7h 9h Kc 3d')).name, 'Color al As'));
t('Rangos: parseo de notación', () => { const s = PK.parseRange('TT+, AQs+, KJo'); eq([...s].sort().join(), ['AA', 'AKs', 'AQs', 'JJ', 'KJo', 'KK', 'QQ', 'TT'].sort().join()); });

console.log('Reglas de apuesta');
const mk = (stacks, opts = {}) => new PK.Table({ sb: 5, bb: 10, button: opts.button ?? 0, players: stacks.map((s, i) => ({ name: 'J' + i, stack: s })) });
t('Heads-up: el botón es ciega pequeña y actúa primero preflop, último postflop', () => {
  const T = mk([1000, 1000]); T.startHand({ button: 0 });
  eq(T.sbSeat, 0); eq(T.bbSeat, 1); eq(T.toAct, 0);
  T.act({ type: 'call' }); eq(T.toAct, 1, 'BB tiene opción'); T.act({ type: 'check' });
  eq(T.street, 'flop'); eq(T.toAct, 1, 'postflop actúa primero la BB');
});
t('3 jugadores: el botón actúa primero preflop; SB primero postflop', () => {
  const T = mk([1000, 1000, 1000]); T.startHand({ button: 0 });
  eq(T.sbSeat, 1); eq(T.bbSeat, 2); eq(T.toAct, 0);
  T.act({ type: 'call' }); T.act({ type: 'call' }); eq(T.toAct, 2); T.act({ type: 'check' });
  eq(T.street, 'flop'); eq(T.toAct, 1);
});
t('6 jugadores: posiciones y UTG primero', () => {
  const T = mk([1000, 1000, 1000, 1000, 1000, 1000]); T.startHand({ button: 2 });
  eq(T.positions[2], 'BTN'); eq(T.positions[3], 'SB'); eq(T.positions[4], 'BB'); eq(T.positions[5], 'UTG'); eq(T.positions[0], 'MP'); eq(T.positions[1], 'CO');
  eq(T.toAct, 5);
});
t('Subida mínima: al menos la última subida', () => {
  const T = mk([1000, 1000, 1000]); T.startHand({ button: 0 });
  eq(T.legal().minTo, 20);
  T.act({ type: 'raise', amount: 50 });        // sube 40
  eq(T.legal().minTo, 90);
  T.act({ type: 'raise', amount: 60 });        // por debajo del mínimo → se ajusta a 90
  eq(T.currentBet, 90);
});
t('All-in incompleto no reabre la acción', () => {
  const T = mk([1000, 1000, 150]); T.startHand({ button: 0 });
  T.act({ type: 'call' }); T.act({ type: 'call' }); T.act({ type: 'check' });
  T.act({ type: 'bet', amount: 100 });   // J1 apuesta 100
  T.act({ type: 'allin' });              // J2 all-in por 140 (subida de 40 < 100: incompleta)
  eq(T.toAct, 0); ok(T.legal().canRaise, 'J0 no ha actuado: puede subir');
  T.act({ type: 'call' });
  eq(T.toAct, 1); ok(!T.legal().canRaise, 'J1 ya actuó y la subida fue incompleta'); eq(T.legal().toCall, 40);
});
t('Opción de la ciega grande tras limps', () => {
  const T = mk([1000, 1000, 1000]); T.startHand({ button: 0 });
  T.act({ type: 'call' }); T.act({ type: 'call' });
  eq(T.street, 'preflop'); eq(T.toAct, 2); ok(T.legal().canCheck && T.legal().canRaise);
});
t('Botes secundarios con varios all-in', () => {
  const T = mk([100, 300, 1000]);
  T.startHand({ button: 0, rig: { holes: { 0: C('As Ah'), 1: C('Ks Kh'), 2: C('7c 2d') }, board: C('Ac Kd 9h 4s 3c') } });
  T.act({ type: 'allin' }); T.act({ type: 'allin' }); T.act({ type: 'call' });
  ok(T.handOver);
  eq(T.result.pots.length, 2); eq(T.result.pots[0].amount, 300); eq(T.result.pots[1].amount, 400);
  eq(T.players[0].stack, 300); eq(T.players[1].stack, 400); eq(T.players[2].stack, 700);
});
t('Bote secundario con un jugador retirado que aportó fichas', () => {
  const T = mk([1000, 1000, 50]);
  T.startHand({ button: 0, rig: { holes: { 0: C('Ks Kh'), 1: C('7c 2d'), 2: C('As Ah') }, board: C('Ac Kd 9h 4s 3c') } });
  T.act({ type: 'raise', amount: 100 }); T.act({ type: 'call' }); T.act({ type: 'allin' }); // BB all-in 50 (por debajo)
  T.act({ type: 'check' }); T.act({ type: 'bet', amount: 200 }); // flop: SB pasa, BTN apuesta
  T.act({ type: 'fold' });  // SB se retira
  ok(T.handOver);
  // principal: 50*3 = 150 para AA; secundario: 50+50 (+ apuesta de 200 devuelta) para KK
  eq(T.players[2].stack, 150); eq(T.players[0].stack, 1000); eq(T.players[1].stack, 900);
});
t('Apuesta no igualada se devuelve', () => {
  const T = mk([1000, 200]); T.startHand({ button: 0, rig: { holes: { 0: C('2c 7d'), 1: C('As Ah') }, board: C('Ac Kd 9h 4s 3c') } });
  T.act({ type: 'raise', amount: 1000 }); T.act({ type: 'call' });
  ok(T.handOver); eq(T.players[1].stack, 400); eq(T.players[0].stack, 800);
});
t('Bote dividido: la mesa juega para los dos', () => {
  const T = mk([1000, 1000, 1000]);
  T.startHand({ button: 0, rig: { holes: { 0: C('2c 3d'), 1: C('2h 3s'), 2: C('4c 5d') }, board: C('As Kd Qc Jh Th') } });
  T.act({ type: 'call' }); T.act({ type: 'call' }); T.act({ type: 'check' });
  for (let i = 0; i < 9; i++) if (!T.handOver) T.act({ type: 'check' });
  ok(T.handOver); ok(T.result.pots[0].split); eq(T.result.pots[0].winners.length, 3);
  eq(T.players.reduce((s, p) => s + p.stack, 0), 3000);
});
t('Ficha impar del bote dividido al primero tras el botón', () => {
  const T = mk([1000, 1000, 1000]);
  T.startHand({ button: 0, rig: { holes: { 0: C('2c 3d'), 1: C('2h 3s'), 2: C('4c 5d') }, board: C('As Kd Qc Jh Th') } });
  T.act({ type: 'raise', amount: 25 }); T.act({ type: 'fold' }); T.act({ type: 'call' }); // bote 25+5+25 = 55
  for (let i = 0; i < 6; i++) T.act({ type: 'check' });
  ok(T.handOver); eq(T.result.pots[0].amount, 55);
  eq(T.players[2].stack, 1000 - 25 + 28, 'BB (primero tras el botón entre los ganadores)'); eq(T.players[0].stack, 1000 - 25 + 27);
});
t('Rotación del botón y ciegas saltando jugadores sin fichas', () => {
  const T = mk([1000, 0, 1000, 1000]); T.startHand({ button: 0 });
  eq(T.sbSeat, 2); eq(T.bbSeat, 3);
  T.act({ type: 'fold' }); T.act({ type: 'fold' });
  T.startHand(); eq(T.button, 2); eq(T.sbSeat, 3); eq(T.bbSeat, 0);
});
t('Ciega grande all-in al postear', () => {
  const T = mk([1000, 6]); T.startHand({ button: 0 });
  ok(T.players[1].allIn); T.act({ type: 'call' }); ok(T.handOver);
  eq(T.players[0].stack + T.players[1].stack, 1006);
});
t('Simulación: 400 manos con bots conservan las fichas', () => {
  const profs = Object.keys(PK.PROFILES);
  const T = new PK.Table({ sb: 10, bb: 20, players: Array.from({ length: 6 }, (_, i) => ({ name: 'B' + i, stack: 2000, profile: profs[i % profs.length] })) });
  for (let h = 0; h < 400; h++) {
    if (T.players.filter(p => p.stack > 0).length < 2) T.players.forEach(p => { p.stack = 2000; });
    const total = T.players.reduce((s, p) => s + p.stack, 0);
    T.startHand();
    let guard = 0;
    while (!T.handOver) { T.act(PK.botDecide(T, T.toAct)); if (++guard > 200) throw new Error('bucle infinito'); }
    eq(T.players.reduce((s, p) => s + p.stack, 0), total, 'fichas mano ' + h);
    ok(T.players.every(p => p.stack >= 0));
  }
});
t('Entrenador valora decisiones', () => {
  const T = mk([1000, 1000]); T.startHand({ button: 0, rig: { holes: { 0: C('7c 2d'), 1: C('As Ah') } } });
  const A = { street: 'preflop', equity: 0.3, required: 0, toCall: 5, callAmt: 5, pot: 15, stack: 995, label: '72o', pct: 1, position: 'BTN', draws: {}, nOpp: 1 };
  eq(PK.rate(T, 0, A, { type: 'fold' }).rating, 'Buena');
  eq(PK.rate(T, 0, A, { type: 'raise', amount: 25 }).rating, 'Error');
});
t('Clasificación de manos', () => {
  eq(PK.handClass(C('Ah Kh'), C('Qh 7h 2c')).cls, 'proyecto');
  eq(PK.handClass(C('7s 7d'), C('7h Kc 2d')).cls, 'monstruo');
  eq(PK.handClass(C('Ad Kc'), C('Ks 8h 3d')).cls, 'fuerte');
  eq(PK.handClass(C('4d 5c'), C('Ks 8h 3d')).cls, 'debil');
});
console.log(`\n${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
