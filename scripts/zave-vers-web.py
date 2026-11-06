#!/usr/bin/env python3
"""Convertit un magazine Aquafadas (.zave décompressé) pour le lecteur web public/zave/lecteur.js : données JSON, calques en WebP, médias.
Usage : python3 -I scripts/zave-vers-web.py DOSSIER_DECOMPRESSE public/zave/NUMERO "Titre". N'écrit que dans la sortie."""
import difflib, glob, html, json, os, re, shutil, sys, unicodedata
import xml.etree.ElementTree as ET
from PIL import Image
import fitz

def noms_nfc(dossier):
    # noms de fichiers du Mac (décomposés) : une URL précomposée doit les trouver, y compris sur un serveur Linux
    for r, _, fichiers in os.walk(dossier):
        for n in fichiers:
            c = unicodedata.normalize('NFC', n)
            if c != n:
                os.rename(os.path.join(r, n), os.path.join(r, '__nfc'))
                os.rename(os.path.join(r, '__nfc'), os.path.join(r, c))

K = 2  # les calques sont rendus deux fois plus grands que leur taille à l'écran
fitz.TOOLS.mupdf_display_errors(False)
racine, sortie = sys.argv[1:3]
racine_xml = ET.parse(os.path.join(racine, 'magazine.xml')).getroot()
STYLES = {e.get('name'): e.attrib for e in racine_xml.find('textStyles')}
FICHIERS_POLICES = glob.glob(os.path.join(racine, '**', '*.otf'), recursive=True)
polices = {}

def police(nom):
    """Fichier de police le plus proche du nom utilisé par le magazine, copié une seule fois."""
    if nom in polices or not FICHIERS_POLICES: return
    tiges = {os.path.splitext(os.path.basename(p))[0]: p for p in FICHIERS_POLICES}
    m = difflib.get_close_matches(nom, list(tiges), 1, .6)
    if m:
        os.makedirs(os.path.join(sortie, 'fonts'), exist_ok=True); shutil.copyfile(tiges[m[0]], os.path.join(sortie, 'fonts', m[0] + '.otf')); polices[nom] = m[0]

def texte_riche(e):
    morceaux = []
    for span in e.iter('span'):
        st = STYLES.get(span.get('textStyle'), {}); css = []
        if st.get('textFont'):
            police(st['textFont']); css.append(f"font-family:'{st['textFont']}',Georgia,serif")
        if st.get('textSize'): css.append(f"font-size:{st['textSize']}px")
        if st.get('textColor'): css.append(f"color:{st['textColor'][:7]}")
        if st.get('textAlignment'): css.append(f"text-align:{st['textAlignment']}")
        # les retours à la ligne d'origine sont souvent des suites d'espaces : le HTML les écraserait
        contenu = re.sub(r' {4,}', '<br>', html.escape(span.text or '')) + ('<br>' if span.find('br') is not None else '')
        morceaux.append(f'<span style="{";".join(css)}">{contenu}</span>')
    return ''.join(morceaux)

