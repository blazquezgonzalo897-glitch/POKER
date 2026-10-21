// Genera artifact/escuela-poker.html: toda la app en un solo archivo, con el formato que
// espera el visor de artefactos de Claude (sin <!doctype>, <html>, <head> ni <body>, porque
// el visor añade ese esqueleto). Uso: node tools/build-artifact.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const html = read('index.html');
const body = html.slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'));
const scripts = [...body.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const markup = body.replace(/\s*<script src="[^"]+"><\/script>/g, '').trim();

// Un "</script" o "</style" dentro del código cerraría la etiqueta antes de tiempo
function inline(file, tag) {
  const src = read(file);
  if (src.toLowerCase().includes('</' + tag)) throw new Error(`${file} contiene "</${tag}"`);
  return src;
}

const out = [
  '<title>Escuela de Póker</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<style>\n' + inline('css/styles.css', 'style') + '\n</style>',
  markup,
  ...scripts.map(f => `<script>\n/* ${f} */\n${inline(f, 'script')}\n</script>`)
].join('\n');

fs.mkdirSync(path.join(root, 'artifact'), { recursive: true });
const dest = path.join(root, 'artifact', 'escuela-poker.html');
fs.writeFileSync(dest, out);
console.log(`${path.relative(root, dest)}: ${(Buffer.byteLength(out) / 1024).toFixed(0)} KB, ${scripts.length} scripts`);
