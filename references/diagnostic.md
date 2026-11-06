# Diagnostic : du symptôme à la cause

Tout ce tableau vient de vrais retours de relecture. Méthode : ouvrir `data.json`, lister les calques de la page (`t`, `id`, `g`, `cache`, `tap`, `fin`, `auto`), lire le scénario, et seulement ensuite corriger. Corriger la règle générale dans le moteur, jamais le numéro : le même défaut est presque toujours présent ailleurs. Balayer ensuite tous les `data.json` pour compter les cas touchés.

## Affichage

| Ce qu'on voit | Cause | Correction |
|---|---|---|
| Titre grisé, bords de texte encrassés, transparence fausse | alpha prémultiplié de MuPDF lu comme de l'alpha simple | lire le pixmap en PIL `RGBa` |
| Calque PDF décalé dans un sous-document | le PDF déborde de sa page d'une marge égale de chaque côté | soustraire la marge |
| Calque PDF mal placé ou trop grand (fichiers 2015-2016) | PDF d'objet et non PDF de page | le poser selon `content` |
| Image absente | `fileSource` vide | utiliser `thumbSource` |
| Page ou fond entier absent | `richText` vide écarté alors qu'il porte `backgroundColor` | le garder comme aplat |
| Image noircie sur fond sombre, ou carré blanc sur du texte | règle du `multiply` trop large ou absente | seulement si le pourtour est blanc à 97 % et le blanc ≥ 35 % de l'image |
| Le texte de la page a disparu sous un diaporama | `z-index` des images sorti de leur contexte | `isolation: isolate` sur la bande du diaporama |
| Diaporama de commande tout noir | `cellBackgroundColor` peint sur des images transparentes | pas de fond de case |
| Image déformée, écrasée dans son cadre | original d'une image agrandissable affiché à la place de son recadrage | `thumbSource` dans la page, `fileSource` en plein écran |
| Logo ou carte blanche devenue noire | règle du détourage blanc appliquée à une image posée exactement sur une autre (états d'un bouton) | pas de `multiply` si un calque de même boîte est dessous |
| JPEG à fond blanc teinté par le décor (carré bleuté, barre de menu noire, image disparue sur fond noir) | `multiply` appliqué sur un décor coloré ; l'iPad affiche le JPEG opaque | pas de `multiply` si le calque dessous est blanc à moins de 50 % sous le cadre (`blanc_dessous`) ; vérifier sur l'aperçu `previews/` |
| Barres noires autour d'un titre en diaporama | aplat de case (`cellBackgroundColor`) autour d'images détourées | pas d'aplat dès qu'une image a de la transparence |
| Intertitre collé au texte | retours à la ligne faits d'espaces | `<br>` à la place de 4 espaces ou plus |
| Texte coupé au bas d'une page de sous-document | la page suivante déborde par-dessus | couper chaque page à ses bords |
| Image plein écran minuscule dans une grande page noire | fenêtre posée sur le document entier | la poser dans la scène du magazine, image en `contain` |
| Photo de diaporama descendue dans son cadre, haut du cadre vide (Canal+ 126) | `relativeX/Y` d'une diapo lus comme une position de l'image | c'est la position du cadre dans l'image : l'image part en sens inverse (valeurs négatives) |
| Photos de diaporama anamorphosées (Canal+ 127, Parmigiani, CanalSat 171) | le vrai cadrage est dans `landscape_relative*`, `relative*` vaut 0, 0, 1, 1 (ou l'inverse selon le numéro) | garder le jeu dont la proportion est celle de l'image ; sinon remplir la case, centré, sans déformer |
| Portrait étiré à la fin d'un travelling (SFR 11) | cadrage `relativeAlt*` aux proportions fausses | l'agrandir autour de son centre jusqu'à la proportion de l'image |
| Longue bande floue ou tronquée | limite WebP de 16 383 px | réduire la bande |
| Bandeau de l'image suivante en bas de page après une flèche | ancre posée à 778 au lieu de 768 | recaler sur le multiple de la hauteur (tolérance 2,5 %), dans `placer` et `reperes` |

## Animations et scénario

| Ce qu'on voit | Cause | Correction |
|---|---|---|
| Titre visible puis qui disparaît et réapparaît, ou visible avant son animation | calque d'aperçu retiré trop tard par un son minuteur | appliquer à la construction de la page, avant affichage : `fadeDuration` négatif, ou masquage sans fondu d'un son `bref` (< 10 ko) |
| Ouverture déjà jouée quand on arrive sur le lecteur intégré | l'iframe se charge et démarre sous l'image d'ouverture de la page | intégré : `aller(0,0)` seulement quand la scène est visible (`IntersectionObserver` dans l'iframe) |
| En ligne seulement : sons refusés (`NotSupportedError`), scénarios figés | le serveur compresse les MP3 (Brotli) tout en servant des plages d'octets | ni compression ni cache pour mp3, m4v, mp4… (`no-gzip no-brotli`, `Cache-Control: no-store`), puis vider le cache Cloudflare |
| Scénario sonore figé à la première étape | un son bloqué par le navigateur ne finit jamais, donc n'enchaîne pas la suite | jouer le son refusé en muet, il le reprend avec le son au premier clic |
| Le scénario ne démarre pas | son minuteur bloqué par le navigateur | déclencher ses actions au `loadedmetadata`, indépendamment de la lecture |
| Flash pendant un diaporama en fondu | l'image précédente s'efface en même temps que la nouvelle apparaît | garder la précédente opaque dessous, attendre `img.decode()` avant de démarrer |
| Titres qui se superposent | actions de marqueur jouées seulement à l'arrêt du défilement | agir dès que le marqueur est entièrement visible |
| Deux légendes l'une sur l'autre sous un diaporama automatique | il tournait avant que son panneau soit visible, le marqueur remontre la légende de la première image | ne le lancer que visible (`IntersectionObserver`) ; en scénario dans un sous-document, revenir à la première image en sortant |
| Deux libellés d'un bouton superposés (écouter, arrêter) | `hidden="2"` traité comme « montrer » | c'est une inversion |
| Plantage `duration must be non-negative` | `fadeDuration` négatif passé à `animate` | `Math.max(0, …)` |
| Animation jamais jouée | `autoPlay="0"` | elle attend l'action 818 |

## Vidéo et son

| Ce qu'on voit | Cause | Correction |
|---|---|---|
| Barre de lecture sur une vidéo d'ambiance | vidéo `autoPlay` traitée comme une vidéo normale | pas de barre, pas de capture des clics |
| Titres visibles pendant le chargement de la vidéo | la vidéo n'est au premier plan qu'une fois lancée | `zIndex` dès l'arrivée sur la page (sur iPad, une vidéo passe devant tout) |
| Pas de son à l'ouverture | politique des navigateurs | normal jusqu'au premier clic, qui relance les médias refusés ; on ne contourne pas |
| Pas de son en feuilletant avec des flèches hors du cadre | le clic sur la page hôte ne compte pas comme geste dans l'iframe | la page hôte appelle `__zave.activer()` à chaque clic (même origine) |
| Vidéo qui se fige au premier geste dans Safari | démutée sur `pointerdown`, qui n'autorise pas le son | démuter sur `click`, `touchend` ou `keydown` |

## Navigation

| Ce qu'on voit | Cause | Correction |
|---|---|---|
| Bloqué dans une vidéo YouTube | fenêtre 805 sans fermeture visible, sur une vidéo devenue privée | croix et Échap sur `#plein`, fermeture au changement de page ; `marquer-videos-mortes.py` remplace la vidéo par un message |
| Flèche de rubrique sur une interaction | flèches internes posées sur la page | intégré : `?fleches=dehors`, flèches sur la page hôte ; pleine fenêtre : effacement au survol (`sur-act`) |
| Flèche dessinée sans effet | c'est un repère de glissement iPad, sans action | rendre cliquables les bords des sous-documents (70 px) |
| Bouton qui ramène à la couverture au lieu d'une page de la rubrique (Canal+ 126, 127, 128, CanalSat 171) | 801 avec `articleId="0"` lu comme l'article n° 0 | `articleId="0"` = la rubrique en cours ; les flèches « retour en haut » visent sa page 0 |
| Au clic sur un dessin, les textes disparaissent et rien d'autre (golf du Canal+ 127) | décor pleine page `fullScreen="1"` : le plein écran montre la même image sans les calques posés dessus | pas d'agrandissement pour une image qui couvre toute la page sans original plus grand (`hd`) |
| Lien qui semble mort au test automatique | calque caché, montré à la fin d'une vidéo (`fin` → 804) | normal : tester après le scénario, pas à l'arrivée sur la page |
| Défilement du sous-document qui s'arrête au mauvais endroit | marqueurs non multiples de la largeur | n'accrocher que si `pagine()` est vrai |
| Swipe sans effet sur la plupart des pages | sous-document vertical plein page considéré comme zone défilante | n'y écarter que le geste vertical |
| La page du site défile au survol du lecteur | gestes transmis à la page hôte | figer la page au survol du cadre (`page-figee`) |
| La page du site saute au chargement | `scrollIntoView` dans l'iframe | ne jamais l'utiliser, passer par `scrollTo` |
| Curseur du site figé au bord de l'iPad | l'iframe capte la souris | masquer le curseur personnalisé au survol des iframes |

## Page vide ou contenu perdu

Une page blanche avec seulement un titre cache souvent un `webView` externe : chercher `"t":"web"` dans `data.json`, tester l'adresse, interroger Wayback (`archive.org/wayback/available` et l'index `cdx`, en réessayant : il est parfois hors ligne), puis les archives de production. Sans copie, demander à l'utilisateur et écarter la page par l'argument du convertisseur.

## Pièges de méthode

- Les correctifs du moteur sont sur des lignes très longues : `node --check` après chaque patch.
- Un correctif visuel peut casser ailleurs : l'isolation du fondu oubliée a masqué des colonnes de texte sur tous les fondus. Toujours regarder aussi une page de texte, pas seulement la page corrigée.
- Durée d'un son : `afinfo` sur Mac. Un seuil de poids sépare nettement les minuteurs : 6 à 8 ko contre 28 ko et plus.
- Une capture à l'instant t ne montre pas un flash : prendre plusieurs instants, ou mesurer la luminosité moyenne image par image.