def est_detourage_blanc(p):
    """JPEG au fond blanc : posé sur du texte, il doit le laisser voir."""
    if not p.lower().endswith(('.jpg', '.jpeg')): return False
    a = Image.open(p).convert('L'); w, h = a.size
    if w < 4 or h < 4: return False
    # tout le pourtour doit être blanc : des coins blancs ne suffisent pas
    bord = [a.getpixel((x, y)) for x in range(0, w, max(1, w // 40)) for y in (0, h - 1)] + [a.getpixel((x, y)) for y in range(0, h, max(1, h // 40)) for x in (0, w - 1)]
    if sum(v >= 245 for v in bord) < .97 * len(bord): return False
    # et le blanc doit occuper une bonne part de l'image : sinon c'est une photo à filet blanc, à ne pas fondre
    g = a.resize((64, 64)).getdata()
    return sum(v >= 245 for v in g) >= .35 * len(g)
for d in ('img', 'media'): os.makedirs(os.path.join(sortie, d), exist_ok=True)
nb = 0
PAGE_EN_COURS = [1024, 768]
BILAN = {'pdf': 0, 'decales': 0, 'objets': 0, 'vides': []}

def num(e, a, d=0.0):
    try: return float(e.get(a, d))
    except ValueError: return d

def couleur(v):
    if not v or len(v) not in (7, 9): return None
    a = int(v[7:9], 16) / 255 if len(v) == 9 else 1
    return None if a == 0 else f'rgba({int(v[1:3], 16)},{int(v[3:5], 16)},{int(v[5:7], 16)},{a:.2f})'

def act(a):
    o = {'c': a.get('name'), **{p.get('name'): p.text for p in a.findall('parameter')}}
    if a.get('name') == 'actionWithId': o['liste'] = a.findtext('actionData/actionId')
    if a.get('name') == '805':
        u = next(a.iter('url'), None); o['url'] = u.text.strip() if u is not None and u.text else None
    return o

def actions(e, cle):
    return [act(a) for a in (e.findall(f'./{cle}/action') if cle != 'tap' else [x for b in e.findall('actions') if b.get('id') != 'finished' for x in b.findall('action')])]

def fin(e):
    return [act(a) for b in e.findall('actions') if b.get('id') == 'finished' for a in b.findall('action')]

def chemin(e):
    f = e.find('fileSource')
    if f is None or not f.get('path'): f = e.find('thumbSource')   # certaines images n'ont leur fichier que là
    return os.path.join(racine, f.get('path')) if f is not None and f.get('path') else None

def image(p, nom):
    """Image source en WebP, sans dépasser le double de sa taille utile."""
    global nb
    a = Image.open(p); a.load()
    if max(a.size) > 2048: a.thumbnail((2048, 2048), Image.LANCZOS)
    a = a.convert('RGBA' if a.mode in ('RGBA', 'LA', 'P') else 'RGB')
    if max(a.size) > 16383 or min(a.size) < 1: a.thumbnail((2048, 2048))
    a.save(os.path.join(sortie, 'img', nom + '.webp'), quality=86, method=4); nb += 1
    return f'img/{nom}.webp'

def media(p):
    nom = re.sub(r'[^A-Za-z0-9._-]+', '-', os.path.basename(os.path.dirname(p)) + '-' + os.path.basename(p)); shutil.copyfile(p, os.path.join(sortie, 'media', nom)); return f'media/{nom}'

def rect_contenu(c, x, y, w, h):
    if c is None: return [0, 0, w, h]
    if c.get('relativeWidth') and not num(c, 'relativeWidth'): return [0, 0, w, h]   # taille 0 : l'image remplit son cadre
    if c.get('relativeWidth'): return [num(c, 'relativeX') * w, num(c, 'relativeY') * h, num(c, 'relativeWidth', 1) * w, num(c, 'relativeHeight', 1) * h]
    if c.get('width'): return [num(c, 'x') - x, num(c, 'y') - y, num(c, 'width'), num(c, 'height')]
    return [0, 0, w, h]

def proportion(c, ri):
    # cadrage aux proportions fausses (SFR 11, fin du travelling) : on l'agrandit autour de son centre jusqu'à la proportion de l'image
    x, y, cw, ch = c
    if not ch or abs(cw / ch / ri - 1) < .05: return c
    nw, nh = (ch * ri, ch) if ch * ri > cw else (cw, cw / ri)
    return [x + (cw - nw) / 2, y + (ch - nh) / 2, nw, nh]

def cadrage_diapo(ct, q, w, h):
    # relative* et landscape_relative* : selon les numéros, l'un des deux porte le vrai cadrage, l'autre vaut 0, 0, 1, 1
    # ou des restes. On garde celui qui respecte la proportion de l'image. relativeX/Y place le cadre dans l'image :
    # l'image part dans le sens inverse. Faute de cadrage juste, l'image remplit la case, centrée, sans déformation.
    with Image.open(q) as a: ri = a.width / a.height
    for pre in ('relative', 'landscape_relative'):
        if ct is None or not num(ct, pre + 'Width') or not num(ct, pre + 'Height'): continue
        cw, ch = num(ct, pre + 'Width') * w, num(ct, pre + 'Height') * h
        if abs(cw / ch / ri - 1) < .05: return [-num(ct, pre + 'X') * w, -num(ct, pre + 'Y') * h, cw, ch]
    cw, ch = (h * ri, h) if ri > w / h else (w, w / ri)
    return [(w - cw) / 2, (h - ch) / 2, cw, ch]

def calque(e):
    t, i = e.tag, e.get('id')
    x, y, w, h = num(e, 'x'), num(e, 'y'), num(e, 'width'), num(e, 'height')
    o = {'t': t, 'id': i, 'x': x, 'y': y, 'w': w, 'h': h, 'cache': e.get('hidden') == '1'}
    if (b := couleur(e.get('backgroundColor'))) and t in ('image', 'pdf'): o['fond'] = b
    if g := e.get('groupIds'): o['g'] = [x.strip() for x in g.split(',') if x.strip()]
    if a := actions(e, 'tap'): o['tap'] = a
    if a := fin(e): o['fin'] = a
    p = chemin(e)
    if t == 'toggleButton':
        # bouton à bascule : son image de repos, ses actions au clic
        d = e.find('defaultImage'); p = chemin(d) if d is not None else None; t = o['t'] = 'image'
    nom = (i or 'x').replace('/', '_')
    if t == 'pdf':
        if not p or not os.path.isfile(p) or w <= 0 or h <= 0: return o if o.get('fond') else None
        pg = fitz.open(p)[int(e.get('pageIndex', 0))]
        pw, ph = pg.rect.width, pg.rect.height
        if pw >= PAGE_EN_COURS[0] - 1 and ph >= PAGE_EN_COURS[1] - 1:
            # PDF de page : la boîte du calque sert de fenêtre ; dans un sous-document, il déborde d'une marge égale de chaque côté
            mx, my = (pw - PAGE_EN_COURS[0]) / 2, (ph - PAGE_EN_COURS[1]) / 2
            if abs(mx) < .6: mx = 0
            if abs(my) < .6: my = 0
            ech = min(K, 16000 / max(w, h))   # WebP ne dépasse pas 16 383 px de côté
            px = pg.get_pixmap(matrix=fitz.Matrix(ech, ech), alpha=True, clip=fitz.Rect(x + mx, y + my, x + mx + w, y + my + h))
            if mx or my: BILAN['decales'] += 1
        else:
            # PDF d'objet : il ne contient que le calque, posé selon son <content>
            c = e.find('content'); cw = num(c, 'width', w) if c is not None else w; ch = num(c, 'height', h) if c is not None else h
            if cw <= 0 or ch <= 0: cw, ch = w, h
            o['c'] = [num(c, 'x') if c is not None else 0, num(c, 'y') if c is not None else 0, cw, ch]
            ech = min(K, 16000 / max(cw, ch))
            px = pg.get_pixmap(matrix=fitz.Matrix(ech * cw / pw, ech * ch / ph), alpha=True)
            BILAN['objets'] += 1
        if not any(px.samples[3::4]): BILAN['vides'].append(i)
        BILAN['pdf'] += 1
        if px.width < 1 or px.height < 1 or px.width > 16383 or px.height > 16383:
            print('calque PDF ignoré', i, px.width, px.height); BILAN['vides'].append(i); return o if o.get('fond') else None
        Image.frombytes('RGBa', (px.width, px.height), px.samples).convert('RGBA').save(os.path.join(sortie, 'img', nom + '.webp'), quality=88, method=4)
        o['src'] = f'img/{nom}.webp'
    elif t == 'image':
        if p and os.path.isfile(p):
            o['src'] = image(p, nom); o['c'] = rect_contenu(e.find('content'), x, y, w, h)
            # cadre plus large ou plus haut que l'image (bande @2x de Panoramik 1) : l'image garde sa proportion, calée en haut à gauche
            with Image.open(p) as a0: ri = a0.width / a0.height
            cx, cy, cw, ch = o['c']
            if cw >= 40 and ch >= 40 and min(a0.size) >= 8 and abs(cw / ch / ri - 1) > .05:
                k = min(cw / ri, ch); o['c'] = [cx, cy, k * ri, k]
            # image agrandissable : fileSource est l'original entier, thumbSource son recadrage pour le cadre
            th = e.find('thumbSource'); pt = os.path.join(racine, th.get('path')) if th is not None and th.get('path') else None
            if e.get('fullScreen') == '1' and pt and os.path.isfile(pt) and w and h:
                with Image.open(p) as a0: rf = a0.width / a0.height
                if abs(rf / (w / h) - 1) > .05: o['hd'] = o['src']; o['src'] = image(pt, nom + '-c'); o['c'] = [0, 0, w, h]
            if (kb := e.find('kenBurns')) is not None and num(kb, 'duration') > 1: o['kb'] = {'d': num(kb, 'duration'), 'a': num(kb, 'amplitude', .1)}
            # décor pleine page sans original plus grand : l'agrandir ne montre que la même image sans les textes posés dessus (golf du Canal+ 127)
            if e.get('fullScreen') == '1' and not o.get('tap') and (o.get('hd') or w < PAGE_EN_COURS[0] - 1 or h < PAGE_EN_COURS[1] - 1): o['plein'] = True
            if not o['cache'] and (w < 1000 or h < 700) and est_detourage_blanc(p): o['mult'] = True
    elif t == 'video':
        if not p or not os.path.isfile(p): return None
        o['src'] = media(p); o['auto'] = e.get('autoPlay') == '1'; o['boucle'] = e.get('loop') == '1'; o['ferme'] = e.get('closeAtEnd') == '1'; o['sansBarre'] = e.get('hiddenControlBar') == '1'
        if e.get('fullScreenOnly') == '1': o['seulPlein'] = True   # l'iPad la joue en plein écran : son cadre n'est qu'un repère (L'art de croire, 60 × 45 px)
        al = e.find('alternateImage/image')
        if al is not None and (q := chemin(al)) and os.path.isfile(q): o['affiche'] = image(q, nom + '-affiche')
    elif t == 'audio':
        if not p or not os.path.isfile(p): return None
        o['src'] = media(p); o['boucle'] = e.get('loop') == '1'; o['auto'] = e.get('autoPlay') == '1' or f'auto:{i}' in sys.argv[4:]   # auto:ID force la lecture d'un son que le fichier ne déclenche pas
        if o['auto'] and os.path.getsize(p) < 10000: o['bref'] = True  # son minuteur quasi instantané
    elif t == 'imageCollection':
        sh, kb = e.find('slideshow'), e.find('kenBurns')
        if sh is not None: o['auto'] = {'d': num(sh, 'imageDuration', 3), 't': num(sh, 'transitionDuration', 1), 'effet': sh.get('effect')}
        if kb is not None and num(kb, 'duration') > 1: o['kb'] = {'d': num(kb, 'duration'), 'a': num(kb, 'amplitude', .1)}
        o['t'] = 'diapos'; o['depart'] = int(num(e, 'startIndex')); o['points'] = e.get('showPageControl') == '1'; o['fondCase'] = couleur(e.get('cellBackgroundColor')); o['diapos'] = []
        for k, d in enumerate(e.findall('./images/image')):
            q = chemin(d)
            if not q or not os.path.isfile(q): continue
            cap = d.find('simpleCaption')
            ct = d.find('content'); fin_c = cadrage_diapo(ct, q, w, h)
            depart_c = None
            # useAltCrop : l'image glisse de sa position de départ vers son cadrage final
            if ct is not None and ct.get('useAltCrop') == '1' and ct.get('relativeAltWidth'):
                # ces décalages déplacent le cadre dans l'image, donc l'image dans le sens inverse
                with Image.open(q) as a0: ri = a0.width / a0.height
                cale = lambda cx, cy, cw, ch: proportion([-num(ct, cx) * w, -num(ct, cy) * h, num(ct, cw, 1) * w, num(ct, ch, 1) * h], ri)
                depart_c = cale('relativeX', 'relativeY', 'relativeWidth', 'relativeHeight'); fin_c = cale('relativeAltX', 'relativeAltY', 'relativeAltWidth', 'relativeAltHeight')
            o['diapos'].append({'src': image(q, f'{nom}-{k}'), 'c': fin_c, 'c0': depart_c, 'legende': (cap.text or '') if cap is not None else '', 'vue': actions(d, 'scrollActions')})
        # diaporama de commande : images transparentes, posé sur le vrai ; son fond de case le masquerait
        if o['diapos'] and any(Image.open(os.path.join(sortie, d['src'])).convert('RGBA').getchannel('A').getextrema()[0] < 250 for d in o['diapos']): o['fondCase'] = None   # images détourées : pas d'aplat de case autour
    elif t == 'richText':
        o['t'] = 'texte'; o['html'] = texte_riche(e)
        if not o['html']:
            # bloc sans texte : il ne reste que son aplat, parfois le fond de toute la page
            if not (b := couleur(e.get('backgroundColor'))): return None
            o['t'] = 'aplat'; o['fond'] = b; del o['html']
    elif t == 'imageComparator':
        o['t'] = 'compare'
        for cle, bal in (('av', 'comparatorBefore'), ('ap', 'comparatorAfter')):
            d = e.find(f'{bal}/image'); q = chemin(d) if d is not None else None
            if not q or not os.path.isfile(q): return None
            o[cle] = {'src': image(q, f'{nom}-{cle}'), 'c': rect_contenu(d.find('content'), 0, 0, w, h)}
    elif t == 'webView':
        o['t'] = 'web'; u = (e.findtext('url') or '').strip(); f = e.find('fileSource'); rel = u or (f.get('path') if f is not None else '')
        if not rel: return None
        if rel.startswith('http'): o['url'] = rel
        else:
            q = os.path.join(racine, rel)
            if not os.path.exists(q): return None
            dossier = os.path.dirname(q) if os.path.isfile(q) else q
            html_ = os.path.basename(q) if os.path.isfile(q) else next((x for x in sorted(os.listdir(q)) if x.lower().endswith(('.html', '.htm'))), None)
            if not html_: return None
            shutil.copytree(dossier, os.path.join(sortie, 'web', nom), dirs_exist_ok=True); o['url'] = f'web/{nom}/{html_}'; noms_nfc(os.path.join(sortie, 'web', nom))
    elif t == 'animatedImage':
        o['t'] = 'anime'; aa = e.find('autoAnimation'); o['boucle'] = aa is not None and aa.get('loop') == '1'; o['pas'] = num(aa, 'frameRate', 1 / 24) if aa is not None else 1 / 24
        o['vues'] = [image(os.path.join(racine, q.get('path')), f'{nom}-v{k}') for k, q in enumerate(e.findall('fileSources/fileSource')) if q.get('path') and os.path.isfile(os.path.join(racine, q.get('path')))]
        if not o['vues']: return None
    elif t == 'multipleDragDrop':
        # glisser-déposer : chaque vignette (curseur) lâchée sur sa zone lance les actions de la zone
        o['t'] = 'glisser'; o['items'] = []
        for it in e.findall('./dragItems/dragItem'):
            c = it.find('./cursor/objectReference')
            zones = [{'boite': z.find('./box/objectReference').get('id'), 'actions': [act(a) for a in z.findall('./actions/action')]} for z in it.findall('./actionZones/actionZone') if z.find('./box/objectReference') is not None]
            if c is not None: o['items'].append({'curseur': c.get('id'), 'zones': zones})
    elif t == 'actionConcentrator':
        o['t'] = 'listes'; o['listes'] = {l.get('id'): [act(x) for x in l.findall('action')] for l in e.findall('actionLists/actionList')}; o['w'] = o['h'] = 0; o['cache'] = True
    elif t == 'marker':
        return {'t': 'ancre', 'id': i, 'nom': e.get('name'), 'x': x, 'y': y, 'w': 0, 'h': 0, 'cache': True, 'taille': 0, 'tw': w, 'th': h, 'on': actions(e, 'activateActions'), 'off': actions(e, 'deactivateActions'), 'g': [x.strip() for x in (e.get('groupIds') or '').split(',') if x.strip()]}
    elif t == 'subLayout':
        sp = e.findall('./internalSubLayout/subLayout/pages/page') or e.findall('./pages/page')
        if not sp: return None
        o['t'] = 'sous'; interne = e.find('./internalSubLayout/subLayout'); o['sens'] = int((interne.get('scrollDirection') if interne is not None else None) or e.get('scrollDirection') or 1)
        o['pages'] = []
        ancienne = PAGE_EN_COURS[:]
        for q in sp:
            PAGE_EN_COURS[:] = [num(q, 'width', w), num(q, 'height', h)]
            o['pages'].append({'l': PAGE_EN_COURS[0], 'h': PAGE_EN_COURS[1], 'calques': [c for c in (calque(z) for z in q) if c]})
        PAGE_EN_COURS[:] = ancienne
    else:
        return None
    an = e.find('animation')
    if an is not None: o['anim'] = {'auto': an.get('autoPlay') == '1', 'd': num(an, 'duration', 1), 'r': num(an, 'delay'), 'boucle': an.get('loop') == '1', 'fondu': an.get('fade'), 'ech': num(an, 'scaleX', 1), 'ch': [[num(q, 'anchorX'), num(q, 'anchorY')] for q in an.findall('./path/pathPoint')]}
    return o

articles = []
# Arguments après le titre : articles à écarter (page dont le contenu en ligne a disparu)
for a in racine_xml.iter('article'):
    if a.get('title', '') in sys.argv[4:]:
        continue
    pages = []
    for lay in a.findall('./layouts/layout')[:1]:
        for pg in lay.findall('page'):
            PAGE_EN_COURS[:] = [num(pg, 'width', 1024), num(pg, 'height', 768)]
            cal = [c for c in (calque(e) for e in pg) if c]
            pages.append({'l': num(pg, 'width', 1024), 'h': num(pg, 'height', 768), 'fond': couleur(pg.get('backgroundColor')) or '#fff', 'calques': cal, 'ouvre': [act(x) for x in pg.findall('./pageActions/pageDidAppears/action')]})
    articles.append({'id': int(a.get('id')), 'titre': a.get('title', ''), 'pages': pages})
open(os.path.join(sortie, 'fonts.css'), 'w').write(''.join(f"@font-face{{font-family:'{n}';src:url(fonts/{f}.otf)}}" for n, f in polices.items()))
titre = sys.argv[3] if len(sys.argv) > 3 else 'Magazine'
open(os.path.join(sortie, 'index.html'), 'w').write(f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>{titre}</title><link rel="stylesheet" href="../lecteur.css"><link rel="stylesheet" href="fonts.css"></head><body><div id="scene"></div><button class="nav" id="g" aria-label="Article précédent">←</button><button class="nav" id="d" aria-label="Article suivant">→</button><button class="nav" id="h" aria-label="Page précédente">↑</button><button class="nav" id="b" aria-label="Page suivante">↓</button><button id="son">Activer le son</button><script src="../lecteur.js"></script></body></html>')
def sans_mult_superpose(l):
    # une carte blanche posée exactement sur une autre image en est un état : elle doit rester opaque
    for k, o in enumerate(l):
        if o.get('mult') and any((p['x'], p['y'], p['w'], p['h']) == (o['x'], o['y'], o['w'], o['h']) for p in l[:k]): del o['mult']
        for q in o.get('pages', []): sans_mult_superpose(q['calques'])
for a in articles:
    for q in a['pages']: sans_mult_superpose(q['calques'])
json.dump({'articles': articles}, open(os.path.join(sortie, 'data.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(articles), 'articles', sum(len(a['pages']) for a in articles), 'pages')
print('calques PDF', BILAN['pdf'], 'avec marge', BILAN['decales'], 'objets', BILAN['objets'], 'vides', len(BILAN['vides']), BILAN['vides'][:12])
