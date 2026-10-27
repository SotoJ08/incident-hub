from PIL import Image
import glob, os
os.makedirs('img/orig', exist_ok=True)
for f in sorted(glob.glob('img/0*.jpg')):
    base = os.path.basename(f)
    o = os.path.join('img/orig', base)
    if not os.path.exists(o):
        Image.open(f).save(o, quality=95)
    im = Image.open(o).convert('RGB')
    w, h = im.size
    bg = im.getpixel((w - 3, h - 3))
    px = im.load()
    bottom = 0
    for y in range(h - 1, -1, -1):
        if any(max(abs(px[x, y][i] - bg[i]) for i in range(3)) > 12 for x in range(0, w, 2)):
            bottom = y
            break
    crop = im.crop((0, 0, w, min(h, bottom + 28)))
    crop.save(f, quality=95)
    print(base, (w, h), '->', crop.size)
