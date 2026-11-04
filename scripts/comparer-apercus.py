#!/usr/bin/env python3
"""Compare les captures zc<numero>/ aux aperçus d'origine : cmp<numero>.png montre les 15 plus gros écarts.

python3 -I comparer-apercus.py numero DOSSIER_X [article ...]
Les titres d'articles écartés à la conversion se passent après le dossier, pour garder la numérotation.
"""
import sys
import xml.etree.ElementTree as ET
from PIL import Image, ImageChops, ImageDraw, ImageStat

n, x = sys.argv[1:3]
ecartes = sys.argv[3:]
racine = ET.parse(f'{x}/magazine.xml').getroot()
k, ecarts = 0, []
for a in racine.iter('article'):
    if a.get('title', '') in ecartes:
        continue
    for q, pg in enumerate(a.findall('./layouts/layout')[0].findall('page')):
        k += 1
        try:
            apercu = Image.open(f'{x}/{pg.get("preview")}').convert('RGB')
        except Exception:
            continue
        rendu = Image.open(f'zc{n}/{k:03d}.jpg').convert('RGB').resize(apercu.size)
        d = sum(ImageStat.Stat(ImageChops.difference(apercu, rendu)).mean) / 3
        ecarts.append((round(d, 1), k, a.get('title', '')[:22], q, apercu, rendu))
ecarts.sort(key=lambda e: -e[0])
print(n, [e[:4] for e in ecarts[:10]], 'médiane', ecarts[len(ecarts) // 2][0] if ecarts else '-')
o = Image.new('RGB', (518 * 3, 192 * 5), '#333')
for i, e in enumerate(ecarts[:15]):
    u, v = i % 3 * 518, i // 3 * 192
    o.paste(e[4].resize((256, 192)), (u, v))
    o.paste(e[5].resize((256, 192)), (u + 256, v))
    ImageDraw.Draw(o).text((u + 3, v + 3), f'{e[1]} d{e[0]} {e[2]}', fill='red')
o.save(f'cmp{n}.png')
