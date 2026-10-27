const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, Footer, PageNumber,
  AlignmentType, HeadingLevel, WidthType, ShadingType, BorderStyle, LevelFormat, TableOfContents, PageBreak,
  SectionType, VerticalAlign, TabStopType, PageOrientation,
} = require('docx');

const C = { navy: '1F3A5F', blue: '2E75B6', grey: '595959', line: 'BFC9D6', zebra: 'F2F6FA', code: 'F4F4F4' };
const FONT = 'Calibri';
const W = 9360;

// ---------- inline parsing: **negrita**, `codigo`, _cursiva_ ----------
function inline(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, ...base }));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(new TextRun({ text: tok.slice(2, -2), bold: true, font: FONT, ...base }));
    else out.push(new TextRun({ text: tok.slice(1, -1), font: 'Consolas', size: (base.size || 21) - 2, color: '7A2E0E', ...base, bold: base.bold }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, ...base }));
  return out;
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const border = (c = C.line, sz = 4) => ({ style: BorderStyle.SINGLE, size: sz, color: c });
const allBorders = (c, sz) => ({ top: border(c, sz), bottom: border(c, sz), left: border(c, sz), right: border(c, sz) });

// ---------- DOCX ----------
function buildDocx(model, meta, imgDir, outFile) {
  let tableN = 0, figN = 0;
  let children = [];
  const parts = [];
  const flush = () => { if (children.length) parts.push({ land: false, children }); children = []; };
  const spacer = (after = 120) => new Paragraph({ spacing: { after }, children: [] });

  const rowsToCells = (widths, cells, opts = {}) => cells.map((t, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    borders: allBorders(),
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: String(t).split('\n').map((ln) => new Paragraph({
      spacing: { after: 20 },
      children: inline(ln, { size: 18, color: opts.color, bold: opts.bold }),
    })),
  }));

  const mkTable = (head, rows, weights, boldFirst) => {
    const tot = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => Math.round((w / tot) * W));
    widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
    const trs = [];
    if (head) trs.push(new TableRow({ tableHeader: true, cantSplit: true, children: rowsToCells(widths, head, { fill: C.navy, color: 'FFFFFF', bold: true }) }));
    rows.forEach((r, i) => trs.push(new TableRow({
      cantSplit: true,
      children: r.map((t, k) => rowsToCells(widths, r.map((x, kk) => (boldFirst && kk === 0 ? `**${x}**` : x)), { fill: i % 2 ? C.zebra : undefined })[k]),
    })));
    return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: trs });
  };

  for (const b of model) {
    switch (b.t) {
      case 'h1':
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: b.x, font: FONT })] }));
        break;
      case 'h2':
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: b.x, font: FONT })] }));
        break;
      case 'h3':
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: b.x, font: FONT })] }));
        break;
      case 'p':
        children.push(new Paragraph({ spacing: { after: 120, line: 276 }, alignment: AlignmentType.JUSTIFIED, children: inline(b.x, { size: 21 }) }));
        break;
      case 'bullets':
        b.items.forEach((it) => children.push(new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60, line: 264 }, children: inline(it, { size: 21 }) })));
        children.push(spacer(60));
        break;
      case 'numbered':
        b.items.forEach((it) => children.push(new Paragraph({ numbering: { reference: b.ref || 'num1', level: 0 }, spacing: { after: 60, line: 264 }, children: inline(it, { size: 21 }) })));
        children.push(spacer(60));
        break;
      case 'table': {
        tableN++;
        if (b.cap) children.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: 80 }, children: [new TextRun({ text: `Tabla ${tableN}. ${b.cap}`, bold: true, size: 19, color: C.navy, font: FONT })] }));
        children.push(mkTable(b.head, b.rows, b.w || b.head.map(() => 1), b.boldFirst));
        children.push(spacer(160));
        break;
      }
      case 'kv': {
        tableN++;
        if (b.cap) children.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: 80 }, children: [new TextRun({ text: `Tabla ${tableN}. ${b.cap}`, bold: true, size: 19, color: C.navy, font: FONT })] }));
        const widths = [2300, W - 2300];
        children.push(new Table({
          width: { size: W, type: WidthType.DXA }, columnWidths: widths,
          rows: b.rows.map((r) => new TableRow({
            cantSplit: true,
            children: [
              ...rowsToCells(widths, [r[0]], { fill: 'DCE9F5', bold: true }).slice(0, 1),
              new TableCell({
                width: { size: widths[1], type: WidthType.DXA }, borders: allBorders(), margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: String(r[1]).split('\n').map((ln) => new Paragraph({ spacing: { after: 20 }, children: inline(ln, { size: 18 }) })),
              }),
            ],
          })),
        }));
        children.push(spacer(160));
        break;
      }
      case 'img': {
        figN++;
        const file = path.join(imgDir, b.f);
        const { w, h } = pngSize(file);
        const hb = 590 - (b.h1 ? 85 : 0) - (b.title ? 45 : 0);
        const pw = Math.round(Math.min(860, (hb * w) / h));
        flush();
        parts.push({ land: true, children: [
          ...(b.h1 ? [new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 160 }, children: [new TextRun({ text: b.h1, font: FONT })] })] : []),
          ...(b.title ? [new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: b.title, font: FONT })] })] : []),
          new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 60, after: 60 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: pw, height: Math.round((pw * h) / w) }, altText: { title: b.cap, description: b.cap, name: b.f } })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Figura ${figN}. ${b.cap}`, italics: true, size: 18, color: C.grey, font: FONT })] }),
        ] });
        break;
      }
      case 'shot': {
        figN++;
        const file = path.join(imgDir, b.f);
        const buf = fs.readFileSync(file);
        const pw = b.px || 520;
        // jpg: leer dimensiones del marcador SOF
        let w = 800, h = 600;
        for (let i = 2; i < buf.length;) { if (buf[i] !== 0xFF) { i++; continue; } const mk = buf[i + 1]; if (mk >= 0xC0 && mk <= 0xC3) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break; } i += 2 + buf.readUInt16BE(i + 2); }
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: 'jpg', data: buf, transformation: { width: pw, height: Math.round((pw * h) / w) }, altText: { title: b.cap, description: b.cap, name: b.f } })] }));
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Figura ${figN}. ${b.cap}`, italics: true, size: 18, color: C.grey, font: FONT })] }));
        break;
      }
      case 'code':
        b.x.split('\n').forEach((ln, i, arr) => children.push(new Paragraph({
          spacing: { after: 0, line: 240 }, keepLines: true,
          shading: { fill: C.code, type: ShadingType.CLEAR, color: 'auto' },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: C.blue, space: 6 } },
          indent: { left: 120 },
          children: [new TextRun({ text: ln === '' ? ' ' : ln, font: 'Consolas', size: 17 })],
        })));
        children.push(spacer(140));
        break;
      case 'note': {
        const col = { info: C.blue, warn: 'C55A11', ok: '548235' }[b.k || 'info'];
        const fill = { info: 'EAF2FA', warn: 'FDF0E6', ok: 'EEF6E8' }[b.k || 'info'];
        children.push(new Table({
          width: { size: W, type: WidthType.DXA }, columnWidths: [W],
          rows: [new TableRow({ cantSplit: true, children: [new TableCell({
            width: { size: W, type: WidthType.DXA },
            borders: { top: border(fill, 2), bottom: border(fill, 2), right: border(fill, 2), left: { style: BorderStyle.SINGLE, size: 24, color: col } },
            shading: { fill, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 100, bottom: 100, left: 180, right: 140 },
            children: [
              new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: b.title, bold: true, color: col, size: 20, font: FONT })] }),
              ...b.x.split('\n').map((ln) => new Paragraph({ spacing: { after: 30 }, children: inline(ln, { size: 19 }) })),
            ],
          })] })],
        }));
        children.push(spacer(160));
        break;
      }
      case 'toc':
        children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Tabla de contenido', bold: true, size: 36, color: C.navy, font: FONT })] }));
        children.push(new TableOfContents('Tabla de contenido', { hyperlink: true, headingStyleRange: '1-2' }));
        break;
      case 'pb':
        children.push(new Paragraph({ children: [new PageBreak()] }));
        break;
      default:
        throw new Error('bloque desconocido ' + b.t);
    }
  }

  // ---------- portada ----------
  const cover = [];
  const cp = (text, o = {}) => cover.push(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: o.after ?? 120, before: o.before ?? 0 }, children: [new TextRun({ text, font: FONT, size: o.size || 24, bold: o.bold, color: o.color || C.grey })] }));
  cover.push(new Paragraph({ spacing: { before: 1800, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 36, color: C.blue, space: 12 } }, children: [] }));
  cp('DOCUMENTO DE ANÁLISIS, DISEÑO Y OPERACIÓN', { size: 22, bold: true, color: C.blue, after: 80 });
  cp('IT Incident Hub', { size: 80, bold: true, color: C.navy, after: 60 });
  cp('Plataforma web de gestión de incidentes de TI con ciclo de entrega continuo DevOps', { size: 30, color: C.grey, after: 600 });
  const metaRows = [['Versión del sistema', meta.sistema], ['Versión del documento', meta.doc], ['Fecha', meta.fecha], ['Estado', 'Versión final para entrega'], ['Contexto', 'Proyecto integrador DevOps (Módulos 1 a 10)'], ['Repositorio', 'Azure Repos (principal) y GitHub (espejo con GitHub Actions)']];
  cover.push(new Table({
    width: { size: 7600, type: WidthType.DXA }, columnWidths: [2600, 5000],
    rows: metaRows.map((r) => new TableRow({ children: [
      new TableCell({ width: { size: 2600, type: WidthType.DXA }, borders: { top: border('FFFFFF', 0), bottom: border(C.line, 4), left: border('FFFFFF', 0), right: border('FFFFFF', 0) }, margins: { top: 80, bottom: 80, left: 0, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: r[0], bold: true, size: 22, color: C.navy, font: FONT })] })] }),
      new TableCell({ width: { size: 5000, type: WidthType.DXA }, borders: { top: border('FFFFFF', 0), bottom: border(C.line, 4), left: border('FFFFFF', 0), right: border('FFFFFF', 0) }, margins: { top: 80, bottom: 80, left: 100, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: r[1], size: 22, font: FONT })] })] }),
    ] })),
  }));
  cover.push(new Paragraph({ spacing: { before: 700, after: 0 }, children: [new TextRun({ text: 'Equipo (simulado de 3 integrantes, cuentas independientes): Jesús Soto (SotoJ08) · DharaGar29 · Edd210', size: 20, color: C.grey, font: FONT })] }));

  const mkHeader = (wd) => new Header({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: wd }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 4 } },
    children: [new TextRun({ text: 'IT Incident Hub', bold: true, color: C.navy, size: 18, font: FONT }), new TextRun({ text: `\tDocumento de análisis, diseño y operación · v${meta.sistema}`, color: C.grey, size: 18, font: FONT })],
  })] });
  const mkFooter = (wd) => new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: wd }],
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } },
    children: [new TextRun({ text: 'Documento técnico · uso académico', color: C.grey, size: 16, font: FONT }), new TextRun({ children: ['\tPágina ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], color: C.grey, size: 16, font: FONT })],
  })] });
  flush();
  const bodySections = parts.map((pt) => ({
    properties: { type: SectionType.NEXT_PAGE, page: { size: pt.land ? { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE } : { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1300, left: 1440 } } },
    headers: { default: mkHeader(pt.land ? 12960 : W) }, footers: { default: mkFooter(pt.land ? 12960 : W) }, children: pt.children,
  }));

  const mkNum = (ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] });
  const doc = new Document({
    creator: 'Equipo IT Incident Hub', title: 'IT Incident Hub - Documento de análisis, diseño y operación', description: 'Documentación técnica y funcional del sistema',
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONT, size: 21 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, color: C.navy, font: FONT }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.blue, space: 4 } } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: C.blue, font: FONT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1, keepNext: true } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: C.navy, font: FONT }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2, keepNext: true } },
      ],
    },
    numbering: { config: [
      { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      ...['num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9', 'num10', 'num11', 'num12'].map(mkNum),
    ] },
    sections: [
      { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: cover },
      ...bodySections,
    ],
  });
  return Packer.toBuffer(doc).then((buf) => fs.writeFileSync(outFile, buf));
}

