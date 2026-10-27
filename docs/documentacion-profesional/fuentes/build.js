const fs = require('fs');
const path = require('path');
const { buildDocx, buildHtml } = require('./lib');
const raw = [...require('./content1'), ...require('./content2')];
// un h2 inmediatamente anterior a una figura se mueve a la página horizontal de la figura
const model = [];
for (let i = 0; i < raw.length; i++) {
  const b = raw[i];
  if (b.t === 'h1' && raw[i + 1] && raw[i + 1].t === 'h2' && raw[i + 2] && raw[i + 2].t === 'img') { model.push({ ...raw[i + 2], h1: b.x, title: raw[i + 1].x }); i += 2; continue; }
  if (b.t === 'h2' && raw[i + 1] && raw[i + 1].t === 'img') { model.push({ ...raw[i + 1], title: b.x }); i++; continue; }
  model.push(b);
}
const meta = { sistema: '1.1.0', doc: '2.0', fecha: '26 de octubre de 2026' };
const img = path.join(__dirname, 'img');
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });

let tocPages = null;
try { tocPages = JSON.parse(fs.readFileSync(path.join(out, 'toc-pages.json'), 'utf8')); } catch (e) { /* primera pasada */ }

(async () => {
  await buildDocx(model, meta, img, path.join(out, 'IT-Incident-Hub-Documentacion.docx'));
  const { html, heads } = buildHtml(model, meta, img, tocPages);
  fs.writeFileSync(path.join(out, 'doc.html'), html);
  fs.writeFileSync(path.join(out, 'heads.json'), JSON.stringify(heads));
  console.log('ok', model.length, 'bloques;', heads.length, 'encabezados');
})();
