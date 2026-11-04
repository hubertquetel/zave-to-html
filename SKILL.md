---
name: zave-to-html
description: Fait revivre un magazine Aquafadas (.zave, Aquafadas Digital Publishing System / AVE) dans un navigateur : liseuse HTML autonome avec pages, calques, vidéos, sons, diaporamas, sous-documents, animations et interactions, intégrable dans un site. À utiliser dès que l'utilisateur mentionne un fichier .zave, Aquafadas, AVE, un magazine iPad créé dans InDesign à faire revivre, ou veut lire, archiver ou publier une ancienne app-magazine, et aussi pour corriger un défaut de rendu ou d'animation d'une liseuse déjà convertie.
---

# Liseuse .zave vers HTML

Le lecteur d'origine n'existe plus : ces magazines ne se lisent plus nulle part. Cette skill ne fait pas une vidéo ni un PDF du magazine, elle **rejoue son scénario** : chaque calque, marqueur et action du fichier est interprété par un moteur web d'environ 200 lignes denses, sans dépendance à l'exécution.

Éprouvée sur 26 magazines publiés entre 2012 et 2016 (presse télé, télécoms, horlogerie, culture, institutionnel), soit plusieurs centaines de pages parcourues sans erreur JavaScript.

## Contenu de la skill

| Élément | Rôle |
|---|---|
| `scripts/zave-vers-web.py` | convertisseur : `magazine.xml` + PDF vers `data.json` + images WebP |
| `lecteur/lecteur.js`, `lecteur/lecteur.css` | moteur commun à tous les numéros |
| `scripts/verifier-liens.py` | désactive les liens morts, choisit fenêtre intégrée ou nouvel onglet |
| `scripts/controler-donnees.py` | contrôle le `data.json` sans navigateur : images déformées, sauts vers des pages inexistantes, décors agrandissables |
| `scripts/verifier-parcours.mjs` | parcourt toutes les pages sous WebKit : erreurs JavaScript et fichiers manquants |
| `scripts/capturer-pages.mjs`, `scripts/comparer-apercus.py` | compare chaque page à l'aperçu d'origine du fichier |
| `references/format.md` | le format décodé : structure, actions, pièges. **À lire avant de toucher au convertisseur** |
| `references/moteur.md` | fonctionnement du moteur et intégration dans un site. **À lire avant de toucher au lecteur** |
| `references/diagnostic.md` | symptôme vu à l'écran, cause, correction. **À lire dès qu'un retour signale un défaut** |

## Convertir un magazine

Prérequis : Python avec `Pillow` et `PyMuPDF`, Node avec `playwright` pour les contrôles.

1. Travailler sur une copie, jamais sur l'archive d'origine. Un `.zave` est un ZIP :
   ```bash
   mkdir -p travail/x && unzip -qo MAGAZINE.zave -d travail/x
   ```
