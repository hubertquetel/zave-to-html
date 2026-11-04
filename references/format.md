# Format .zave : ce qui a été décodé

Déduit des fichiers, sans documentation officielle, sur des magazines de 2012 à 2016. D'autres versions peuvent différer.

## Structure
`root > infos, textStyles, articles > article > layouts > layout > page`. Enfants d'une `page` : `pdf`, `image`, `video`, `audio`, `imageCollection`, `richText`, `marker`, `subLayout`, `imageComparator`, `webView`, `toggleButton`, `transition`, `pageActions`.

## Pièges (tous rencontrés)
- **PDF** : il fait la taille de la page entière, la boîte du calque est une fenêtre. Dans un sous-document, le PDF déborde de sa page d'une marge égale de chaque côté (1124×1311 pour 1024×1211) : la soustraire.
- **Deux sortes de PDF** : PDF de page (Canal+) ou PDF d'objet (O34, 2015-2016), plus petit que la page, à poser selon `content` (`x`, `y`, `width`, `height` relatifs au calque).
- **Fichier d'image** : si `fileSource` est vide, il est dans `thumbSource`.
- **Décor pleine page agrandissable** : `fullScreen="1"` sur une image de 1024 × 768 sans original plus grand n'a aucun intérêt et capte les clics à côté des zones prévues ; ne pas le brancher.
- **Image agrandissable (`fullScreen="1"`)** : `fileSource` est l'original entier, `thumbSource` son recadrage pour le cadre. Si les proportions de l'original diffèrent de celles du cadre, afficher le recadrage et garder l'original pour le plein écran (`hd`), sinon l'image est déformée.
- **`hidden` de l'action 804** : `0` montrer, `1` masquer, `2` inverser. Sert aux boutons à deux états (écouter, arrêter).
- **`multipleDragDrop`** : jeu de glisser-déposer. Chaque `dragItem` a un curseur (calque à faire glisser) et des `actionZone` (calque cible, actions au dépôt). Les zones sont souvent des étiquettes : c'est une association, pas un dépôt au centre.
- **Retours à la ligne** : souvent des suites d'espaces dans le texte (justification à la main) ; les remplacer par `<br>` (4 espaces ou plus).
- **Pages de sous-document** : l'iPad coupe chaque page à ses bords ; un calque qui déborde ne doit pas recouvrir la page voisine (`.ss{overflow:hidden}`).
- **Noms de fichiers** : le Mac les décompose (NFD), les URL sont précomposées (NFC). Les normaliser, sinon 404 sur « Châteaudun » en ligne.
- **Sens d'un sous-document** : `scrollDirection` sur le `subLayout` interne, sinon sur l'externe (2 = horizontal).
- **Premier marqueur** : ses `activateActions` se lancent à l'arrivée sur la page, après `pageDidAppears` (effets d'ouverture, fonds et flèches).
- **Vidéo sans `autoPlay` ni affiche** : l'image d'attente est un calque séparé ; garder la vidéo transparente tant qu'elle ne joue pas.
- **`relativeWidth="0"`** : l'image remplit son cadre, ce n'est pas une taille nulle.
- **Jeux de cadrage** : un `content` porte `relative*`, `landscape_relative*`, `portrait_relative*` et `relativeAlt*`. Selon l'outil qui a produit le numéro, le cadrage paysage réel est dans `relative*` (Canal+ 126) ou dans `landscape_relative*` (Canal+ 127), l'autre jeu valant 0, 0, 1, 1 ou des restes. Le seul critère fiable : la proportion largeur × L / hauteur × H doit être celle du fichier image (tolérance 5 %).
- **Cadrage d'une diapo** (`imageCollection/images/image/content`) : `relativeX/Y` place le cadre dans l'image, donc l'image part en sens inverse (x et y négatifs). Seul le Canal+ 126 en a (19 diapos) ; avant la correction du 04/11, la photo de Stan Lee descendait de 250 px et laissait le haut du cadre vide.
- **`useAltCrop="1"`** : l'image glisse de `relative*` vers `relativeAlt*`, et ces valeurs déplacent le cadre dans l'image, donc l'image en sens inverse.
- **`richText` sans texte** : peut porter le fond de toute la page via `backgroundColor`. Ne pas l'écarter.
- **`animation fade`** : `2` = effacement, `1` en boucle = pulsation, `0` = sans fondu. `scaleX` et le chemin `path` donnent l'état d'arrivée.
- **Actions sur un groupe** : `804` vise soit `contentId`, soit `groupId` (les noms de `groupIds`). Les fichiers récents utilisent surtout les groupes.
- **Marqueurs** : `marker` a `activateActions` et `deactivateActions` ; ils agissent dès que le marqueur est entièrement visible, pas seulement à l'arrêt (preuve : marqueur à 1988 + 60 = 2048 sur une page de 2048). Un sous-document n'a un arrêt par panneau que si ses marqueurs sont tous multiples de sa largeur. C'est ainsi que changent les flèches et les fonds flous.
- **Flèches dessinées** : un PDF de flèche n'a souvent aucune action (repère de glissement sur iPad). Rendre cliquables les bords des sous-documents coulissants.
- **JPEG à fond blanc détouré** sur du texte : l'afficher en `mix-blend-mode: multiply`, seulement si tout son pourtour est blanc et que le blanc couvre au moins 35 % de l'image (sinon elle noircit sur fond sombre).
- **WebP** : 16 383 px maximum de côté ; réduire les longues bandes.
- **iframe** : ne jamais utiliser `scrollIntoView`, il fait défiler la page parente.

