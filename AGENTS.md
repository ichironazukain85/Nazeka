# AGENTS.md — Nazeka Agent Teams

This file defines specialized agent teams for developing the Nazeka Firefox WebExtension. Each agent has domain-specific knowledge and responsibilities aligned with the extension's architecture.

---

## Agent: core-engine

**Role:** Background Script & Dictionary Engine Specialist

**Owns:**
- `background-script.js`
- `background.html`

**Responsibilities:**
- Dictionary loading and indexing (JMdict split across 11 JSON files)
- Word search implementation with hiragana/katakana conversion fallbacks
- Japanese deconjugation engine (verb/adjective base form detection using `dict/deconjugator.json`)
- Result ranking using frequency lists (`freqlist_narou.json`, `freqlist_novels.json`, `freqlist_vns.json`) and priority heuristics (`dict/priority.json`)
- AnkiConnect HTTP communication (`localhost:8765`) for live mining
- Audio playback via JapanesePod101
- Message routing between content scripts and extension pages via `browser.runtime.onMessage`

**Guidelines:**
- This is the largest and most critical file in the codebase (thousands of lines). Changes require careful consideration of side effects.
- Search functions must handle both hiragana and katakana input, with appropriate conversion fallbacks.
- The deconjugation engine applies rules iteratively — ensure loop detection is preserved when modifying deconjugation logic.
- Inline regression tests (`assert_id_location()`, `assert_spelling_location()`) exist and must pass after any search-related changes.
- Result sorting uses multiple heuristics: word frequency, priority tags, part-of-speech, and obscurity scoring. Preserve this ordering logic.
- All message types must be handled: dictionary search, kanji lookup, mining operations, audio playback, clipboard operations, platform detection.

**Conventions:**
- Functions use `snake_case` naming (e.g., `lookup_indirect`, `build_div_compound`)
- No module system — everything is in global/function scope
- Settings are accessed from module-level variables synced via `browser.storage.onChanged`

---

## Agent: content-script

**Role:** Content Script & Popup UI Specialist

**Owns:**
- `texthook.js`

**Responsibilities:**
- Mouse-position text extraction using `caretPositionFromPoint()`
- Bidirectional text expansion to sentence boundaries (Japanese punctuation: `。？！`)
- DOM traversal that correctly skips ruby annotations (`<rt>` elements) and hidden elements
- Popup div creation, positioning, and "dodge" logic to avoid viewport overflow
- Keyboard shortcut handling (mining `M`, kanji mode, sticky mode, audio, navigation)
- Touch event support for Firefox Android
- Flashcard mining UI within the popup and AnkiConnect submission
- Communication with background script via `browser.runtime.sendMessage()`

**Guidelines:**
- The content script is injected into every web page — performance is critical. Avoid unnecessary DOM operations.
- A single reusable popup div is created and reused, not created/destroyed repeatedly. Preserve this pattern.
- Text extraction must handle edge cases: text across multiple DOM nodes, text within ruby annotations, hidden elements, and inline elements.
- Sentence boundary detection uses Japanese punctuation characters — ensure these are not broken when modifying text extraction.
- The popup must dodge screen edges and not overflow the viewport.
- Touch events (Android) follow a different code path from mouse events — test both when modifying input handling.

**Conventions:**
- Functions use `snake_case` naming (e.g., `grab_text`)
- Direct DOM manipulation with `document.createElement`, `innerHTML`
- Settings accessed via `browser.storage.local.get()` with periodic polling

---

## Agent: ui-pages

**Role:** Extension Pages & Settings UI Specialist

**Owns:**
- `options.html`, `options.js`
- `reader.html`, `reader.js`
- `mining.html`, `mining.js`
- `livemining.html`, `livemining.js`
- `json_config.html`, `json_config.js`
- `jmdictabbreviations.html`, `jmdictabbreviations.js`

**Responsibilities:**
- Options page: dynamically generating settings UI from structured `settings` array (~80+ configurable options)
- Reader page: clipboard monitoring mode for pasted Japanese text with auto-lookup
- Mining page: viewing mined flashcards, TSV export functionality
- Live mining page: AnkiConnect integration settings (deck selection, model mapping, field configuration)
- JSON config page: custom JSON dictionary management UI
- JMdict abbreviations page: reference display for JMdict tag abbreviations