2. Convertir. Le dossier de sortie porte le nom du numéro :
   ```bash
   python3 -I scripts/zave-vers-web.py travail/x SORTIE/numero "Titre du numéro"
   ```
   Les arguments après le titre sont des titres d'articles à écarter, par exemple une page dont le contenu en ligne a disparu : `... "Parmigiani n° 10" CORNERS`. L'archive d'origine n'est pas touchée. Un argument `auto:ID` force la lecture à l'ouverture d'un son que le fichier ne déclenche pas (intro de L'art de croire : `auto:61-3847`).
3. Copier le moteur **au-dessus** du dossier du numéro, car `index.html` le charge en `../` :
   ```bash
   cp lecteur/lecteur.js lecteur/lecteur.css SORTIE/
   ```
4. Servir en HTTP : le lecteur charge `data.json` et ne marche pas en `file://`.
   ```bash
   python3 -m http.server --directory SORTIE 8000
   ```

5. Tester les liens : `python3 -I scripts/verifier-liens.py SORTIE/numero` (à relancer après chaque conversion, qui efface ses annotations). Les liens morts sont désactivés ; ceux qu'un site accepte d'afficher s'ouvrent dans une fenêtre par-dessus le magazine, les autres dans un nouvel onglet. Pour YouTube, `oembed` n'est pas fiable : le script lit l'état de la page de la vidéo.

Le dernier message du script donne le nombre de calques PDF, ceux avec marge, les PDF d'objet et les vides.

Pour corriger un numéro déjà en ligne sans le reconvertir, on peut appliquer une règle nouvelle directement à son `data.json` à partir du XML d'origine. Garder une copie de l'ancien fichier et vérifier la source : plusieurs extractions d'un même titre se ressemblent (Panoramik : `retina`, `HD`, `zave67`…), et une mauvaise source change des dizaines de cadrages. Dans le doute, reconvertir dans un dossier à part et comparer les deux `data.json` : seules les annotations de liens doivent différer.

Toutes les liseuses partagent un seul moteur : corriger `lecteur.js` corrige tous les numéros, sans reconvertir. Ne reconvertir que si le convertisseur ou le format de `data.json` change.

## Vérifier : quatre niveaux, tous obligatoires

**0. Les données.** Sans navigateur, en quelques secondes, sur un ou plusieurs numéros :
```bash
python3 -I scripts/controler-donnees.py SORTIE/numero
```
Il doit répondre `RAS`. Une image « déformée » vient presque toujours d'un mauvais jeu de cadrage (`references/format.md`, « Jeux de cadrage ») ; un saut vers une page inexistante, d'un `articleId` mal lu.

Copier d'abord les scripts `.mjs` dans un dossier où `playwright` est installé.

**1. Parcours sans erreur.** Pages, erreurs JavaScript et fichiers manquants :
```bash
node verifier-parcours.mjs http://localhost:8000 numero1 numero2
```

**2. Comparaison aux aperçus d'origine.** Chaque page du `.zave` a un aperçu (attribut `preview`) :
```bash
node capturer-pages.mjs http://localhost:8000 numero
python3 -I comparer-apercus.py numero travail/x
```
Si des articles ont été écartés à la conversion, passer leurs titres après le dossier.
Regarder les 15 plus gros écarts dans `cmpnumero.png`, l'aperçu à gauche et le rendu à droite. Un écart n'est pas forcément un défaut : l'aperçu montre l'état initial et la capture un état animé, et certains numéros ont des aperçus sans rapport avec la page. Juger à l'œil, jamais au chiffre seul.

**3. Le comportement.** Les captures ne prouvent ni les interactions ni la fluidité :
- cliquer les flèches, puces, onglets et boutons ;
- filmer les ouvertures par captures à 0, 250 ms, 1,5 s et 4,5 s, ou mesurer la luminosité image après image pour repérer un flash ;
- contrôler dans **Safari**, ou au minimum Playwright WebKit, qui reproduit la plupart de ses défauts. Un panneau d'aperçu masqué gèle les animations, et ne prouve donc rien.

Toujours contrôler `node --check lecteur.js` avant de croire un test, et dire honnêtement ce qui n'a pas été vérifié, notamment le son réel.

## Limites connues

- **Contenus hébergés** : les vidéos en `http://…` et les `webView` externes ont souvent disparu. Chercher une copie dans les archives et le dossier de production ; sinon le signaler, et proposer d'écarter la page si elle est vide.
- **Son** : aucun navigateur n'accepte le son avant le premier clic dans le cadre. Le lecteur relance le son à ce clic, et l'icône est barrée jusque-là.
- **Mise en page** : seule la première (paysage, `layouts/layout[0]`) est lue.
- **Transitions de page** : simplifiées en poussée, sans parallaxe.
- **`action.mailTo`** : volontairement non branché, il exposerait une adresse.

## Poids et publication

Compter de 1 Mo à 340 Mo par numéro selon les vidéos (26 numéros : 1,6 Go). Avant de publier, lire la section Publication de `references/moteur.md` : sons non compressés, pas de cache long sur le lecteur, cache du CDN à vider. Toujours revérifier les scénarios sonores sur l'adresse publique.

La conversion ne donne aucun droit sur les contenus. Avant publication, vérifier les droits du client, des photos et des vidéos. Voir `DISCLAIMER.md`.

## Tenir la skill à jour

Chaque découverte va dans `references/` le jour même : un cas de `format.md` ou une ligne de `diagnostic.md`.