## Rendu
MuPDF livre l'alpha prémultiplié : lire le pixmap en mode PIL `RGBa`, sinon les semi-transparences virent au gris et les bords des textes s'encrassent.

## Autres éléments
- `animatedImage` : suite de vues dans `fileSources` ; `frameRate` est la durée d'une vue en secondes.
- `actionConcentrator` : invisible, contient des listes d'actions nommées.

## Vidéos
Une vidéo en `autoPlay` s'affiche sans barre de lecture.
Sur iPad, une vidéo en lecture passe devant tous les calques, même placée plus bas dans la pile : la remonter pendant la lecture. Elle ne doit pas capter les clics si elle démarre seule, et doit être devant dès l'arrivée sur la page, sinon les titres apparaissent pendant son chargement.

## Sons minuteurs
Une action en `fadeDuration` négatif retire un calque d'aperçu (vignette) : l'appliquer avant le premier affichage.
Un `audio` caché en `autoPlay` sert souvent de minuteur : ses actions `finished` enchaînent le scénario (retirer une vidéo, un calque d'aperçu). Les déclencher même si le navigateur bloque le son.

## Diaporamas
- `slideshow effect` : `swipe` ou `fade`. Fondu : garder l'image précédente opaque dessous, sinon le fond de case flashe ; attendre le décodage des images. Des `scrollActions` sur la dernière image = scénario joué une seule fois.
- Diaporama aux images transparentes : commande posée sur le vrai, synchronisée par l'action 802 ; ne pas peindre `cellBackgroundColor`.
- `animation autoPlay="0"` : attend l'action 818.

## Actions
| Code | typeId | Effet |
|---|---|---|
| 800 | gotoWeb | ouvrir un lien |
| 801 | gotoArticle | aller à un article et une page ; `articleId="0"` = rubrique en cours ; sans paramètre (FirstLight) : ignoré |
| 802 | changeContent | aller à une diapo |
| 803 | fullScreen | plein écran |
| 804 | changeObjectVisibility | montrer ou masquer, avec `fadeDuration` |
| 812 | play | lancer un média |
| 813 | stop | arrêter un média |
| 814 | pause | mettre en pause ; le 812 suivant reprend au même endroit |
| 805 | showPopup | fenêtre web (`url` dans le XML du paramètre) |
| 816 | quit | retour au kiosque, ignoré |
| 817 | mailTo | courriel |
| 818 | startAnimation | lancer une animation |
| actionWithId | — | lance une liste d'un `actionConcentrator` (`actionData/actionId`) |
| 819 | stopAnimation | arrêter une animation |
| 820 | goToAnchor | aller à un marqueur |

## Ancres décalées
Les ancres sont souvent posées quelques pixels à côté de la page (778 pour 768, 1546 pour 1536), alors que les images sont calées sur 768. Vu dans Parmigiani, SFR, Canal+ 150 et 151, Jazz. Les ramener sur le multiple de la hauteur, tolérance 2,5 %. Au-delà (O34 : 734, 1457), laisser tel quel.

## Reconnaître un son minuteur
Le poids sépare nettement : 6 à 8 ko pour un son de 0,13 à 0,52 s (`bref`, posé par le convertisseur sous 10 ko), 28 ko et plus pour un vrai délai de 3 à 4 s, qu'il faut respecter. Seuls les masquages sans fondu d'un son `bref` s'appliquent avant le premier affichage.

Moteur, son et intégration : `moteur.md`. Symptômes : `diagnostic.md`.
