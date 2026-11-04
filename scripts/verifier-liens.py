#!/usr/bin/env python3
"""Teste chaque lien (800) et fenêtre web (805) d'une liseuse et l'annote pour le lecteur :
  morte : le site ou la vidéo n'existe plus → le lien est désactivé ;
  cadre : adresse https qu'on peut afficher dans une fenêtre par-dessus le magazine (sinon nouvel onglet).
python3 -I verifier-liens.py SORTIE/numero [SORTIE/numero ...]   (remplace marquer-videos-mortes.py)
Une réponse douteuse (délai, blocage anti-robot) ne désactive jamais un lien.
"""
import json, re, sys, urllib.request, urllib.error, ssl
from concurrent.futures import ThreadPoolExecutor

UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15', 'Accept-Language': 'fr', 'Cookie': 'CONSENT=YES+1'}
CACHE = {}

def youtube(u):
    m = re.search(r'(?:youtube\.com/embed/|youtu\.be/|[?&]v=)([\w-]{11})', u)
    return m.group(1) if m else None

def examiner(u):
    i = youtube(u)
    if i:
        try:
            page = urllib.request.urlopen(urllib.request.Request(f'https://www.youtube.com/watch?v={i}&hl=fr', headers=UA), timeout=20).read().decode('utf8', 'ignore')
            etat = (re.search(r'"playabilityStatus":\{"status":"(\w+)"', page) or [None, '?'])[1]
        except Exception:
            etat = '?'
        if etat in ('LOGIN_REQUIRED', 'ERROR', 'UNPLAYABLE'): return {'morte': True}
        return {'cadre': f'https://www.youtube.com/embed/{i}?autoplay=1&rel=0'}
    if not re.match(r'https?://', u) or re.search(r'facebook\.com/dialog|twitter\.com/intent|plus\.google\.com/share', u):
        return {}
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=15, context=ssl.create_default_context())
        h = {k.lower(): v for k, v in r.headers.items()}; final = r.geturl()
    except urllib.error.HTTPError as e:
        return {'morte': True} if e.code in (404, 410) else {}
    except urllib.error.URLError as e:
        raison = str(e.reason).lower()
        return {'morte': True} if any(x in raison for x in ('name or service', 'nodename', 'not known', 'refused', 'no address')) else {}
    except Exception:
        return {}
    xfo = h.get('x-frame-options', '').lower(); csp = h.get('content-security-policy', '').lower()
    interdit = xfo in ('deny', 'sameorigin') or ('frame-ancestors' in csp and not re.search(r"frame-ancestors[^;]*\*", csp))
    return {} if interdit or not final.startswith('https://') else {'cadre': final}

def annoter(o):
    if isinstance(o, list):
        for x in o: annoter(x)
    elif isinstance(o, dict):
        if o.get('c') in ('800', '805') and o.get('url'):
            o.pop('morte', None); o.pop('cadre', None); o.update(CACHE.get(o['url'], {}))
        elif o.get('t') == 'web' and youtube(str(o.get('url'))):
            o.pop('morte', None)
            if CACHE.get(o['url'], {}).get('morte'): o['morte'] = True
        for v in o.values(): annoter(v)

def urls(o, l):
    if isinstance(o, list):
        for x in o: urls(x, l)
    elif isinstance(o, dict):
        if (o.get('c') in ('800', '805') or (o.get('t') == 'web' and youtube(str(o.get('url'))))) and o.get('url'): l.add(o['url'])
        for v in o.values(): urls(v, l)

dossiers = [d.rstrip('/') for d in sys.argv[1:]]
donnees = {d: json.load(open(d + '/data.json')) for d in dossiers}
tous = set()
for d in donnees.values(): urls(d, tous)
with ThreadPoolExecutor(16) as ex:
    for u, r in zip(sorted(tous), ex.map(examiner, sorted(tous))): CACHE[u] = r
for d, j in donnees.items():
    annoter(j); json.dump(j, open(d + '/data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    l = set(); urls(j, l)
    print(d.split('/')[-1], len(l), 'liens | morts', sum(1 for u in l if CACHE[u].get('morte')), '| en fenêtre', sum(1 for u in l if CACHE[u].get('cadre')))
