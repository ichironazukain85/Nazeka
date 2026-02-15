# etc/AGENTS.md — Build Tools Agent

This directory contains build and utility scripts for processing dictionary data. The `dictionary-data` agent is the primary owner, with coordination from `core-engine` for format compatibility.

## Scripts

### `process.py`
- Converts `JMdict.gz` XML to split JSON files (`JMdict1.json` ... `JMdict11.json`).
- Requires Python with `lxml` library.
- Output files go to `dict/` directory.
- If the number of output files changes, `manifest.json` must be updated.

### `process freqlist.py`
- Processes raw word frequency data into JSON format.
- Output files: `freqlist_narou.json`, `freqlist_novels.json`, `freqlist_vns.json`.
- Output goes to `dict/` directory.

### `update`
- Shell script for automating update tasks.

## Build Pipeline

```
JMdict.gz (XML source)
    → etc/process.py
    → dict/JMdict1.json ... dict/JMdict11.json

Raw frequency data
    → etc/process freqlist.py
    → dict/freqlist_*.json
```

## Guidelines

- Python scripts should remain compatible with Python 3.
- The `lxml` library is the only external dependency for XML processing.
- Output JSON format must match what `background-script.js` expects to parse — coordinate with `core-engine` agent for format changes.
- File splitting strategy (currently 11 chunks) is a memory management decision — adjust only if needed for performance.
