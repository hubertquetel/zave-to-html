// Lecteur web des magazines Aquafadas : rejoue les pages, calques et actions du magazine.xml converti par scripts/zave-vers-web.py.
// Actions : 800 lien, 801 aller à une page, 802 aller à une diapo, 804 montrer/masquer un calque ou un groupe, 812 lancer un média, 813 arrêter un média, 814 mettre en pause, 803 plein écran, 805 fenêtre web, 818 lancer et 819 arrêter une animation, actionWithId liste d'actions, 820 aller à une ancre.
(async () => {
  const base = document.currentScript?.dataset.base || location.pathname.replace(/[^/]*$/, '');
  const data = await (await fetch(base + 'data.json')).json();
  const scene = document.getElementById('scene'), [g, d, h, b, son] = ['g', 'd', 'h', 'b', 'son'].map(i => document.getElementById(i));
  const W = 1024, H = 768, articles = data.articles;
  let a = 0, p = 0, page = null, muet = false, parId = new Map(), parGroupe = new Map(), immediats = [], glissers = [];
  // ancres : le nom mène à un article, une page et, dans un sous-document, à un calque
  const ancres = new Map();
  const relever = (liste, i, j) => { for (const o of liste) { if (o.t === 'ancre' && o.nom && !ancres.has(o.nom)) ancres.set(o.nom, { i, j, id: o.id }); if (o.t === 'sous') o.pages.forEach(q => relever(q.calques, i, j)); } };
  articles.forEach((t, i) => t.pages.forEach((q, j) => relever(q.calques, i, j)));
  const ajuster = () => { const k = Math.min(innerWidth / W, innerHeight / H); scene.style.cssText = `width:${W}px;height:${H}px;transform:scale(${k}) translate(-50%,-50%)`; };
  addEventListener('resize', ajuster); ajuster();

  // le navigateur refuse le son avant le premier clic dans le cadre : on garde les médias refusés pour les relancer à ce clic
  const attente = new Set();
  let coupe = false;
  son.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path class="onde" d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/><path class="barre" d="M17 9.5l5 5M22 9.5l-5 5"/></svg>';
  const majSon = () => { const off = muet || coupe; son.classList.toggle('coupe', off); son.setAttribute('aria-label', off ? 'Activer le son' : 'Couper le son'); son.title = son.getAttribute('aria-label'); const present = !!page?.querySelector('video,audio:not([data-bref])'); son.style.display = present ? 'block' : 'none'; if (parent !== window) parent.postMessage({ zaveSon: [present, off] }, location.origin); };
  const appliquerSon = () => { page?.querySelectorAll('video,audio').forEach(v => { v.muted = muet || coupe; }); majSon(); };
  const lancer = m => { m.muted = muet || coupe; const q = m.play(); q?.catch(e => { if (e.name !== 'NotAllowedError') return; attente.add(m); muet = true; majSon(); m.muted = true; m.play().catch(() => {}); }); };   // muet, un son joue quand même : il fait avancer le scénario qu'il enchaîne
  const remettreSon = () => { muet = false; appliquerSon(); attente.forEach(m => { if (m.isConnected && !m.ended) { m.muted = coupe; m.play().catch(() => {}); } }); attente.clear(); };
  son.onclick = () => { if (muet) { coupe = false; remettreSon(); } else { coupe = !coupe; appliquerSon(); } };
  for (const t of ['click', 'touchend', 'keydown']) addEventListener(t, e => { if (muet && !son.contains(e.target)) remettreSon(); }, true);

  // seul le sous-document défile : jamais la page qui contient le lecteur
  // beaucoup d'ancres sont posées quelques pixels à côté de la page (778 pour 768) : on les ramène sur la page
  const cale = (v, w) => { const r = Math.round(v / w) * w; return Math.abs(v - r) <= w * .025 ? r : v; };
  const placer = c => { const z = c?.closest('.sous'); if (!z) return; const q = c.getBoundingClientRect(), r = z.getBoundingClientRect(), k = r.width / z.offsetWidth; z.scrollTo({ left: cale(z.scrollLeft + (q.left - r.left) / k, z.clientWidth), top: cale(z.scrollTop + (q.top - r.top) / k, z.clientHeight), behavior: 'smooth' }); };
  function visible(k, oui, fondu) {
    if (k.classList.contains('ancre') || k.dataset.efface) return;
    const m = k.querySelector(':scope > video, :scope > audio');
    if (!oui) m?.pause();
    k.fondu?.cancel(); k.fondu = null;   // un ordre annule le fondu encore en cours
    if (oui) { const etait = k.hidden; k.hidden = false; if (m?.dataset.auto) { m.currentTime = 0; lancer(m); } if (fondu && etait) k.fondu = k.animate([{ opacity: 0 }, { opacity: 1 }], fondu * 1000); }
    else if (fondu && !k.hidden) { k.fondu = k.animate([{ opacity: 1 }, { opacity: 0 }], fondu * 1000); k.fondu.onfinish = () => { k.hidden = true; k.fondu = null; }; }
    else k.hidden = true;
  }
  // plein écran : l'image, ou le diaporama à son image en cours
  // fenêtre par-dessus le magazine : toujours une croix bien visible, et Échap ; changer de page la referme
  const fermer = () => document.getElementById('plein')?.remove();
  const fermable = o => { const b = document.createElement('button'); b.className = 'fermer'; b.setAttribute('aria-label', 'Fermer'); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'; o.append(b); o.onclick = fermer; scene.append(o); };
  function plein(c) {
    const l = c.sources || [...c.querySelectorAll(':scope > img')].map(i => i.getAttribute('src')); if (!l.length) return; let n = c.lire ? c.lire() : 0;
    const o = document.createElement('div'); o.id = 'plein'; const im = new Image(); const voir = () => { im.src = l[n]; }; voir(); o.append(im);
    if (l.length > 1) for (const [t, d] of [['←', -1], ['→', 1]]) { const b = document.createElement('button'); b.textContent = t; b.className = d < 0 ? 'av' : 'ap'; b.onclick = v => { v.stopPropagation(); n = (n + d + l.length) % l.length; voir(); }; o.append(b); }
    fermable(o);
  }
  function fenetre(url) { const o = document.createElement('div'); o.id = 'plein'; const f = document.createElement('iframe'); f.src = /^http/.test(url) ? url : base + url; f.setAttribute('allow', 'autoplay; fullscreen'); o.append(f); fermable(o); }
  function agir(liste) {
    for (const x of liste || []) {
      const c = parId.get(x.contentId);
      if (x.c === '804') {
        const cibles = x.groupId ? (parGroupe.get(x.groupId) || []) : (c ? [c] : []);
        // hidden : 0 montrer, 1 masquer, 2 inverser
        for (const k of cibles) visible(k, x.hidden === '2' ? k.hidden : x.hidden !== '1', Math.max(0, +x.fadeDuration || 0));
      }
      else if (x.c === '812') { const m = c?.querySelector('video,audio'); if (m) { c.hidden = false; if (!m.dataset.enPause) m.currentTime = 0; delete m.dataset.enPause; lancer(m); } }
      else if (x.c === '813') { const m = c?.querySelector('video,audio'); if (m) { m.pause(); m.currentTime = 0; } }
      else if (x.c === '814') { const m = c?.querySelector('video,audio'); if (m) { m.pause(); m.dataset.enPause = '1'; } }
      else if (x.c === '803') { if (c) plein(c); }
      else if (x.c === '801') { const i = x.articleId === '0' ? a : articles.findIndex(t => t.id === +x.articleId); if (i >= 0) aller(i, +x.pageIndex || 0); }   // articleId 0 : la rubrique en cours
      else if (x.c === '802') c?.versDiapo?.(+x.index || 0);
      else if (x.c === '819') { if (c) { c.style.animation = 'none'; c.arreter?.(); } }
      else if (x.c === '818') { if (c) { c.hidden = false; c.style.animation = 'none'; c.offsetWidth; c.style.animation = c.animDef || ''; c.lancer?.(); } }
      else if (x.c === 'actionWithId') agir(c?.listes?.[x.liste]);
      // liens : désactivés s'ils sont morts, dans une fenêtre par-dessus le magazine si le site l'accepte, sinon dans un nouvel onglet
      else if ((x.c === '800' || x.c === '805') && x.morte) { /* lien mort : rien */ }
      else if ((x.c === '800' || x.c === '805') && x.cadre) fenetre(x.cadre);
      else if (x.c === '805' && x.url && !/^https?:/.test(x.url)) fenetre(x.url);
      else if (x.c === '805' && x.url) open(x.url, '_blank', 'noopener');
      else if (x.c === '820') { const v = ancres.get(x.anchorName); if (v) { if (v.i !== a || v.j !== p) aller(v.i, v.j); requestAnimationFrame(() => placer(parId.get(v.id))); } }
      else if (x.c === '800' && x.url && /^https?:/.test(x.url)) open(x.url, '_blank', 'noopener');
    }
  }
  const imgDans = (src, c, w, h) => { const i = new Image(); i.src = base + src; i.alt = ''; i.draggable = false; const r = c || [0, 0, w, h]; i.style.cssText = `left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px`; return i; };

  // sous-document : se feuillette à la souris, au doigt ou au clic, s'arrête sur ses marqueurs et déclenche leurs actions
  function volet(e, hz) {
    const pos = () => hz ? e.scrollLeft : e.scrollTop, axe = hz ? 'left' : 'top';
    const reperes = () => [...e.querySelectorAll(':scope > .ss > .ancre')].map(m => ({ m, v: cale(hz ? m.offsetLeft + m.parentElement.offsetLeft : m.offsetTop + m.parentElement.offsetTop, hz ? e.clientWidth : e.clientHeight) })).sort((x, y) => x.v - y.v);
    const proche = (v, sens = 0) => { const l = reperes(); if (!l.length) return null; if (sens) return (sens > 0 ? l.find(x => x.v > v + 2) : [...l].reverse().find(x => x.v < v - 2)) || (sens > 0 ? l[l.length - 1] : l[0]); return l.reduce((a, b) => Math.abs(b.v - v) < Math.abs(a.v - v) ? b : a); };
    const vers = v => e.scrollTo({ [axe]: v, behavior: 'smooth' });
    let d0 = null, s0 = 0, tire = false, repos = 0;
    const vue = () => hz ? e.clientWidth : e.clientHeight;
    const pagine = () => { const l = reperes(), w = vue(); return l.length > 1 && l.every(x => Math.abs(x.v / w - Math.round(x.v / w)) * w < 4); };
    const actifs = new Set();
    // un marqueur agit dès qu'il est entièrement visible, et cesse quand il sort
    const controle = () => { const p = pos(), w = vue(); for (const { m, v } of reperes()) { const dedans = v >= p - 1 && v + ((hz ? m.tw : m.th) || 0) <= p + w + 1; if (dedans && !actifs.has(m)) { actifs.add(m); agir(m.surAncre); } else if (!dedans && actifs.has(m)) { actifs.delete(m); agir(m.horsAncre); } } };
    e.addEventListener('scroll', () => { requestAnimationFrame(controle); clearTimeout(repos); repos = setTimeout(() => { if (d0 !== null || !hz || !pagine()) return; const r = proche(pos()); if (r && Math.abs(r.v - pos()) > 3) vers(r.v); }, 130); }, { passive: true });
    // bords d'un sous-document qui coulisse : là où sont dessinées ses flèches, un clic passe au panneau voisin
    let mange = false, p0 = null;
    const bord = v => { const b = e.getBoundingClientRect(), x = (v.clientX - b.left) / (b.width / e.offsetWidth); return x > e.offsetWidth - 70 ? 1 : x < 70 ? -1 : 0; };
    e.addEventListener('pointerdown', v => { p0 = [v.clientX, v.clientY]; mange = false; tire = false; }, true);
    e.addEventListener('pointerup', v => {
      if (!hz || !p0 || Math.hypot(v.clientX - p0[0], v.clientY - p0[1]) > 6 || e.scrollWidth <= e.clientWidth + 2) return;
      const sens = bord(v); if (!sens) return;
      const a = document.elementFromPoint(v.clientX, v.clientY)?.closest('.act'); if (a && a.offsetWidth < e.offsetWidth * .6) return;
      if (!pagine()) { mange = true; d0 = null; vers(pos() + sens * vue() * .5); return; } const n = proche(pos(), sens); if (n && Math.abs(n.v - pos()) > 2) { mange = true; d0 = null; vers(n.v); }
    }, true);
    e.addEventListener('click', v => { if (mange || tire) { v.stopPropagation(); v.preventDefault(); mange = false; tire = false; } }, true);
    e.addEventListener('pointerdown', v => { const gros = v.target.closest('.act'); if (v.pointerType !== 'mouse' || (gros && gros.offsetWidth < e.offsetWidth * .6) || v.target.closest('.dp .pts')) return; d0 = hz ? v.clientX : v.clientY; s0 = pos(); }, true);
    e.addEventListener('pointermove', v => { if (d0 === null) return; const k = e.getBoundingClientRect().width / e.offsetWidth, t = ((hz ? v.clientX : v.clientY) - d0) / k; if (!tire && Math.abs(t) > 4) { tire = true; e.setPointerCapture(v.pointerId); } if (tire) e[hz ? 'scrollLeft' : 'scrollTop'] = s0 - t; });
    const lache = v => { if (d0 === null) return; const t = (hz ? v.clientX : v.clientY) - d0; d0 = null; if (!hz || !pagine()) return; const r = reperes(); if (!tire) { if (mange) return; const n = proche(pos(), 1); vers(n && n.v > pos() + 2 ? n.v : r[0].v); return; } const c = proche(s0, t < 0 ? 1 : -1); if (c) vers(c.v); };
    e.addEventListener('pointerup', lache); e.addEventListener('pointercancel', () => { d0 = null; });
    e.demarrer = controle;
  }

  function creer(o) {
    const e = document.createElement('div'); e.className = 'cq'; e.style.cssText = `left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px${o.fond ? `;background:${o.fond}` : ''}`; e.hidden = !!o.cache;
    if (o.mult) e.classList.add('mult');
    if (o.anim?.boucle) e.animDef = `zf ${o.anim.d}s ease-in-out ${o.anim.r}s infinite`;
    else if (o.anim) {
      const dep = o.anim.ch[0] || [0, 0], arr = o.anim.ch[o.anim.ch.length - 1] || [0, 0], efface = o.anim.fondu === '2' && !o.anim.ch.length;
      e.style.setProperty('--ech', o.anim.ech); e.style.setProperty('--o', efface ? 0 : 1); e.style.setProperty('--dx', `${arr[0] - dep[0]}px`); e.style.setProperty('--dy', `${arr[1] - dep[1]}px`);
      e.animDef = `zo ${o.anim.d}s cubic-bezier(.2,.7,.2,1) ${o.anim.r}s both`;
      if (efface) e.addEventListener('animationend', () => { e.dataset.efface = '1'; e.hidden = true; }, { once: true });
    }
    if (e.animDef && o.anim.auto !== false) e.style.animation = e.animDef;
    if (o.t === 'listes') { e.listes = o.listes; e.style.display = 'none'; }
    else if (o.t === 'anime') {
      const im = imgDans(o.vues[0], null, o.w, o.h); e.append(im); o.vues.slice(1).forEach(u => { new Image().src = base + u; }); let n = 0, t = 0;
      e.arreter = () => clearInterval(t);
      e.lancer = () => { clearInterval(t); n = 0; t = setInterval(() => { if (!e.isConnected) return clearInterval(t); n++; if (n >= o.vues.length) { if (!o.boucle) return clearInterval(t); n = 0; } im.src = base + o.vues[n]; }, Math.max(30, o.pas * 1000)); };
      e.lancer();
    } else     if (o.t === 'compare') {
      e.classList.add('cmp'); const av = imgDans(o.av.src, o.av.c, o.w, o.h), z = document.createElement('div'), ap = imgDans(o.ap.src, o.ap.c, o.w, o.h), t = document.createElement('i'); z.className = 'z'; z.append(ap); e.append(av, z, t);
      const pose = x => { const v = Math.max(0, Math.min(o.w, x)); z.style.clipPath = `inset(0 ${o.w - v}px 0 0)`; t.style.left = v + 'px'; }; pose(o.w / 2);
      const suit = v => { const b = e.getBoundingClientRect(); pose((v.clientX - b.left) / (b.width / e.offsetWidth)); }; let tient = false;
      e.addEventListener('pointerdown', v => { tient = true; e.setPointerCapture(v.pointerId); suit(v); v.stopPropagation(); }); e.addEventListener('pointermove', v => { if (tient) suit(v); }); e.addEventListener('pointerup', v => { tient = false; v.stopPropagation(); });
    } else if (o.t === 'web' && o.morte) { e.classList.add('web');
    } else if (o.t === 'web') { const w = document.createElement('iframe'); w.src = /^http/.test(o.url) ? o.url : base + o.url; w.loading = 'lazy'; w.setAttribute('allow', 'autoplay'); e.classList.add('web'); e.append(w); }
    else if (o.t === 'texte') { e.classList.add('texte'); e.innerHTML = o.html; }
    else if (o.t === 'glisser') glissers.push(o);
    else if (o.t === 'ancre') { e.classList.add('ancre'); e.style.visibility = 'hidden'; e.hidden = false; e.surAncre = o.on; e.horsAncre = o.off; e.tw = o.tw; e.th = o.th; }
    else if (o.t === 'sous') {
      const hz = o.sens === 2 || o.sens === 0 && o.pages.length > 1 && o.pages[0].h <= o.h + 1; e.classList.add('sous', hz ? 'h' : 'v');
      o.pages.forEach(q => { const z = document.createElement('div'); z.className = 'ss'; z.style.cssText = `width:${q.l}px;height:${q.h}px`; q.calques.forEach(c => z.append(creer(c))); e.append(z); });
      volet(e, hz);
    } else
    if (o.t === 'pdf' && o.src) e.append(imgDans(o.src, o.c || null, o.w, o.h));
    else if (o.t === 'image' && o.src) { const im = imgDans(o.src, o.c, o.w, o.h); if (o.kb) { im.style.setProperty('--kb', 1 + o.kb.a); im.style.animation = `kb ${o.kb.d}s ease-out both`; } e.append(im); }
    else if (o.t === 'video') {
      const v = document.createElement('video'); v.src = base + o.src; v.playsInline = true; v.preload = 'metadata'; v.loop = o.boucle; v.controls = !o.sansBarre && !o.auto; if (o.affiche) v.poster = base + o.affiche; if (o.auto) v.dataset.auto = '1';
      // vidéo en attente, sans affiche : transparente, pour laisser voir l'image posée dessous
      if (!o.auto && !o.affiche) { v.classList.add('attente'); v.addEventListener('playing', () => v.classList.remove('attente')); }
      // sur iPad une vidéo s'affiche toujours devant les calques, quel que soit son rang
      // celle qui démarre seule passe devant dès l'arrivée : les titres ne doivent pas apparaître pendant son chargement
      if (o.auto && !o.cache) { e.style.zIndex = 5; v.preload = 'auto'; v.addEventListener('error', () => { e.style.zIndex = ''; }); }
      v.addEventListener('playing', () => { e.style.zIndex = 5; }); v.addEventListener('pause', () => { if (v.ended || !v.currentTime) e.style.zIndex = ''; });
      v.addEventListener('ended', () => { e.style.zIndex = ''; if (o.ferme) e.hidden = true; agir(o.fin); }); e.append(v); if (!o.sansBarre && !o.auto) e.classList.add('act');
    } else if (o.t === 'audio') {
      const m = document.createElement('audio'); m.src = base + o.src; m.preload = o.auto ? 'metadata' : 'none'; m.loop = o.boucle; let fini = false; const finir = () => { if (!fini && e.isConnected) { fini = true; agir(o.fin); } }; m.addEventListener('ended', finir); m.addEventListener('error', finir); e.append(m);   // un son illisible ne doit pas figer le scénario qu'il enchaîne
      // son lancé à l'ouverture : il sert souvent de minuteur au scénario, qui doit se jouer même si le navigateur bloque le son
      // fondu négatif, ou son minuteur très bref : calque d'aperçu à retirer avant tout affichage
      if (o.auto) immediats.push(...(o.fin || []).filter(x => +x.fadeDuration < 0 || o.bref && x.c === '804' && x.hidden === '1' && !(+x.fadeDuration > 0)));
      if (o.bref) m.dataset.bref = '1'; if (o.auto) { m.dataset.auto = '1'; m.addEventListener('loadedmetadata', () => setTimeout(finir, m.duration * 1000 + 100), { once: true }); }
    } else if (o.t === 'diapos') {
      e.classList.add('dp'); if (o.fondCase) e.style.background = o.fondCase;
      const bd = document.createElement('div'); bd.className = 'bande'; const pts = document.createElement('div'); pts.className = 'pts';
      o.diapos.forEach(s => { const c = document.createElement('div'); c.className = 'case'; const im = imgDans(s.src, s.c0 || s.c, o.w, o.h); c.append(im); bd.append(c);
        if (s.c0) requestAnimationFrame(() => requestAnimationFrame(() => { im.style.transition = 'all 1.2s ease-out'; Object.assign(im.style, { left: s.c[0] + 'px', top: s.c[1] + 'px', width: s.c[2] + 'px', height: s.c[3] + 'px' }); }));
        if (o.kb) { im.style.setProperty('--kb', 1 + o.kb.a); im.style.animation = `kb ${o.kb.d}s ease-out both`; } if (o.points) pts.append(document.createElement('i')); });
      let n = 0; const fondu = o.auto?.effet === 'fade'; if (fondu) { bd.classList.add('fondu'); bd.style.setProperty('--t', o.auto.t + 's'); }
      e.versDiapo = i => { const prec = n; n = Math.max(0, Math.min(o.diapos.length - 1, i)); if (fondu) { [...bd.children].forEach((t, k) => { t.classList.toggle('av', k === prec && k !== n); t.classList.toggle('on', k === n); }); } else bd.style.transform = `translateX(${-n * 100}%)`; [...pts.children].forEach((t, k) => t.classList.toggle('on', k === n)); agir(o.diapos[n]?.vue); };
      e.sources = o.diapos.map(s => base + s.src); e.lire = () => n;
      [...pts.children].forEach((t, k) => { t.addEventListener('click', v => { v.stopPropagation(); e.versDiapo(k); }); });
      pts.addEventListener('pointerdown', v => v.stopPropagation()); pts.addEventListener('pointerup', v => v.stopPropagation());
      e.append(bd, pts); let dx = null; e.addEventListener('pointerdown', v => { if (o.diapos.length < 2) return; dx = v.clientX; v.stopPropagation(); }); e.addEventListener('pointerup', v => { if (dx === null) return; const t = v.clientX - dx; dx = null; if (Math.abs(t) > 25) e.versDiapo(n + (t < 0 ? 1 : -1)); v.stopPropagation(); });
      e.depart = o.depart;
      const scenario = !!o.diapos[o.diapos.length - 1]?.vue?.length;   // des actions sur la dernière image : le diaporama est joué une seule fois
      // un diaporama automatique ne tourne que visible : sinon, à l'arrivée sur son panneau, il a pris de l'avance sur la légende que montre le marqueur
      if (o.auto && o.diapos.length > 1) { const imgs = [...bd.querySelectorAll('img')]; Promise.all(imgs.map(x => x.decode().catch(() => {}))).then(() => { if (!e.isConnected) return; bd.style.transitionDuration = o.auto.t + 's'; let t = 0; const suite = () => { if (scenario && n === o.diapos.length - 1) return clearInterval(t); e.versDiapo((n + 1) % o.diapos.length); }; const obs = new IntersectionObserver(l => { if (!e.isConnected) { clearInterval(t); return obs.disconnect(); } clearInterval(t); t = 0; if (l[l.length - 1].isIntersecting) t = setInterval(suite, (o.auto.d + o.auto.t) * 1000); else if (scenario && n && !e.hidden && e.closest('.sous')) e.versDiapo(0); }, { threshold: .5 }); obs.observe(e); }); }
    }
    const vivant = x => !x.morte;   // un calque dont tous les liens sont morts n'est plus cliquable
    if (o.tap?.length && o.tap.some(vivant)) { e.classList.add('act'); e.addEventListener('click', v => { if (!glisse) { v.stopPropagation(); agir(o.tap); } }); }
    if (o.hd) e.sources = [base + o.hd];
    if (o.plein) { e.classList.add('act'); e.addEventListener('click', v => { if (!glisse) { v.stopPropagation(); plein(e); } }); }
    if (o.id) parId.set(o.id, e);
    for (const g of o.g || []) { if (!parGroupe.has(g)) parGroupe.set(g, []); parGroupe.get(g).push(e); }
    return e;
  }

  // glisser-déposer : la vignette suit le doigt ; lâchée sur sa zone, elle lance les actions de la zone, puis revient
  function brancherGlisser(o) {
    for (const it of o.items) {
      const c = parId.get(it.curseur), zones = it.zones.map(z => ({ ...z, e: parId.get(z.boite) })).filter(z => z.e); if (!c) continue;
      c.classList.add('glissable'); let p0 = null, k = 1;
      // une zone est souvent masquée (sans taille à l'écran) : sa boîte se calcule d'après sa place dans la page
      const boite = z => { const t = z.e.offsetParent ? z.e.getBoundingClientRect() : null; if (t && t.width) return t; const p = (z.e.closest('.page') || scene).getBoundingClientRect(), q = (z.e.closest('.page') || scene).offsetWidth || W, f = p.width / q, x = parseFloat(z.e.style.left) || 0, y = parseFloat(z.e.style.top) || 0; return { left: p.left + x * f, top: p.top + y * f, right: p.left + (x + (parseFloat(z.e.style.width) || 0)) * f, bottom: p.top + (y + (parseFloat(z.e.style.height) || 0)) * f }; };
      const dessus = v => zones.find(z => { const r = boite(z); return v.clientX >= r.left && v.clientX <= r.right && v.clientY >= r.top && v.clientY <= r.bottom; });
      c.addEventListener('pointerdown', v => { v.stopPropagation(); v.preventDefault(); p0 = [v.clientX, v.clientY]; k = c.getBoundingClientRect().width / c.offsetWidth || 1; c.setPointerCapture(v.pointerId); c.classList.add('tire'); });
      c.addEventListener('pointermove', v => { if (!p0) return; c.style.transform = `translate(${(v.clientX - p0[0]) / k}px,${(v.clientY - p0[1]) / k}px)`; const z = dessus(v); zones.forEach(y => y.e.classList.toggle('cible', y === z)); });
      const fin = v => { if (!p0) return; p0 = null; c.classList.remove('tire'); const z = dessus(v); zones.forEach(y => y.e.classList.remove('cible')); c.style.transform = ''; if (z) agir(z.actions); };
      c.addEventListener('pointerup', v => { v.stopPropagation(); fin(v); }); c.addEventListener('pointercancel', fin);
    }
  }
  function construire(i, j) {
    const s = articles[i].pages[j], el = document.createElement('div'); el.className = 'page'; el.style.background = s.fond;
    parId = new Map(); parGroupe = new Map(); immediats = []; s.calques.forEach(o => el.append(creer(o))); glissers.splice(0).forEach(brancherGlisser); return el;
  }
  // intégré au site avec ?fleches=dehors : la page hôte porte les flèches, on lui signale où on en est
  if (location.search.includes('fleches=dehors')) document.documentElement.classList.add('fleches-dehors');
  function majNav() { if (parent !== window) parent.postMessage({ zave: [a, articles.length] }, location.origin); g.disabled = a === 0; d.disabled = a === articles.length - 1; h.disabled = p === 0; b.disabled = p === articles[a].pages.length - 1; }
  function aller(i, j, sens) {
    i = Math.max(0, Math.min(articles.length - 1, i)); j = Math.max(0, Math.min(articles[i].pages.length - 1, j));
    const ancienne = page; ancienne?.querySelectorAll('video,audio').forEach(m => m.pause());
    if (!sens && ancienne) sens = i !== a ? [i > a ? 1 : -1, 0] : [0, j > p ? 1 : -1];
    fermer(); a = i; p = j; page = construire(i, j); agir(immediats);
    if (sens && ancienne) { page.style.transition = 'none'; page.style.transform = `translate(${sens[0] * 100}%,${sens[1] * 100}%)`; scene.append(page); page.getBoundingClientRect(); page.style.transition = ''; page.style.transform = ''; ancienne.style.transform = `translate(${-sens[0] * 100}%,${-sens[1] * 100}%)`; setTimeout(() => ancienne.remove(), 480); }
    else { ancienne?.remove(); scene.append(page); }
    page.querySelectorAll('.dp').forEach(c => c.versDiapo?.(c.depart || 0));
    page.querySelectorAll('video[data-auto]').forEach(v => { if (!v.parentElement.hidden) lancer(v); });
    page.querySelectorAll('audio[data-auto]').forEach(lancer);
    attente.forEach(m => { if (!m.isConnected) attente.delete(m); }); majSon();
    agir(articles[i].pages[j].ouvre);
    page.querySelectorAll('.cq.sous').forEach(z => z.demarrer?.());
    majNav(); precharger(); setTimeout(() => { if (souris) majFleches(); }, 400);
  }
  const vus = new Set();
  function precharger() { for (const [i, j] of [[a + 1, 0], [a - 1, 0], [a, p + 1], [a, p - 1]]) { const s = articles[i]?.pages[j]; if (!s) continue; for (const o of s.calques) { if (o.hide) continue; const l = o.src && /^img/.test(o.src) ? [o.src] : (o.diapos || []).map(x => x.src); for (const u of l) if (!vus.has(u)) { vus.add(u); new Image().src = base + u; } } } }

  // au survol d'une interaction du magazine, les flèches s'effacent et laissent passer le clic
  const surInteraction = (x, y) => document.elementsFromPoint(x, y).some(n => {
    if (n.closest('.nav') || n === son) return false; if (n.closest('.pts')) return true;
    const c = n.closest('.act'); if (c && (c.offsetWidth < W * .6 || c.offsetHeight < H * .6)) return true;
    const v = n.closest('.sous.h'); if (!v || v.scrollWidth <= v.clientWidth + 2) return false; const r = v.getBoundingClientRect(), k = r.width / v.offsetWidth, px = (x - r.left) / k; return px < 70 || px > v.offsetWidth - 70; });
  let souris = null, tour = 0; const majFleches = () => { tour = 0; document.documentElement.classList.toggle('sur-act', !!souris && surInteraction(...souris)); };
  const prevoir = () => { tour ||= requestAnimationFrame(majFleches); };
  addEventListener('pointermove', v => { if (v.pointerType !== 'mouse') return; souris = [v.clientX, v.clientY]; prevoir(); }); addEventListener('scroll', prevoir, true); document.documentElement.addEventListener('pointerleave', () => { souris = null; prevoir(); });
  g.onclick = () => aller(a - 1, 0); d.onclick = () => aller(a + 1, 0); h.onclick = () => aller(a, p - 1); b.onclick = () => aller(a, p + 1);
  addEventListener('keydown', e => { if (e.key === 'Escape') fermer(); const k = { ArrowLeft: g, ArrowRight: d, ArrowUp: h, ArrowDown: b }[e.key]; if (k && !k.disabled) { k.click(); e.preventDefault(); } });
  let glisse = false, x0 = 0, y0 = 0, actif = false, rubriqueSeule = false;
  const defilant = t => { for (let n = t; n && n !== scene; n = n.parentElement) if ((n.classList?.contains('texte') || n.classList?.contains('sous')) && (n.scrollHeight > n.clientHeight + 2 || n.scrollWidth > n.clientWidth + 2)) return n; return null; };
  // sur une zone qui défile verticalement, seul le geste horizontal agit : il change de rubrique
  scene.addEventListener('pointerdown', e => { const z = defilant(e.target); if (z?.classList.contains('h')) return; rubriqueSeule = !!z; actif = true; glisse = false; x0 = e.clientX; y0 = e.clientY; });
  scene.addEventListener('pointermove', e => { if (actif && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) glisse = true; });
  addEventListener('pointerup', e => { if (!actif) return; actif = false; const x = e.clientX - x0, y = e.clientY - y0; if (Math.max(Math.abs(x), Math.abs(y)) < 40 || rubriqueSeule && Math.abs(x) < Math.abs(y) * 1.5) return; if (Math.abs(x) > Math.abs(y)) { if (x < 0 && !d.disabled) d.click(); else if (x > 0 && !g.disabled) g.click(); } else { if (y < 0 && !b.disabled) b.click(); else if (y > 0 && !h.disabled) h.click(); } setTimeout(() => { glisse = false; }); });
  addEventListener('pointercancel', () => { actif = false; });
  // trackpad : un geste = une rubrique, l'inertie du geste ne doit pas en sauter une seconde
  let repos = 0, dernier = 0; addEventListener('wheel', e => { const z = defilant(e.target), hor = Math.abs(e.deltaX) > Math.abs(e.deltaY); if (z && (z.classList.contains('h') ? hor : !hor)) return; e.preventDefault(); const t = Date.now(), neuf = t - dernier > 150; dernier = t; if (!neuf || t - repos < 650 || Math.max(Math.abs(e.deltaX), Math.abs(e.deltaY)) < 12) return; repos = t; const q = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? (e.deltaX > 0 ? d : g) : (e.deltaY > 0 ? b : h); if (!q.disabled) q.click(); }, { passive: false });
  window.__zave = { aller, son: () => son.click(), activer: () => { if (muet) remettreSon(); }, etat: () => ({ a, p, articles: articles.length, pages: articles[a].pages.length, titre: articles[a].titre }) };
  // intégré dans une page, le magazine ne démarre qu'une fois à l'écran : sinon son ouverture se joue hors de vue
  if (parent !== window) { const vu = new IntersectionObserver(l => { if (l.some(x => x.isIntersecting)) { vu.disconnect(); if (!page) aller(0, 0); } }, { threshold: .4 }); vu.observe(scene); }
  else aller(0, 0);
})();
