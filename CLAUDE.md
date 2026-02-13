# CLAUDE.md — Nazeka Codebase Guide

## Project Overview

Nazeka is a Firefox WebExtension that serves as a Japanese mouseover dictionary (a "rikai replacement"). It provides hover-based Japanese word lookup with definitions, readings, deconjugation, kanji info, and flashcard mining (automated Anki card creation via AnkiConnect).

- **Author:** Wareya
- **License:** Apache License 2.0
- **Manifest version:** 2 (Firefox `strict_min_version: 57.0`)
- **Language breakdown:** ~91% JavaScript, ~6% HTML, ~3% Python

> The codebase has acknowledged technical debt: most logic lives in a small number of large files with no build tooling or module system.

## Repository Structure

```
Nazeka/
├── manifest.json              # WebExtension manifest (permissions, content scripts, resources)
├── background.html            # Background page (loads background-script.js)
├── background-script.js       # Core extension logic: dictionary loading, search, deconjugation, messaging
├── texthook.js                # Content script: text extraction, popup display, mouse/keyboard events
├── options.html / options.js  # Extension settings UI (~80+ configurable options)
├── reader.html / reader.js    # Clipboard-based reading mode (paste/auto-grab Japanese text)
├── mining.html / mining.js    # Mined flashcard viewer and TSV export
├── livemining.html / livemining.js  # AnkiConnect integration settings (deck, model, field mapping)
├── json_config.html / json_config.js # Custom JSON dictionary management UI
├── jmdictabbreviations.html / jmdictabbreviations.js # JMdict tag abbreviation reference
├── dict/                      # Dictionary data files
│   ├── JMdict1.json ... JMdict11.json  # JMdict split into chunks (gitignored, built from source)
│   ├── deconjugator.json      # Japanese deconjugation grammar rules
│   ├── kanjidata.json         # Individual kanji character data
│   ├── priority.json          # Word priority/ranking data
│   ├── freqlist_narou.json    # Frequency list (web novels)
│   ├── freqlist_novels.json   # Frequency list (novels)
│   ├── freqlist_vns.json      # Frequency list (visual novels)
│   └── jdic audio.txt         # Audio pronunciation lookup table
├── img/                       # Extension icons and UI images
│   ├── action{16,32,512}.png  # Browser action toolbar icons
│   ├── enabled{16,32,512}.png # Extension icons
│   ├── closebutton24.png      # Popup close button
│   ├── leftarrow24.png        # Navigation arrow
│   └── rightarrow24.png       # Navigation arrow
├── etc/                       # Build and utility scripts
│   ├── process.py             # Converts JMdict.gz XML to split JSON files
│   ├── process freqlist.py    # Processes word frequency data
│   └── update                 # Shell script for updates
├── readme.md                  # Project README
├── tutorial.md                # User tutorial and settings guide
├── extra features.md          # Documentation of non-obvious features
├── dictionary license.txt     # JMdict/EDRDG license info
└── deconjugator checklist.txt # Testing checklist for deconjugation rules
```

## Architecture

### Extension Components

Nazeka follows the standard WebExtension architecture:

1. **Background script** (`background-script.js`) — The "brain" of the extension. Runs persistently via `background.html`. Handles:
   - Loading and indexing JMdict dictionary data (split across 11 JSON files)
   - Word search with hiragana/katakana conversion fallbacks
   - Japanese deconjugation engine (verb/adjective base form detection)
   - Result ranking using frequency lists and priority heuristics
   - AnkiConnect communication for live mining
   - Audio playback
   - Message routing between content scripts and extension pages

2. **Content script** (`texthook.js`) — Injected into every web page. Handles:
   - Mouse-position text extraction using `caretPositionFromPoint()`
   - Bidirectional text expansion to sentence boundaries
   - DOM traversal that skips ruby annotations, hidden elements
   - Popup creation, positioning, and "dodge" logic to avoid overflow
   - Keyboard shortcuts (mining, kanji mode, sticky mode, audio, navigation)
   - Touch event support for Android
   - Flashcard mining UI and AnkiConnect submission

3. **Options page** (`options.js`) — Dynamically generates settings UI from a structured `settings` array. Categories include behavior, display, theme, reader, kanji mode, hotkeys, and import/export.

4. **Reader** (`reader.js`) — Clipboard monitoring mode that displays pasted Japanese text with auto-lookup capability.