**Guidelines:**
- Settings are defined as structured arrays of `{id, kind, default, label}` objects. New settings must follow this pattern exactly.
- Settings IDs use lowercase without separators (e.g., `lookuprate`, `contextlength`, `fixedwidthfont`).
- Settings categories: behavior, display, theme, reader, kanji mode, hotkeys, import/export.
- The options page dynamically generates form elements — adding a new setting means adding to the `settings` array, not manually creating HTML.
- Settings sync relies on `browser.storage.onChanged` listeners — ensure new settings propagate correctly to content scripts and background script.
- Mining data uses `unlimitedStorage` permission — handle large datasets gracefully.

**Conventions:**
- HTML files are standalone pages loaded via `browser.tabs.create()`
- No CSS framework — styles are inline or in `<style>` blocks within HTML files
- All pages communicate with background script via `browser.runtime.sendMessage()`

---

## Agent: dictionary-data

**Role:** Dictionary Data & Processing Specialist

**Owns:**
- `dict/` directory (all JSON data files)
- `etc/process.py`
- `etc/process freqlist.py`
- `dict/deconjugator.json`
- `dict/kanjidata.json`
- `dict/priority.json`
- `dict/freqlist_narou.json`, `dict/freqlist_novels.json`, `dict/freqlist_vns.json`
- `dict/jdic audio.txt`

See also: [`dict/AGENTS.md`](dict/AGENTS.md)

**Responsibilities:**
- JMdict XML-to-JSON conversion pipeline (`etc/process.py`)
- Dictionary data split strategy (currently 11 JSON chunks for memory management)
- Frequency list processing (`etc/process freqlist.py`)
- Deconjugation rule definitions and maintenance (`dict/deconjugator.json`)
- Kanji character data (`dict/kanjidata.json`)
- Priority/ranking data (`dict/priority.json`)
- Audio pronunciation lookup table (`dict/jdic audio.txt`)

**Guidelines:**
- JMdict JSON files are gitignored and built from source XML. Never commit generated JMdict*.json files.
- If JMdict grows and requires more split files, the new files must be added to `manifest.json` under `web_accessible_resources`.
- Python scripts require `lxml` library for XML parsing.
- The deconjugation rules in `deconjugator.json` are tested against `deconjugator checklist.txt` — verify after any rule changes.
- Frequency lists come from different corpora (web novels, novels, visual novels) and affect result ranking differently.

---

## Agent: extension-config

**Role:** Extension Manifest & Configuration Specialist

**Owns:**
- `manifest.json`
- `img/` directory (icons and UI images)

**Responsibilities:**
- WebExtension manifest configuration (manifest v2)
- Permission declarations (`contextMenus`, `storage`, `unlimitedStorage`, `tabs`, `clipboardRead`, `<all_urls>`)
- Content script injection rules
- `web_accessible_resources` management (all dict/*.json files must be listed)
- Browser action and extension icon definitions
- Background page declaration
- Firefox version compatibility (`strict_min_version: 57.0`)

**Guidelines:**
- All dictionary JSON files in `dict/` must be listed in `web_accessible_resources` — missing entries will cause silent load failures.
- Adding new extension pages requires updating the manifest with appropriate permissions.
- The extension targets Firefox with manifest v2 — do not use manifest v3 features.
- Icon files follow the naming pattern: `action{16,32,512}.png`, `enabled{16,32,512}.png`.
- Any new HTML pages need to be registered appropriately in the manifest.

---

## Cross-Agent Coordination

### Message Protocol
All agents that modify message handling must coordinate. The message flow is:
```
texthook.js (content-script) ↔ background-script.js (core-engine) ↔ extension pages (ui-pages)
```
Adding or modifying message types requires changes in both sender and receiver.

### Settings Changes
Adding new settings affects multiple agents:
1. **ui-pages**: Add to `settings` array in `options.js`
2. **core-engine** or **content-script**: Read and use the new setting
3. **extension-config**: No manifest change needed (settings use `browser.storage`)

### Dictionary Data Changes
Changes to dictionary format or splitting affect:
1. **dictionary-data**: Modify `etc/process.py` output
2. **core-engine**: Update loading/parsing logic in `background-script.js`
3. **extension-config**: Update `web_accessible_resources` in `manifest.json`
