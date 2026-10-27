import fitz, json
doc = fitz.open('out/doc.pdf')
heads = json.load(open('out/heads.json', encoding='utf-8'))
texts = [doc[i].get_text() for i in range(len(doc))]
start = max(i for i, t in enumerate(texts) if 'Tabla de contenido' in t and i < 8)
last = heads[-1]['x']
toc_end = next(i for i in range(start, len(texts)) if last in texts[i])
res = {}
cur = 1
for h in heads:
    found = None
    for i in range(cur, len(texts)):
        if start <= i <= toc_end:
            continue
        if h['x'] in [l.strip() for l in texts[i].split('\n')]:
            found = i
            break
    if found is None:
        print('NO', h['x'])
        continue
    res[h['id']] = found + 1
    cur = found
json.dump(res, open('out/toc-pages.json', 'w'))
print(len(res), 'de', len(heads), 'toc', start + 1, '-', toc_end + 1, 'paginas', len(doc))
