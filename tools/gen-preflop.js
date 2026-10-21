// Genera js/preflop-data.js: orden de las 169 manos iniciales por equity contra una mano aleatoria.
require('../js/core.js');
const PK = globalThis.PK, fs = require('fs');
const res = PK.ALL_LABELS.map(l => {
  const [a, b] = PK.labelToCombos(l)[0];
  const r = PK.equity([{ cards: [a, b] }, null], [], { iterations: 30000 });
  return { l, eq: Math.round(r.equity[0] * 1000) / 10 };
}).sort((x, y) => y.eq - x.eq);
const eq = {}; res.forEach(r => { eq[r.l] = r.eq; });
fs.writeFileSync(__dirname + '/../js/preflop-data.js',
  '/* Generado por tools/gen-preflop.js: manos iniciales ordenadas por equity contra una mano aleatoria (%) */\n' +
  '(function (root) { const PK = root.PK = root.PK || {};\n' +
  '  PK.HAND_ORDER = ' + JSON.stringify(res.map(r => r.l)) + ';\n' +
  '  PK.HAND_EQ = ' + JSON.stringify(eq) + ';\n' +
  "})(typeof window !== 'undefined' ? window : globalThis);\n");
console.log(res.slice(0, 12).map(r => r.l + ' ' + r.eq).join(', '), '...', res.slice(-3).map(r => r.l + ' ' + r.eq).join(', '));
