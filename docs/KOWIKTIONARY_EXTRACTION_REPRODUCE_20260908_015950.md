# Reproduction of the Korean Wiktionary extraction correction

Run from the repository root. Use Python 3.12 (the tested interpreter was 3.12.14). No global locale changes are needed: the checked-in runner applies `LC_ALL=C`, `PYTHONCOERCECLOCALE=0`, and `PYTHONUTF8=1` only to its child process. The C locale avoids byte-oriented Lua patterns damaging Korean UTF-8 text on this macOS environment.

## Fixed inputs and engine versions

- Official XML: `https://dumps.wikimedia.org/kowiktionary/20260901/kowiktionary-20260901-pages-articles.xml.bz2`, 47,392,283 bytes, SHA1 `fe177872b49d21928e0d205f7d644a4d060bfbb4`.
- wiktextract: `https://github.com/tatuylonen/wiktextract`, commit `ccec6f120efedd84f57fe0f1631e89408e9cb62a`.
- wikitextprocessor: `https://github.com/tatuylonen/wikitextprocessor`, commit `4deed5191c9e4cb61ee1a4c822e3f6686ae8541b`.
- Its `src/wikitextprocessor/lua/mediawiki-extensions-Scribunto` submodule: commit `d35ca1f8d5fd23f1a9915e497cc00cac238f28c4`.
- Python dependencies: `scripts/kowiktionary-runtime_20260908_012503.txt`.
- Engine modification: `scripts/kowiktionary-extractor-fixes_20260908_012503.patch`, applied to wiktextract using `patch -p1`. The processor and Scribunto remain unchanged.

The already installed engine is `.local/sources/kowiktionary-corrected_20260908_012503/engine`; the processor is the sibling `processor`. The installed Python is `.local/sources/kowiktionary-original_20260907_234800/reextract-venv/bin/python`.

For a fresh setup, create a new directory and clone the repositories at the commits above, initialize the pinned Scribunto submodule, create a Python 3.12 venv, and run:

```sh
<venv>/bin/python -m pip install -r scripts/kowiktionary-runtime_20260908_012503.txt
<venv>/bin/python -m pip install --no-deps <processor-checkout> <engine-checkout>
patch -p1 -i <absolute-repo>/scripts/kowiktionary-extractor-fixes_20260908_012503.patch -d <engine-checkout>
```

The patch was tested by applying a dry run to a fresh pristine pinned source extraction. The active runtime was installed from the pinned source archives with the versions above; a separate fresh network clone installation was not repeated.

## Extract and build

```sh
<venv>/bin/python scripts/run-kowiktionary-extraction_20260908_012503.py \
  --engine <patched-engine-checkout> --processor <processor-checkout> \
  --dump <official-XML-bz2> --db <new-or-same-dump-SQLite-db> \
  --out <new-English-jsonl> --errors <new-errors-json> --processes 4
node scripts/build-native-english-ko_20260908_012503.mjs \
  <new-English-jsonl> <new-public-directory> <new-local-quality-held-json>
```

The runner selects only English (`--language-code en`) from the Korean edition and captures all metadata. An existing SQLite database is reusable only for this exact XML. Existing raw output paths are rejected; use a new name. A fresh database rebuilds the complete source cache. Keep full JSONL and extraction diagnostics locally; the public builder intentionally selects Korean-language definitions and service metadata.

```sh
LC_ALL=C PYTHONCOERCECLOCALE=0 PYTHONUTF8=1 \
PYTHONPATH=<patched-engine-checkout>/src:<processor-checkout>/src \
<venv>/bin/python scripts/test-kowiktionary-source-boundaries_20260908_012503.py
node --test test/native-english-ko_20260907_205330.test.mjs test/native-english-ko_20260908_012503.test.mjs
```

## Correction boundaries

Corrections handle source language/list boundaries, headingless meanings coexisting with POS sections, observed alternate definition headings, obsolete ordinal lists, legacy link/example/citation parameters, the local Lua UTF-8 runtime issue, and explicit plural/inflection relationships whose source Lua is broken. No per-headword substitutions are used.

The XML's form-of module contains calls such as `table_module.deepcopy(...)` even though `table_module` is a string module name. For plural/inflection source templates the extractor retains the explicit lemma and grammatical codes in an English raw gloss and structured `form_of`; it does not invent Korean translations. The product builder excludes those English-only senses. Source labels with failed expansion retain their explicit label text via fallback. A residual logged label expansion error is therefore distinct from a missing output definition.

This corrects observed extraction defects; it does not assert that Wiktionary has complete coverage or that every source definition is editorially correct. The old public dataset, manual tree correction file, source downloads and all prior experiments are preserved.
