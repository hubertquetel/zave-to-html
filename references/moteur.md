# Le moteur et son intégration

## Sortie du convertisseur

```
SORTIE/
├── lecteur.js, lecteur.css    moteur partagé
└── numero/
    ├── index.html             charge ../lecteur.*
    ├── data.json              articles > pages > calques
    ├── fonts.css, fonts/      polices embarquées
    ├── img/*.webp             calques rendus
    ├── media/                 vidéos et sons
    └── web/                   contenus HTML embarqués, s'il y en a
```

`data.json` : `{articles: [{id, titre, pages: [{l, h, fond, calques, ouvre}]}]}`. Un calque a `t` (`pdf`, `image`, `video`, `audio`, `diapos`, `sous`, `ancre`, `web`, `texte`…), `id`, `x`, `y`, `w`, `h`, `cache`, `g` (groupes), et selon le cas `tap` (actions au clic), `fin` (actions en fin de média), `auto`, `bref`, `src`.

Les ids d'un sous-document sont préfixés : `4747-32-1332`. Une action vise un calque par `contentId` ou tout un groupe par `groupId`.

## Déroulement d'une page

1. `aller(i, j)` appelle `construire`, qui crée tous les calques par `creer(o)` et remplit `parId`, `parGroupe` et `immediats`.
2. `agir(immediats)` retire les calques d'aperçu **avant** l'affichage.
3. La page entre avec sa transition, les vidéos auto passent au premier plan.
4. Les sons `audio[data-auto]` sont lancés, leur minuteur part du `loadedmetadata` (durée + 100 ms) et joue `fin`.
5. `agir(ouvre)`, puis `z.demarrer` pour les animations automatiques et les premiers marqueurs.

## Fonctions clés de `lecteur.js`

| Fonction | Rôle |
|---|---|
| `agir(liste)` | exécute les actions (tableau des codes dans `format.md`) |
| `visible(k, oui, fondu)` | montre ou masque, fondu annulable |
| `creer(o)` | fabrique le DOM d'un calque |
| `volet(e, hz)` | sous-document : glisser, marqueurs, bords cliquables, accroche |
| `cale(v, w)` | ramène une ancre décalée sur la page |
| `placer(c)` | fait défiler jusqu'à une ancre |
| `lancer`, `remettreSon`, `appliquerSon`, `majSon` | son : refus du navigateur, relance, icône |
| `surInteraction(x, y)` | la souris est-elle sur une interaction ? (efface les flèches) |

API de test et de pilotage : `window.__zave.aller(article, page)` et `window.__zave.etat()` renvoient `{a, p, articles, pages, titre}`.

## Fenêtres et liens

`#plein` (image en plein écran, page web, vidéo) se pose dans `#scene`, pas sur le document : il couvre le magazine, image en `contain`, croix et Échap. Les liens lisent les annotations de `verifier-liens.py` : `morte` (rien, calque non cliquable si tous ses liens sont morts), `cadre` (fenêtre intégrée), sinon nouvel onglet.

## Glisser-déposer

Calque `glisser` : branché après la construction de la page (`brancherGlisser`), il rend chaque curseur déplaçable ; au lâcher sur sa zone, il joue les actions de la zone puis revient. Les zones masquées se mesurent d'après leur position dans la page.

## Gestes

Swipe horizontal et trackpad : rubrique suivante ou précédente, partout sauf sur un sous-document horizontal, qui garde le geste. Sur une zone à défilement vertical, seul un geste nettement horizontal agit (`.sous.v{touch-action:pan-y}` pour le doigt). Trackpad : un geste vaut une rubrique, il faut 150 ms de calme pour en compter un nouveau, sinon l'inertie en saute plusieurs.

## Son

`muet` : le navigateur a refusé. `coupe` : le lecteur a coupé par l'icône. Un média est muet si l'un des deux est vrai. Un média refusé attend dans `attente` et repart au premier `click`, `touchend` ou `keydown`. L'icône `#son` n'apparaît que si la page a une vidéo ou un son qui n'est pas `bref`.

## Intégrer dans un site

```html
<iframe src="/zave/numero/index.html?fleches=dehors" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>
```

- `allow="autoplay"` est indispensable pour le son après le premier clic.
- **Sans paramètre** : flèches sur la page, qui s'effacent au survol d'une interaction.
- **Avec `?fleches=dehors`** : flèches et icône de son internes retirées, la page hôte (même origine) porte les siennes. Le son se pilote par `w.__zave.son()` et son état arrive par `{zaveSon: [present, coupe]}`. Plusieurs liseuses dans un projet : onglets, et les flèches passent à la voisine en bout de liseuse :

```js
const w = iframe.contentWindow;
w.__zave.aller(w.__zave.etat().a + sens, 0);
addEventListener('message', e => { if (e.source === iframe.contentWindow && e.data?.zave) { const [a, n] = e.data.zave; /* griser les flèches : a === 0, a === n - 1 */ } });
```

Le cadre du magazine est en 4/3 (1024 × 768), le moteur met la scène à l'échelle.

## Publication

- Vérifier que `media/` part bien : ce dossier lourd est souvent exclu de Git, il faut alors le déployer à part.
- **Sons et vidéos jamais compressés** : Safari lit les médias par morceaux (réponses 206). Un MP3 compressé (Brotli) et servi par plages est refusé (`NotSupportedError`) : les scénarios bâtis sur des sons minuteurs se figent, en ligne seulement. Exclure mp3, m4v, mp4, m4a, wav, aac de la compression et du cache Cloudflare (`no-gzip no-brotli`, `Cache-Control: no-store`). Modèle : `scripts/htaccess-videos` du site.
- **Jamais de cache long sur le lecteur** : `lecteur.js` et `lecteur.css` gardent toujours le même nom. Un cache d'un an les fige dans les navigateurs ; ne réserver le cache long qu'aux fichiers au nom versionné (`/_astro/`). À chaque mise en ligne, les `index.html` des numéros appellent `lecteur.js?v=<empreinte>`.
- **Cache Cloudflare** : le purger après chaque mise à jour (« Vider tous les éléments »), indispensable si des médias ont été servis compressés.
- **Vérifier en ligne, pas seulement en local** : journaliser `play()` et ses erreurs sur l'adresse publique ; un défaut d'en-têtes ne se voit qu'une fois servi par l'hébergeur.
- `index.html` porte `robots noindex` : le retirer seulement si le numéro doit être référencé.
