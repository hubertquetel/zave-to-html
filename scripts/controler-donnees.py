#!/usr/bin/env python3
"""Contrôle le data.json d'une ou plusieurs liseuses, sans navigateur.

  python3 -I controler-donnees.py SORTIE/numero [SORTIE/autre ...]

Signale :
- les images et diapos affichées avec une proportion différente de leur fichier (> 5 %, cadres d'au moins 40 px :
  les zones cliquables de 1 × 1 px et les petites icônes ne comptent pas) ;
- les sauts 801 vers une rubrique ou une page qui n'existe pas (articleId "0" = rubrique en cours) ;
- les décors pleine page agrandissables sans original plus grand (le plein écran les montrerait sans leurs textes).
Code de sortie 1 s'il y a quelque chose à regarder.
"""
import json, os, sys
from PIL import Image

def calques(o):
    if isinstance(o, dict):
        if 't' in o and 'id' in o: yield o
        for v in o.values(): yield from calques(v)
    elif isinstance(o, list):
        for v in o: yield from calques(v)

def actions(o):
    if isinstance(o, dict):
        if 'c' in o and isinstance(o['c'], str): yield o
        for v in o.values(): yield from actions(v)
    elif isinstance(o, list):
        for v in o: yield from actions(v)

def ecart(dossier, src, c):
    if not c or c[2] < 40 or c[3] < 40: return None
    with Image.open(os.path.join(dossier, src)) as a: W, H = a.size
    if min(W, H) < 8: return None
    e = (c[2] / c[3]) / (W / H)
    return round(e, 2) if abs(e - 1) > .05 else None

probleme = False
for dossier in sys.argv[1:]:
    d = json.load(open(os.path.join(dossier, 'data.json')))
    A = d['articles']; ids = {a['id']: a for a in A}
    lignes = []
    for ai, a in enumerate(A):
        for pj, p in enumerate(a['pages']):
            ou = f"{a['titre'] or '(sans titre)'} p{pj}"
            for o in calques(p):
                if o['t'] == 'diapos':
                    for k, s in enumerate(o['diapos']):
                        for cle in ('c', 'c0'):
                            if (e := ecart(dossier, s['src'], s.get(cle))): lignes.append(f'{ou} : diapo {o["id"]}[{k}] {cle} déformée ×{e}')
                elif o['t'] == 'image' and o.get('src'):
                    if (e := ecart(dossier, o['src'], o.get('c'))): lignes.append(f'{ou} : image {o["id"]} déformée ×{e}')
                    if o.get('plein') and not o.get('hd') and o['w'] >= p.get('l', 1024) - 1 and o['h'] >= p.get('h', 768) - 1:
                        lignes.append(f'{ou} : décor pleine page agrandissable {o["id"]}')
            for x in actions(p):
                if x['c'] != '801' or x.get('articleId') in (None, ''): continue
                t = a if x['articleId'] == '0' else ids.get(int(x['articleId']))
                pi = int(x.get('pageIndex') or 0)
                if t is None or pi >= len(t['pages']): lignes.append(f'{ou} : saut vers rubrique {x["articleId"]} page {pi} inexistante')
    print(os.path.basename(dossier.rstrip('/')), 'RAS' if not lignes else f'{len(lignes)} point(s)')
    for l in lignes: print('   ', l)
    probleme |= bool(lignes)
sys.exit(1 if probleme else 0)
