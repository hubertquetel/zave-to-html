# zave-to-html

**Bring Aquafadas `.zave` magazines back to life in any web browser.**

[Français](README.fr.md) · English

Between 2011 and 2016, many publishers created interactive iPad magazines with Aquafadas Digital Publishing System, an InDesign plug-in. These magazines were exported as `.zave` files and read in dedicated apps. The apps have since disappeared, so the magazines can no longer be read anywhere.

zave-to-html is an agent skill for [Claude Code](https://claude.com/claude-code). It turns a `.zave` file into a self-contained HTML reader. This is not a video or a PDF of the magazine: the reader **replays its scenario**. Pages, layers, videos, sounds, slideshows, sub-documents, animations, buttons and gestures are all interpreted by a small web engine that has no runtime dependency.

The skill has been tested on 26 magazines published between 2012 and 2016: several hundred pages, browsed without a JavaScript error.

> Independent project, not affiliated with Aquafadas or Rakuten. Read the [disclaimer](DISCLAIMER.md) before any use.

## What it does

- **Converts** `magazine.xml` and the PDF layers into a `data.json` file and WebP images, fitted to the original frames.
- **Replays** the magazine in the browser:
  - articles and pages;
  - layer animations;
  - timed sounds;
  - videos;
  - slideshows;
  - pop-up windows;
  - drag and drop;
  - swipe gestures;
  - internal links.
- **Checks** the result at four levels:
  - data (distorted images, jumps to pages that do not exist);
  - a WebKit walk through every page;
  - side-by-side comparison with the previews stored in the file;
  - behaviour checks.
- **Embeds** the reader in a website through an iframe, with a small API to drive it from the parent page.

## Contents

| Item | Role |
|---|---|
| `SKILL.md` | instructions read by the agent (in French) |
| `scripts/zave-vers-web.py` | the converter |
| `lecteur/lecteur.js`, `lecteur/lecteur.css` | the reader engine shared by all issues |
| `scripts/controler-donnees.py` | data checks, no browser needed |
| `scripts/verifier-liens.py` | link checks: dead links disabled, framed or new-tab choice |
| `scripts/verifier-parcours.mjs` | WebKit walk through every page |
| `scripts/capturer-pages.mjs`, `scripts/comparer-apercus.py` | comparison with the original previews |
| `references/` | the decoded format, the engine, symptom → cause → fix |

The documentation is written in French; Claude reads it in any language.

## Install

```bash
git clone https://github.com/hubertquetel/zave-to-html ~/.claude/skills/zave-to-html
pip install Pillow PyMuPDF
npm install playwright && npx playwright install webkit   # for the checks
```

Then ask Claude Code something like: *"Convert this .zave file into a web reader"*.

## Manual use

```bash
mkdir -p work/x && unzip -qo MAGAZINE.zave -d work/x
python3 -I scripts/zave-vers-web.py work/x OUT/issue "Issue title"
cp lecteur/lecteur.js lecteur/lecteur.css OUT/
python3 -I scripts/verifier-liens.py OUT/issue
python3 -I scripts/controler-donnees.py OUT/issue
python3 -m http.server --directory OUT 8000
```

Open `http://localhost:8000/issue/`. The reader loads `data.json`, so it must be served over HTTP: it does not work from `file://`.

## Known limits

- Only the first layout (landscape) is read.
- Page transitions are simplified.
- Sound starts after the first click, as browsers require.
- Content that was hosted online, such as remote videos or web views, has often disappeared. Look for a copy in the production archives.
- Encrypted or DRM-protected files are not supported.

## License

[PolyForm Noncommercial 1.0.0](LICENSE.md). The following uses are free:
- personal use;
- research, archiving and education;
- use by heritage institutions, public bodies and charities.

**Commercial use** requires a separate license, for example a paid conversion service or integration into a product that is sold. Write to contact@hubertquetel.fr.

Converting a file gives no rights to its content. Users remain responsible for holding the rights to the texts, images, videos and music they publish. See the [disclaimer](DISCLAIMER.md).

## Author

[Hubert Quétel](https://hubertquetel.fr), art director and publication designer since 2001. He built this tool so that the magazines in his archives could be read again.
