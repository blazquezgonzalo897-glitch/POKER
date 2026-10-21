// Servidor estático mínimo para probar la app.
//   node tools/serve.js [puerto]          sirve el código fuente
//   node tools/serve.js [puerto] --dist   sirve la versión de producción (dist/)
// Las páginas de artifact/ se envuelven en un esqueleto parecido al del visor de artefactos.
const http = require('http'), fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const root = path.join(__dirname, '..', args.includes('--dist') ? 'dist' : '');
const port = +process.env.PORT || +args.find(a => /^\d+$/.test(a)) || 8123;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8' };
// En modo --dist se aplican las cabeceras de dist/_headers (CSP incluida), como en Netlify
const headerRules = [];
if (args.includes('--dist') && fs.existsSync(path.join(root, '_headers'))) {
  let cur = null;
  fs.readFileSync(path.join(root, '_headers'), 'utf8').split(/\r?\n/).forEach(line => {
    if (/^\//.test(line)) headerRules.push(cur = { pattern: line.trim(), headers: {} });
    else if (cur && /^\s+\S/.test(line)) { const i = line.indexOf(':'); cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  });
}
const headersFor = url => Object.assign({}, ...headerRules.filter(r => r.pattern.endsWith('*') ? url.startsWith(r.pattern.slice(0, -1)) : url === r.pattern).map(r => r.headers));
const skeleton = page => '<!doctype html><html><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
  'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>' +
  '</head><body>' + page + '</body></html>';
http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).split('/').filter(Boolean).join(path.sep);
  const file = path.join(root, rel || 'index.html');
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) {
      const nf = path.join(root, '404.html');
      res.writeHead(404, { 'Content-Type': types['.html'] });
      return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'No encontrado');
    }
    const ext = path.extname(file);
    if (ext === '.html' && rel.startsWith('artifact' + path.sep)) data = skeleton(data.toString('utf8'));
    res.writeHead(200, Object.assign({ 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' }, headersFor(req.url.split('?')[0])));
    res.end(data);
  });
}).listen(port, () => console.log(`Escuela de Póker en http://localhost:${port}${args.includes('--dist') ? ' (dist)' : ''}`));
