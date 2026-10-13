# Verification — 13 October 2026

Verified local release: **3.1.3**.

- **42 automated tests passed**, with the original-save and actual-game-source checks enabled.
- **47 browser checks completed** across all eleven editor sections.
- **35 browser-generated exports** matched the editor's JSON exactly when decoded by both the editor codec and the game's actual `RUN_SAVE_CODE` decoder.
- Desktop and 390px mobile layouts checked; no horizontal page overflow or unexpected console errors in the final browser checks.
- All 81 item pictures loaded successfully.

## Checked flows

Import code/JSON/files; resource changes; equipment ownership/comparison; presets and guided choices; bee levels/gifted status/mutations; multi-select; 37-slot partial rows; expansion to 50 slots; filling/copying/swapping bees; amulets/passives; beequip assignment/removal/compatibility; drives; balloon; nectar and buff removal; quest completion/removal; signed NPC seeds; item search/pictures/categories/shortcuts; named-build save/download/import/load/delete; comparison files; raw JSON; invalid input correction; undo/redo/reset; clipboard and file export; draft recovery including unfinished JSON; mode switching; theme; keyboard tab navigation.

Copy/swap controls were exercised in the browser, including on mobile. Drag/drop uses the same tested swap helper; a native mouse drag gesture was not automated.

## Fixes found during verification

- Bee edits return incompatible beequips to inventory, preserving the owned item and its bonuses.
- Guided Headstart keeps starter equipment; Everything can unlock all equipment while keeping the current loadout.
- Invalid raw JSON keeps Advanced mode available so it can be corrected.
- Unfinished preset or multi-select drafts do not block unrelated actions.
- Unknown imported bonus tokens are retained when editing supported amulet or beequip values.
- Numeric multiplier controls use the same minimum as the save helpers.

Negative NPC seeds and fractional bee bond values are accepted and preserved. The previous export failure caused by hidden NPC seed fields was checked again.

## Repeat automated checks

Run `node --test *.test.cjs`. Set `BSS_GAME_SOURCE` to an official downloaded `index.js` and `BSS_ORIGINAL_SAVE` to an original code file to include compatibility checks. No game source or user save is included in this repository.

Verification is for the packaged local files. Upload the complete release to GitHub Pages to apply it to the live site.