5. **Mining pages** (`mining.js`, `livemining.js`) — Flashcard management: viewing mined cards, TSV export, and AnkiConnect field mapping configuration.

### Data Flow

```
User hovers over text on a web page
    → texthook.js extracts text at cursor position
    → Sends message to background-script.js
    → background-script.js searches JMdict + deconjugates
    → Returns ranked results to texthook.js
    → texthook.js builds and displays popup div
    → User presses 'M' to mine → sends to AnkiConnect / storage
```

### Communication

All inter-component communication uses `browser.runtime.sendMessage()` / `browser.runtime.onMessage`. Message types include:
- Dictionary search requests/responses
- Kanji character lookups
- Mining operations
- Audio playback triggers
- Clipboard operations
- Platform detection

## Building the Dictionary

The JMdict JSON files are **not checked into git** (they are gitignored). To build them:

1. Install Python with `lxml` library
2. Download `JMdict.gz` from http://www.edrdg.org/jmdict/edict_doc.html
3. Run `etc/process.py` to convert XML to split JSON
4. Move output files to `dict/` (e.g., `dict/JMdict1.json` through `dict/JMdict11.json`)
5. Verify all JSON files are listed in `manifest.json` under `web_accessible_resources`

If JMdict grows significantly, new split files may need to be added to the manifest.

## Loading for Development

There is no build step for the JavaScript — all source files are plain JS loaded directly by the browser.

1. Build the JMdict JSON files (see above), or copy them from an existing installation
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on" and select `manifest.json`
4. The extension will load with all current source files

Changes to JS/HTML files take effect after reloading the extension (or reloading the page for content script changes).

## Key Conventions and Patterns

### Code Style
- **No build tools, transpilers, or module bundlers.** All JavaScript is plain ES6+ loaded directly.
- **No framework.** DOM manipulation is done with vanilla `document.createElement`, `innerHTML`, etc.
- **Large monolithic files.** `background-script.js` and `texthook.js` each contain thousands of lines with most extension logic.
- **Settings pattern:** Options are defined as structured arrays of `{id, kind, default, label}` objects, dynamically rendered into form elements.
- **Global state:** Settings and data structures are stored in module-level variables, updated via timers or storage change listeners.

### Naming Conventions
- File names use lowercase with hyphens (e.g., `background-script.js`) or spaces (e.g., `jdic audio.txt`, `extra features.md`)
- Variable/function names use `snake_case` (e.g., `lookup_indirect`, `grab_text`, `build_div_compound`)
- Settings IDs use lowercase without separators (e.g., `lookuprate`, `contextlength`, `fixedwidthfont`)

### Japanese Text Handling
- Hiragana/katakana detection and conversion is done via Unicode codepoint ranges
- Text extraction respects ruby annotations (furigana), skipping `<rt>` elements
- Sentence boundaries are detected using Japanese punctuation (。？！)
- The deconjugation engine applies grammar rules iteratively with loop detection

### Important Gotchas
- Dictionary data is split across 11+ JSON files for memory management — all must be listed in `manifest.json`
- The extension uses `unlimitedStorage` permission for mined card data and custom dictionaries
- Settings sync between the options page and content scripts relies on `browser.storage.onChanged` listeners and periodic polling
- The content script creates a single reusable popup div rather than creating/destroying DOM elements repeatedly
- Results are sorted by multiple heuristics: word frequency, priority tags, part-of-speech, and obscurity scoring

### Testing
- `background-script.js` includes inline regression tests (`assert_id_location()`, `assert_spelling_location()`) that validate search accuracy
- The `deconjugator checklist.txt` file documents test cases for deconjugation rules
- There is no automated test runner; tests are assertion-based and run on extension load

## Platform Support

- **Primary target:** Firefox desktop (57+)
- **Experimental:** Firefox for Android (Nightly with custom flags)
- Android uses tap-based lookup instead of mouse hover/scrub

## Permissions

The extension requests these permissions (defined in `manifest.json`):
- `contextMenus` — Right-click menu items for options, reader, mining
- `storage` / `unlimitedStorage` — Persist settings, mined cards, custom dictionaries
- `tabs` — Open reader/mining pages in new tabs
- `clipboardRead` — Reader clipboard monitoring
- `<all_urls>` — Content script injection on all pages

## External Integrations

- **AnkiConnect** — HTTP API at `localhost:8765` for creating flashcards in Anki
- **JapanesePod101** — Audio downloads for word pronunciation
- **EDRDG/JMdict** — Primary dictionary data source