// ---------- HTML (para PDF) ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inl = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');

function buildHtml(model, meta, imgDir, tocPages) {
  let tableN = 0, figN = 0, secId = 0;
  const heads = [];
  let body = '';
  const imgData = (f, mime) => `data:${mime};base64,${fs.readFileSync(path.join(imgDir, f)).toString('base64')}`;
  for (const b of model) {
    switch (b.t) {
      case 'h1': { const id = 's' + (++secId); heads.push({ lvl: 1, id, x: b.x }); body += `<h1 id="${id}" class="pb">${esc(b.x)}</h1>`; break; }
      case 'h2': { const id = 's' + (++secId); heads.push({ lvl: 2, id, x: b.x }); body += `<h2 id="${id}">${esc(b.x)}</h2>`; break; }
      case 'h3': body += `<h3>${esc(b.x)}</h3>`; break;
      case 'p': body += `<p>${inl(b.x)}</p>`; break;
      case 'bullets': body += `<ul>${b.items.map((i) => `<li>${inl(i)}</li>`).join('')}</ul>`; break;
      case 'numbered': body += `<ol>${b.items.map((i) => `<li>${inl(i)}</li>`).join('')}</ol>`; break;
      case 'table': {
        tableN++;
        const tot = b.w ? b.w.reduce((a, c) => a + c, 0) : 0;
        const cg = b.w ? `<colgroup>${b.w.map((w) => `<col style="width:${((w / tot) * 100).toFixed(1)}%">`).join('')}</colgroup>` : '';
        body += `<div class="tw">${b.cap ? `<div class="cap">Tabla ${tableN}. ${esc(b.cap)}</div>` : ''}<table>${cg}<thead><tr>${b.head.map((h) => `<th>${inl(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c, i) => `<td>${inl(String(c)).replace(/\n/g, '<br>').replace(/^(.*)$/, b.boldFirst && i === 0 ? '<b>$1</b>' : '$1')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        break;
      }
      case 'kv': {
        tableN++;
        body += `<div class="tw">${b.cap ? `<div class="cap">Tabla ${tableN}. ${esc(b.cap)}</div>` : ''}<table class="kv">${b.rows.map((r) => `<tr><th>${inl(r[0])}</th><td>${inl(String(r[1])).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table></div>`;
        break;
      }
      case 'img': {
        figN++;
        let ttl = '';
        if (b.h1) { const id = 's' + (++secId); heads.push({ lvl: 1, id, x: b.h1 }); ttl += `<h1 id="${id}" style="margin-top:0">${esc(b.h1)}</h1>`; }
        if (b.title) { const id = 's' + (++secId); heads.push({ lvl: 2, id, x: b.title }); ttl += `<h2 id="${id}" style="margin-top:0">${esc(b.title)}</h2>`; }
        const mh = 150 - (b.h1 ? 15 : 0) - (b.title ? 10 : 0);
        body += `<div class="land">${ttl}<figure><img style="max-height:${mh}mm" src="${imgData(b.f, 'image/png')}"><figcaption>Figura ${figN}. ${esc(b.cap)}</figcaption></figure></div>`;
        break;
      }
      case 'shot': figN++; body += `<figure><img style="max-width:${Math.round(((b.px || 520) / 620) * 100)}%" src="${imgData(b.f, 'image/jpeg')}"><figcaption>Figura ${figN}. ${esc(b.cap)}</figcaption></figure>`; break;
      case 'code': body += `<pre>${esc(b.x)}</pre>`; break;
      case 'note': body += `<div class="note ${b.k || 'info'}"><b>${esc(b.title)}</b><br>${inl(b.x).replace(/\n/g, '<br>')}</div>`; break;
      case 'toc': body += '@@TOC@@'; break;
      case 'pb': body += '<div class="pbk"></div>'; break;
    }
  }
  const toc = `<h1 class="toc-title pb">Tabla de contenido</h1><div class="toc">${heads.map((h) => `<div class="t${h.lvl}"><a href="#${h.id}">${esc(h.x)}</a><span class="dots"></span><span class="pg">${tocPages ? tocPages[h.id] || '' : ''}</span></div>`).join('')}</div>`;
  body = body.replace('@@TOC@@', toc);
  const metaRows = [['Versión del sistema', meta.sistema], ['Versión del documento', meta.doc], ['Fecha', meta.fecha], ['Estado', 'Versión final para entrega'], ['Contexto', 'Proyecto integrador DevOps (Módulos 1 a 10)'], ['Repositorio', 'Azure Repos (principal) y GitHub (espejo con GitHub Actions)']];
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>IT Incident Hub - Documento de análisis, diseño y operación</title><style>
@page{size:Letter;margin:22mm 22mm 20mm 22mm;@bottom-right{content:"Página " counter(page);font:9pt Calibri,Segoe UI,sans-serif;color:#595959}@bottom-left{content:"IT Incident Hub · v${meta.sistema}";font:9pt Calibri,Segoe UI,sans-serif;color:#595959}}
@page land{size:Letter landscape;margin:18mm 20mm 16mm 20mm;@bottom-right{content:"Página " counter(page);font:9pt Calibri,Segoe UI,sans-serif;color:#595959}@bottom-left{content:"IT Incident Hub · v${meta.sistema}";font:9pt Calibri,Segoe UI,sans-serif;color:#595959}}
.land{page:land;break-before:page;break-after:page}.land figure{margin:0;text-align:center}.land figure img{max-width:100%;max-height:152mm}
@page:first{margin:0;@bottom-right{content:none}@bottom-left{content:none}}
body{font:10.5pt/1.45 Calibri,'Segoe UI',sans-serif;color:#1e1e1e;margin:0}
.cover{height:279mm;padding:60mm 28mm 0 28mm;box-sizing:border-box;page-break-after:always;border-top:0}
.cover .bar{border-top:6px solid #2E75B6;margin-bottom:14px}
.cover .k{color:#2E75B6;font-weight:700;letter-spacing:.5px;font-size:11pt}.cover h1{font-size:44pt;color:#1F3A5F;margin:6px 0 8px;border:0;padding:0}
.cover .sub{font-size:15pt;color:#595959;margin-bottom:42mm}.cover table{width:78%;border-collapse:collapse}.cover td{padding:7px 4px;border-bottom:1px solid #BFC9D6;font-size:11pt}.cover td:first-child{font-weight:700;color:#1F3A5F;width:36%}
.cover .eq{margin-top:20mm;color:#595959;font-size:10pt}
h1{font-size:20pt;color:#1F3A5F;border-bottom:3px solid #2E75B6;padding-bottom:3px;margin:0 0 12px}h1.pb{page-break-before:always}
h2{font-size:14.5pt;color:#2E75B6;margin:20px 0 6px;break-after:avoid}h3{font-size:12pt;color:#1F3A5F;margin:14px 0 5px;break-after:avoid}
p{margin:0 0 7px;text-align:justify}ul,ol{margin:0 0 8px;padding-left:22px}li{margin-bottom:3px}
code{font:9pt Consolas,monospace;color:#7A2E0E;background:#f6f1ee;padding:0 2px}
pre{font:8.3pt/1.3 Consolas,monospace;background:#f4f4f4;border-left:4px solid #2E75B6;padding:7px 10px;white-space:pre-wrap;break-inside:avoid;margin:0 0 10px}
.tw{margin:8px 0 12px}.cap{font-weight:700;color:#1F3A5F;font-size:9.5pt;margin-bottom:4px;break-after:avoid}
table{border-collapse:collapse;width:100%;font-size:9pt}th{background:#1F3A5F;color:#fff;text-align:left}th,td{border:1px solid #BFC9D6;padding:4px 6px;vertical-align:middle}tbody tr:nth-child(even) td{background:#F2F6FA}tr{break-inside:avoid}
table.kv th{background:#DCE9F5;color:#1e1e1e;width:24%}table.kv td{background:#fff!important}
figure{margin:10px 0 14px;text-align:center;break-inside:avoid}figure img{max-width:100%}figcaption{font-style:italic;font-size:9pt;color:#595959;margin-top:3px}
.note{border-left:6px solid #2E75B6;background:#EAF2FA;padding:7px 11px;margin:8px 0 12px;break-inside:avoid;font-size:9.8pt}.note.warn{border-color:#C55A11;background:#FDF0E6}.note.ok{border-color:#548235;background:#EEF6E8}.note b:first-child{color:#1F3A5F}
.toc-title{border:0}.toc .t1{font-weight:700;margin-top:5px;display:flex;font-size:10pt}.toc .t2{padding-left:18px;display:flex;font-size:9pt;line-height:1.25}.toc a{color:inherit;text-decoration:none}.toc .dots{flex:1;border-bottom:1px dotted #999;margin:0 5px 4px}.toc .pg{min-width:20px;text-align:right}
.ctl{page-break-before:always}
</style></head><body>
<div class="cover"><div class="bar"></div><div class="k">DOCUMENTO DE ANÁLISIS, DISEÑO Y OPERACIÓN</div><h1>IT Incident Hub</h1><div class="sub">Plataforma web de gestión de incidentes de TI con ciclo de entrega continuo DevOps</div><table>${metaRows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table><div class="eq">Equipo (simulado de 3 integrantes, cuentas independientes): Jesús Soto (SotoJ08) · DharaGar29 · Edd210</div></div>
${body}</body></html>`;
  return { html, heads };
}

module.exports = { buildDocx, buildHtml };
