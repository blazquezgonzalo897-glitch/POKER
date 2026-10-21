// Genera dist/ para publicar en Netlify (u otro hosting estático):
// une los scripts y los estilos en dos archivos con huella de contenido, copia los
// archivos estáticos y escribe las cabeceras de seguridad y caché (_headers).
// Uso: node tools/build-site.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), dist = path.join(root, 'dist');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const write = (f, s) => {
  const p = path.join(dist, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
  return Buffer.byteLength(s);
};

const HEADERS = `/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

fs.rmSync(dist, { recursive: true, force: true });
let html = read('index.html');
const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const css = styles.map(read).join('\n');
const js = scripts.map(f => `/* ${f} */\n${read(f)}`).join('\n;\n');
const cssName = `assets/app.${hash(css)}.css`, jsName = `assets/app.${hash(js)}.js`;
const sizes = {};
sizes[cssName] = write(cssName, css);
sizes[jsName] = write(jsName, js);
html = html
  .replace(/\n\s*<link rel="stylesheet" href="[^"]+">/g, '')
  .replace(/\n\s*<script src="[^"]+"><\/script>/g, '')
  .replace('</head>', `  <link rel="stylesheet" href="${cssName}">\n</head>`)
  .replace('</body>', `  <script src="${jsName}"></script>\n</body>`);
sizes['index.html'] = write('index.html', html);
for (const f of ['404.html', 'manifest.webmanifest', 'robots.txt', 'img/icon.svg']) sizes[f] = write(f, read(f));
sizes._headers = write('_headers', HEADERS);

console.log(`dist/ listo (${styles.length} hoja de estilos y ${scripts.length} scripts unidos):`);
Object.entries(sizes).forEach(([f, b]) => console.log(`  ${f.padEnd(34)} ${(b / 1024).toFixed(1).padStart(7)} KB`));
