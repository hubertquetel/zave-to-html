# zave-to-html

**Redonner vie aux magazines Aquafadas `.zave`, dans n'importe quel navigateur.**

Français · [English](README.md)

Entre 2011 et 2016, de nombreux éditeurs ont créé des magazines interactifs pour iPad avec Aquafadas Digital Publishing System, un module d'InDesign. Ces magazines, exportés en fichiers `.zave`, se lisaient dans des applications dédiées. Ces applications ont disparu : les magazines ne se lisent plus nulle part.

zave-to-html est une skill pour [Claude Code](https://claude.com/claude-code). Elle transforme un fichier `.zave` en liseuse HTML autonome. Ce n'est ni une vidéo ni un PDF du magazine : la liseuse **rejoue son scénario**. Pages, calques, vidéos, sons, diaporamas, sous-documents, animations, boutons et gestes sont interprétés par un petit moteur web, sans dépendance à l'exécution.

La skill a été éprouvée sur 26 magazines publiés entre 2012 et 2016 : plusieurs centaines de pages parcourues sans erreur JavaScript.

> Projet indépendant, sans lien avec Aquafadas ni Rakuten. Lire l'[avertissement](DISCLAIMER.md) avant tout usage.

## Ce qu'elle fait

- **Convertit** le fichier `magazine.xml` et les calques PDF en un fichier `data.json` et en images WebP, cadrées comme dans le fichier d'origine.
- **Rejoue** le magazine dans le navigateur :
  - rubriques et pages ;
  - animations de calques ;
  - sons minuteurs ;
  - vidéos ;
  - diaporamas ;
  - fenêtres ;
  - glisser-déposer ;
  - gestes de balayage ;
  - liens internes.
- **Vérifie** le résultat à quatre niveaux :
  - les données (images déformées, sauts vers des pages inexistantes) ;
  - un parcours de chaque page sous WebKit ;
  - une comparaison avec les aperçus d'origine contenus dans le fichier ;
  - le comportement.
- **S'intègre** dans un site par une iframe, avec une petite interface pour la piloter depuis la page parente.

## Contenu

| Élément | Rôle |
|---|---|
| `SKILL.md` | instructions lues par l'agent |
| `scripts/zave-vers-web.py` | le convertisseur |
| `lecteur/lecteur.js`, `lecteur/lecteur.css` | le moteur commun à tous les numéros |
| `scripts/controler-donnees.py` | contrôle des données, sans navigateur |
| `scripts/verifier-liens.py` | contrôle des liens : liens morts désactivés, fenêtre ou nouvel onglet |
| `scripts/verifier-parcours.mjs` | parcours de toutes les pages sous WebKit |
| `scripts/capturer-pages.mjs`, `scripts/comparer-apercus.py` | comparaison avec les aperçus d'origine |
| `references/` | le format décodé, le moteur, du symptôme à la cause et à la correction |

## Installation

```bash
git clone https://github.com/hubertquetel/zave-to-html ~/.claude/skills/zave-to-html
pip install Pillow PyMuPDF
npm install playwright && npx playwright install webkit   # pour les contrôles
```

Demandez ensuite à Claude Code, par exemple : *« Convertis ce fichier .zave en liseuse web »*.

## Utilisation manuelle

```bash
mkdir -p travail/x && unzip -qo MAGAZINE.zave -d travail/x
python3 -I scripts/zave-vers-web.py travail/x SORTIE/numero "Titre du numéro"
cp lecteur/lecteur.js lecteur/lecteur.css SORTIE/
python3 -I scripts/verifier-liens.py SORTIE/numero
python3 -I scripts/controler-donnees.py SORTIE/numero
python3 -m http.server --directory SORTIE 8000
```

Ouvrez `http://localhost:8000/numero/`. La liseuse charge `data.json` : elle doit être servie en HTTP et ne marche pas en `file://`.

## Limites connues

- Seule la première mise en page (paysage) est lue.
- Les transitions de page sont simplifiées.
- Le son démarre au premier clic, comme l'exigent les navigateurs.
- Les contenus hébergés en ligne, comme les vidéos distantes et les pages web intégrées, ont souvent disparu. Cherchez une copie dans les archives de production.
- Les fichiers chiffrés ou protégés par un DRM ne sont pas pris en charge.

## Licence

[PolyForm Noncommercial 1.0.0](LICENSE.md). Les usages suivants sont libres :
- usage personnel ;
- recherche, archivage et enseignement ;
- usage par les institutions patrimoniales, les organismes publics et les associations.

Tout **usage commercial** demande une licence distincte, par exemple un service de conversion payant ou une intégration dans un produit vendu. Écrire à contact@hubertquetel.fr.

Convertir un fichier ne donne aucun droit sur son contenu. Chaque utilisateur reste responsable des droits sur les textes, images, vidéos et musiques qu'il publie. Voir l'[avertissement](DISCLAIMER.md).

## Auteur

[Hubert Quétel](https://hubertquetel.fr), directeur artistique et concepteur de publications depuis 2001. Il a construit cet outil pour que les magazines de ses archives se lisent à nouveau.
