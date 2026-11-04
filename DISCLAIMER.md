# Avertissement · Disclaimer

[Français](#français) · [English](#english)

---

## Français

### 1. Projet indépendant

zave-to-html est un projet personnel et indépendant de Hubert Quétel, directeur artistique. Il n'est ni affilié à Aquafadas, Kobo, Rakuten, Rakuten DX ou à l'une de leurs sociétés, ni approuvé, soutenu ou vérifié par elles.

« Aquafadas », « AVE », « Digital Publishing System », ainsi que les noms de magazines, de marques et de sociétés cités dans ce dépôt, appartiennent à leurs titulaires respectifs. Ils ne sont mentionnés que pour décrire la compatibilité de l'outil ou situer un exemple technique.

### 2. Interopérabilité, sans code d'origine

Le format `.zave` a été compris en observant des fichiers dont l'auteur disposait légitimement : des magazines issus de ses propres archives de production, réalisés dans le cadre de son activité de directeur artistique. Ces fichiers sont des archives ZIP qui contiennent une description XML du magazine, des PDF, des images, des sons et des vidéos.

Ce dépôt :
- ne contient aucun code source, binaire, SDK, élément graphique ni document d'Aquafadas ou de Rakuten ;
- n'a pas été obtenu en décompilant ou en désassemblant un logiciel Aquafadas ;
- ne contient aucun magazine ni aucun contenu de client ;
- ne contourne aucune mesure technique de protection. Les fichiers chiffrés ou protégés par un DRM ne sont pas pris en charge, et l'outil ne doit pas servir à les ouvrir.

Le lecteur web est une réécriture originale, qui interprète les données du fichier.

L'objectif est de permettre la consultation de publications dont le logiciel de lecture a disparu. Cette démarche s'inscrit dans la logique de l'interopérabilité admise par le droit européen et français : directive 2009/24/CE, article L. 122-6-1 du Code de la propriété intellectuelle, et arrêt de la CJUE *SAS Institute* (C-406/10, 2 mai 2012), selon lequel ni les fonctionnalités d'un logiciel ni un format de fichiers ne sont protégés en tant que tels par le droit d'auteur. Ce rappel n'est pas une garantie de licéité dans chaque situation.

### 3. Les contenus restent à leurs titulaires

Convertir un fichier ne donne **aucun droit** sur son contenu : textes, photographies, illustrations, vidéos, musiques, polices, marques. Posséder un fichier `.zave` ne signifie pas détenir les droits de le diffuser.

Avant de publier une liseuse, l'utilisateur doit s'assurer qu'il détient, ou a obtenu, les droits nécessaires de l'éditeur, des auteurs, des photographes, des ayants droit musicaux et de toute personne représentée. Il en est seul responsable.

### 4. Aucune garantie

L'outil est fourni **« en l'état »**, sans garantie d'aucune sorte, expresse ou implicite, notamment :
- de fidélité du rendu ;
- de compatibilité avec un fichier donné ;
- d'absence d'erreur ;
- d'adéquation à un usage particulier.

Le rendu peut différer de l'application d'origine. Dans les limites permises par la loi, l'auteur ne pourra être tenu responsable d'aucun dommage direct ou indirect lié à l'utilisation de l'outil ou des liseuses produites, notamment une perte de données, une atteinte aux droits d'un tiers, une interruption de service ou un manque à gagner.

Il est recommandé de toujours travailler sur une copie des fichiers d'origine.

### 5. Licence et usage commercial

Le code est publié sous la licence **PolyForm Noncommercial 1.0.0** (voir `LICENSE.md`). Les usages personnels, de recherche, d'archivage, d'enseignement, ceux des organismes caritatifs, des institutions publiques et des patrimoines sont libres.

Tout usage commercial demande une licence distincte. C'est le cas, par exemple, d'un service de conversion payant ou d'une intégration dans un produit vendu. Contact : contact@hubertquetel.fr.

### 6. Dépendances et outils tiers

L'outil s'appuie sur des bibliothèques installées séparément par l'utilisateur, chacune sous sa propre licence :
- Pillow (licence HPND/MIT-CMU) ;
- PyMuPDF (AGPL-3.0, ou licence commerciale d'Artifex) ;
- Playwright (Apache-2.0).

Leurs conditions s'appliquent à leur usage, notamment pour une utilisation commerciale de PyMuPDF.

Le code a été écrit avec l'assistance d'un agent de programmation (Claude Code, d'Anthropic), sous la direction de l'auteur, qui en a fait les choix, l'a testé et le maintient.

### 7. Pas un conseil juridique

Ce texte informe sur la démarche du projet. Il ne constitue pas un avis juridique. En cas de doute, en particulier avant un usage commercial ou la diffusion de contenus de tiers, consultez un avocat.

Si vous êtes titulaire de droits et estimez qu'un élément de ce dépôt vous porte atteinte, écrivez à contact@hubertquetel.fr : la demande sera examinée rapidement.

---

## English

### 1. Independent project

zave-to-html is a personal, independent project by Hubert Quétel, art director. It is not affiliated with, endorsed, sponsored or reviewed by Aquafadas, Kobo, Rakuten, Rakuten DX or any of their companies.

"Aquafadas", "AVE", "Digital Publishing System", and the magazine, brand and company names mentioned in this repository belong to their respective owners. They are used only to describe compatibility or to locate a technical example.

### 2. Interoperability, no original code

The `.zave` format was understood by observing files the author lawfully held: magazines from his own production archives, made in the course of his work as an art director. These files are ZIP archives containing an XML description of the magazine, PDFs, images, sounds and videos.

This repository:
- contains no source code, binaries, SDK, artwork or documentation from Aquafadas or Rakuten;
- was not obtained by decompiling or disassembling any Aquafadas software;
- contains no magazine and no client content;
- does not circumvent any technical protection measure. Encrypted or DRM-protected files are not supported, and the tool must not be used to open them.

The web reader is an original rewrite that interprets the file's data.

The purpose is to keep publications readable after their reading software has disappeared. This follows the interoperability principles recognised by EU and French law: Directive 2009/24/EC, article L. 122-6-1 of the French Intellectual Property Code, and the CJEU *SAS Institute* ruling (C-406/10, 2 May 2012), which holds that neither the functionality of a program nor a data file format is protected by copyright as such. This is not a guarantee of lawfulness in every situation.

### 3. Content remains its owners'

Converting a file grants **no rights** to its content: texts, photographs, illustrations, videos, music, fonts, trademarks. Holding a `.zave` file does not mean you may publish it.

Before publishing a reader, users must make sure they hold, or have obtained, the necessary rights from the publisher, authors, photographers, music rights holders and any person depicted. They are solely responsible for doing so.

### 4. No warranty

The tool is provided **"as is"**, without warranty of any kind, express or implied, including:
- faithful rendering;
- compatibility with any given file;
- freedom from errors;
- fitness for a particular purpose.

Rendering may differ from the original app. To the extent permitted by law, the author shall not be liable for any direct or indirect damage arising from the use of the tool or of the readers it produces, including data loss, infringement of third-party rights, service interruption or loss of profit.

Always work on a copy of the original files.

### 5. License and commercial use

The code is released under the **PolyForm Noncommercial License 1.0.0** (see `LICENSE.md`). Personal use, research, archiving and education are free, as is use by charities, public institutions and heritage organisations.

Any commercial use requires a separate license. This includes, for example, a paid conversion service or integration into a product that is sold. Contact: contact@hubertquetel.fr.

### 6. Dependencies and third-party tools

The tool relies on libraries installed separately by the user, each under its own license:
- Pillow (HPND/MIT-CMU);
- PyMuPDF (AGPL-3.0, or a commercial license from Artifex);
- Playwright (Apache-2.0).

Their terms apply to their use, in particular for commercial use of PyMuPDF.

The code was written with the help of an AI coding agent (Claude Code, by Anthropic), under the direction of the author, who made the design choices, tested it and maintains it.

### 7. Not legal advice

This text describes the project's approach. It is not legal advice. If in doubt, especially before commercial use or before publishing third-party content, consult a lawyer.

If you are a rights holder and believe something in this repository infringes your rights, write to contact@hubertquetel.fr: the request will be reviewed promptly.
